import {
  type CacheStore,
  buildRateCacheKey,
  buildSeriesCacheKey,
  cacheAgeSeconds,
} from "@openrates/cache";
import {
  Decimal,
  type DecimalValue,
  type FeeInput,
  type FreshnessResult,
  buildNormalizedRate,
  calculateConfidence,
  classifyFreshness,
  convertMoney,
} from "@openrates/core";
import { getCurrency, getMinorUnits, resolveCurrency } from "@openrates/currency-metadata";
import type {
  ExchangeRateProvider,
  ProviderCapabilities,
  ProviderRate,
  ProviderTimeSeries,
  ProviderTimeSeriesPoint,
} from "@openrates/provider-interface";
import {
  type DatePolicy,
  type NormalizedRate,
  OpenRatesError,
  type RateMode,
  type UseCase,
  amountStringSchema,
  isoDateSchema,
} from "@openrates/schemas";
import { ProviderHealthTracker } from "./health";
import type { ProviderRegistry, RegistryEntry } from "./registry";
import type {
  CacheInfo,
  CompareQuery,
  CompareResult,
  ConversionResult,
  ConvertQuery,
  ProviderFailure,
  ProviderQuote,
  RateQuery,
  RateResult,
  SeriesPoint,
  SeriesQuery,
  SeriesResult,
} from "./types";

export interface EngineConfig {
  liveThresholdSeconds: number;
  recentThresholdSeconds: number;
  rateTtlSeconds: number;
  historicalTtlSeconds: number;
  seriesTtlSeconds: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  liveThresholdSeconds: 300,
  recentThresholdSeconds: 3600,
  rateTtlSeconds: 900,
  historicalTtlSeconds: 604_800,
  seriesTtlSeconds: 86_400,
};

export interface RateEngineOptions {
  registry: ProviderRegistry;
  cache: CacheStore;
  config?: Partial<EngineConfig>;
  health?: ProviderHealthTracker;
  clock?: () => number;
}

function freshnessMatch(useCase: UseCase | undefined, freshness: FreshnessResult): number {
  if (freshness.isStale) {
    return 0.3;
  }
  if (freshness.isLive) {
    return 1;
  }
  switch (useCase) {
    case "accounting":
    case "reporting":
    case "invoice":
      return 1;
    case "treasury":
    case "trading_reference":
      return 0.6;
    case "travel":
    case "ecommerce":
      return 0.85;
    default:
      return 0.9;
  }
}

function pickFees(query: ConvertQuery): FeeInput | undefined {
  const fees: FeeInput = {};
  if (query.fixedFee !== undefined) {
    fees.fixedFee = query.fixedFee;
  }
  if (query.percentageFee !== undefined) {
    fees.percentageFee = query.percentageFee;
  }
  if (query.spreadPercentage !== undefined) {
    fees.spreadPercentage = query.spreadPercentage;
  }
  return Object.keys(fees).length > 0 ? fees : undefined;
}

function eachDate(start: string, end: string): string[] {
  const result: string[] = [];
  let ms = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  while (ms <= endMs) {
    result.push(new Date(ms).toISOString().slice(0, 10));
    ms += 86_400_000;
  }
  return result;
}

function applyFill(
  points: ProviderTimeSeriesPoint[],
  start: string,
  end: string,
  policy: "none" | "previous",
): SeriesPoint[] {
  if (policy === "none") {
    return points.map((point) => ({ date: point.date, rate: point.rate, filled: false }));
  }
  const byDate = new Map(points.map((point) => [point.date, point.rate]));
  const output: SeriesPoint[] = [];
  let last: string | undefined;
  for (const date of eachDate(start, end)) {
    const actual = byDate.get(date);
    if (actual !== undefined) {
      last = actual;
      output.push({ date, rate: actual, filled: false });
    } else if (last !== undefined) {
      output.push({ date, rate: last, filled: true });
    }
  }
  return output;
}

function medianRate(rates: string[]): DecimalValue {
  const sorted = rates.map((rate) => new Decimal(rate)).sort((a, b) => a.comparedTo(b));
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? new Decimal(0);
  }
  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  if (lower === undefined || upper === undefined) {
    return new Decimal(0);
  }
  return lower.plus(upper).div(2);
}

export class RateEngine {
  readonly registry: ProviderRegistry;
  readonly health: ProviderHealthTracker;
  private readonly cache: CacheStore;
  private readonly config: EngineConfig;
  private readonly clock: () => number;

  constructor(options: RateEngineOptions) {
    this.registry = options.registry;
    this.cache = options.cache;
    this.health = options.health ?? new ProviderHealthTracker();
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...options.config };
    this.clock = options.clock ?? Date.now;
  }

  async getRate(query: RateQuery): Promise<RateResult> {
    const base = this.resolveCurrencyCode(query.base);
    const quote = this.resolveCurrencyCode(query.quote);
    const nowIso = query.now ?? new Date(this.clock()).toISOString();
    const nowMs = Date.parse(nowIso);

    if (base === quote) {
      return this.identityResult(base, nowIso);
    }

    const dateKey = query.date ?? "latest";
    const isHistorical = dateKey !== "latest";
    if (isHistorical && !isoDateSchema.safeParse(dateKey).success) {
      throw new OpenRatesError({
        code: "INVALID_DATE",
        message: `Invalid date "${dateKey}". Use YYYY-MM-DD or "latest".`,
        details: { date: dateKey },
      });
    }

    let mode = this.resolveMode(query);
    let candidates = await this.selectCandidates(mode, isHistorical, query.provider);
    if (
      candidates.length === 0 &&
      (query.mode === undefined || query.mode === "auto") &&
      mode === "market"
    ) {
      mode = "official";
      candidates = await this.selectCandidates(mode, isHistorical, query.provider);
    }
    if (candidates.length === 0) {
      throw new OpenRatesError({
        code: "PROVIDER_NOT_CONFIGURED",
        message:
          mode === "market"
            ? "No market-data provider is configured. Use official mode or configure a market provider."
            : "No provider is configured for this request.",
        suggestion:
          mode === "market" ? "Set mode to 'official' or configure a market provider." : undefined,
        details: { mode },
      });
    }

    const allowFallback = query.allowFallback ?? true;
    const datePolicy: DatePolicy = query.datePolicy ?? "previous_available";
    const attempted: string[] = [];
    let lastError: OpenRatesError | undefined;

    for (let index = 0; index < candidates.length; index += 1) {
      const entry = candidates[index];
      if (!entry) {
        continue;
      }
      const provider = entry.provider;
      attempted.push(provider.id);
      const cacheKey = buildRateCacheKey({
        providerId: provider.id,
        base,
        quote,
        date: dateKey,
        mode,
      });

      let providerRate: ProviderRate;
      let cacheInfo: CacheInfo;

      const cached = await this.cache.get<ProviderRate>(cacheKey);
      if (cached) {
        providerRate = cached.value;
        cacheInfo = {
          hit: true,
          storedAt: cached.storedAt,
          ageSeconds: cacheAgeSeconds(cached, nowMs),
        };
      } else {
        try {
          providerRate = isHistorical
            ? await provider.getHistoricalRate({ base, quote, date: dateKey, datePolicy })
            : await provider.getLatestRate({ base, quote });
        } catch (error) {
          this.health.recordFailure(provider.id);
          lastError = provider.normalizeError(error);
          if (!allowFallback) {
            throw lastError;
          }
          continue;
        }
        this.health.recordSuccess(provider.id);
        const ttl = isHistorical ? this.config.historicalTtlSeconds : this.config.rateTtlSeconds;
        await this.cache.set(cacheKey, providerRate, ttl);
        cacheInfo = { hit: false };
      }

      if (isHistorical && datePolicy === "strict" && providerRate.effectiveDate !== dateKey) {
        lastError = new OpenRatesError({
          code: "STRICT_DATE_NOT_AVAILABLE",
          message: `No rate was published for ${base}/${quote} on ${dateKey}.`,
          details: { requestedDate: dateKey, effectiveDate: providerRate.effectiveDate },
          suggestion: "Retry with datePolicy 'previous_available' to use the prior rate.",
        });
        if (!allowFallback) {
          throw lastError;
        }
        continue;
      }

      const capabilities = await this.registry.capabilities(provider.id);
      const rate = this.normalize({
        providerRate,
        entry,
        capabilities,
        mode,
        useCase: query.useCase,
        isHistorical,
        dateKey,
        nowIso,
        maxAgeSeconds: query.maxAgeSeconds,
      });

      if (rate.isStale) {
        lastError = new OpenRatesError({
          code: "RATE_TOO_STALE",
          message: `The ${base}/${quote} rate from ${provider.id} exceeds the allowed maximum age.`,
          details: { provider: provider.id, maxAgeSeconds: query.maxAgeSeconds },
        });
        if (!allowFallback) {
          throw lastError;
        }
        continue;
      }

      const fallbackUsed = index > 0;
      if (fallbackUsed) {
        rate.warnings.push(`Primary provider failed; used fallback provider "${provider.id}".`);
      }
      return {
        rate,
        route: { selectedProvider: provider.id, mode, fallbackUsed, attempted: [...attempted] },
        cache: cacheInfo,
      };
    }

    throw (
      lastError ??
      new OpenRatesError({
        code: "RATE_NOT_AVAILABLE",
        message: `No rate is available for ${base}/${quote}.`,
        details: { base, quote },
      })
    );
  }

  async convert(query: ConvertQuery): Promise<ConversionResult> {
    if (!amountStringSchema.safeParse(query.amount).success) {
      throw new OpenRatesError({
        code: "INVALID_AMOUNT",
        message: `Invalid amount "${query.amount}". Use a non-negative decimal string.`,
        details: { amount: query.amount },
      });
    }
    const rateResult = await this.getRate(query);
    const minorUnits = getMinorUnits(rateResult.rate.quoteCurrency) ?? null;
    const conversion = convertMoney({
      amount: query.amount,
      rate: rateResult.rate,
      toMinorUnits: minorUnits,
      fees: pickFees(query),
    });
    return { conversion, route: rateResult.route, cache: rateResult.cache };
  }

  async getSeries(query: SeriesQuery): Promise<SeriesResult> {
    const base = this.resolveCurrencyCode(query.base);
    const quote = this.resolveCurrencyCode(query.quote);
    for (const date of [query.startDate, query.endDate]) {
      if (!isoDateSchema.safeParse(date).success) {
        throw new OpenRatesError({
          code: "INVALID_DATE",
          message: `Invalid date "${date}". Use YYYY-MM-DD.`,
          details: { date },
        });
      }
    }
    if (query.endDate < query.startDate) {
      throw new OpenRatesError({
        code: "UNSUPPORTED_DATE_RANGE",
        message: "endDate must be on or after startDate.",
        details: { startDate: query.startDate, endDate: query.endDate },
      });
    }

    const mode = this.resolveMode(query);
    const candidates = await this.selectCandidates(mode, true, query.provider);
    let selected: RegistryEntry | undefined;
    for (const entry of candidates) {
      const capabilities = await this.registry.capabilities(entry.provider.id);
      if (capabilities?.supportsTimeSeries) {
        selected = entry;
        break;
      }
    }
    if (!selected) {
      throw new OpenRatesError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "No configured provider supports time series for this request.",
        details: { mode },
      });
    }

    const provider = selected.provider;
    const nowIso = query.now ?? new Date(this.clock()).toISOString();
    const nowMs = Date.parse(nowIso);
    const cacheKey = buildSeriesCacheKey({
      providerId: provider.id,
      base,
      quote,
      startDate: query.startDate,
      endDate: query.endDate,
      mode,
    });

    let series: ProviderTimeSeries;
    let cacheInfo: CacheInfo;
    const cached = await this.cache.get<ProviderTimeSeries>(cacheKey);
    if (cached) {
      series = cached.value;
      cacheInfo = {
        hit: true,
        storedAt: cached.storedAt,
        ageSeconds: cacheAgeSeconds(cached, nowMs),
      };
    } else {
      try {
        series = await provider.getTimeSeries({
          base,
          quote,
          startDate: query.startDate,
          endDate: query.endDate,
        });
      } catch (error) {
        this.health.recordFailure(provider.id);
        throw provider.normalizeError(error);
      }
      this.health.recordSuccess(provider.id);
      await this.cache.set(cacheKey, series, this.config.seriesTtlSeconds);
      cacheInfo = { hit: false };
    }

    return {
      baseCurrency: base,
      quoteCurrency: quote,
      startDate: query.startDate,
      endDate: query.endDate,
      mode,
      provider: provider.id,
      rateType: series.rateType,
      points: applyFill(series.points, query.startDate, query.endDate, query.fillPolicy ?? "none"),
      cache: cacheInfo,
    };
  }

  async compareProviders(query: CompareQuery, disagreementPercent = 1): Promise<CompareResult> {
    const base = this.resolveCurrencyCode(query.base);
    const quote = this.resolveCurrencyCode(query.quote);
    const mode = this.resolveMode(query);
    const isHistorical = query.date !== undefined && query.date !== "latest";

    let candidates = await this.selectCandidates(mode, isHistorical, undefined);
    if (query.providers !== undefined && query.providers.length > 0) {
      const allowed = new Set(query.providers);
      candidates = candidates.filter((entry) => allowed.has(entry.provider.id));
    }
    if (query.maxProviders !== undefined) {
      candidates = candidates.slice(0, query.maxProviders);
    }

    const settled = await Promise.allSettled(
      candidates.map((entry) =>
        this.getRate({
          base,
          quote,
          date: query.date,
          mode,
          provider: entry.provider.id,
          allowFallback: false,
          now: query.now,
        }),
      ),
    );

    const results: ProviderQuote[] = [];
    const failures: ProviderFailure[] = [];
    candidates.forEach((entry, index) => {
      const outcome = settled[index];
      if (outcome === undefined) {
        return;
      }
      if (outcome.status === "fulfilled") {
        const rate = outcome.value.rate;
        results.push({
          provider: rate.providerId,
          rate: rate.rate,
          rateType: rate.rateType,
          effectiveDate: rate.effectiveDate,
          freshnessClass: rate.freshnessClass,
        });
      } else {
        const error: unknown = outcome.reason;
        failures.push({
          provider: entry.provider.id,
          code: error instanceof OpenRatesError ? error.code : "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error.",
        });
      }
    });

    const date = query.date ?? "latest";
    if (results.length === 0) {
      return { base, quote, date, results, failures, disagreement: false };
    }

    const median = medianRate(results.map((item) => item.rate));
    let maxDifference = new Decimal(0);
    for (const item of results) {
      const difference = new Decimal(item.rate).minus(median).abs().div(median).mul(100);
      item.differencePercent = difference.toDecimalPlaces(4).toString();
      if (difference.greaterThan(maxDifference)) {
        maxDifference = difference;
      }
    }

    return {
      base,
      quote,
      date,
      results,
      failures,
      median: median.toString(),
      maxDifferencePercent: maxDifference.toDecimalPlaces(4).toString(),
      disagreement: maxDifference.greaterThan(disagreementPercent),
    };
  }

  private resolveMode(query: { mode?: RateMode; useCase?: UseCase }): RateMode {
    if (query.mode !== undefined && query.mode !== "auto") {
      return query.mode;
    }
    if (query.useCase === "treasury" || query.useCase === "trading_reference") {
      return "market";
    }
    return "official";
  }

  private resolveCurrencyCode(input: string): string {
    const direct = getCurrency(input);
    if (direct) {
      return direct.code;
    }
    const resolution = resolveCurrency(input);
    if (resolution.resolved) {
      return resolution.resolved.code;
    }
    if (resolution.ambiguous) {
      throw new OpenRatesError({
        code: "AMBIGUOUS_CURRENCY",
        message: `The currency "${input}" is ambiguous.`,
        details: { candidates: resolution.candidates.map((currency) => currency.code) },
        suggestion: "Specify the ISO 4217 currency code, for example USD or EUR.",
      });
    }
    throw new OpenRatesError({
      code: "UNSUPPORTED_CURRENCY",
      message: `The currency "${input}" is not supported.`,
      details: { input },
    });
  }

  private async selectCandidates(
    mode: RateMode,
    needsHistorical: boolean,
    explicitProvider: string | undefined,
  ): Promise<RegistryEntry[]> {
    if (explicitProvider !== undefined) {
      const entry = this.registry.get(explicitProvider);
      if (!entry) {
        throw new OpenRatesError({
          code: "PROVIDER_NOT_CONFIGURED",
          message: `Provider "${explicitProvider}" is not configured.`,
          details: { provider: explicitProvider },
        });
      }
      const capabilities = await this.registry.capabilities(explicitProvider);
      if (capabilities && !capabilities.supportedModes.includes(mode)) {
        throw new OpenRatesError({
          code: "UNSUPPORTED_MODE",
          message: `Provider "${explicitProvider}" does not support ${mode} mode.`,
          details: { provider: explicitProvider, mode },
        });
      }
      return [entry];
    }

    const candidates: RegistryEntry[] = [];
    for (const entry of this.registry.ordered()) {
      const capabilities = await this.registry.capabilities(entry.provider.id);
      if (!capabilities || !capabilities.supportedModes.includes(mode)) {
        continue;
      }
      if (needsHistorical && !capabilities.supportsHistorical) {
        continue;
      }
      candidates.push(entry);
    }
    return candidates;
  }

  private identityResult(code: string, nowIso: string): RateResult {
    const today = nowIso.slice(0, 10);
    const freshness: FreshnessResult = {
      freshnessClass: "latest_available",
      isLive: false,
      isStale: false,
    };
    const confidence = calculateConfidence({
      providerTrust: 1,
      hasSourceTimestamp: false,
      freshnessMatch: 1,
      isDirectPair: true,
      providerHealth: 1,
    });
    const rate = buildNormalizedRate({
      baseCurrency: code,
      quoteCurrency: code,
      rate: "1",
      rateType: "official_reference",
      mode: "official",
      effectiveDate: today,
      retrievedAt: nowIso,
      providerId: "identity",
      providerName: "Identity",
      calculationMethod: "direct",
      freshness,
      confidence,
    });
    return {
      rate,
      route: {
        selectedProvider: "identity",
        mode: "official",
        fallbackUsed: false,
        attempted: ["identity"],
      },
      cache: { hit: false },
    };
  }

  private normalize(context: {
    providerRate: ProviderRate;
    entry: RegistryEntry;
    capabilities: ProviderCapabilities | undefined;
    mode: RateMode;
    useCase: UseCase | undefined;
    isHistorical: boolean;
    dateKey: string;
    nowIso: string;
    maxAgeSeconds: number | undefined;
  }): NormalizedRate {
    const { providerRate, entry, capabilities, mode, useCase, isHistorical, dateKey, nowIso } =
      context;
    const freshness = classifyFreshness({
      mode,
      rateType: providerRate.rateType,
      isHistoricalRequest: isHistorical,
      requestedDate: isHistorical ? dateKey : undefined,
      effectiveDate: providerRate.effectiveDate,
      observedAt: providerRate.observedAt,
      publishedAt: providerRate.publishedAt,
      retrievedAt: nowIso,
      now: nowIso,
      providerSupportsIntraday: capabilities?.supportsIntraday ?? false,
      providerSupportsTimestamp: capabilities?.supportsProviderTimestamp ?? false,
      liveThresholdSeconds: this.config.liveThresholdSeconds,
      recentThresholdSeconds: this.config.recentThresholdSeconds,
      maxAgeSeconds: context.maxAgeSeconds,
      expectedUpdateIntervalSeconds: capabilities?.estimatedUpdateFrequencySeconds,
    });
    const hasTimestamp =
      providerRate.observedAt !== undefined || providerRate.publishedAt !== undefined;
    const confidence = calculateConfidence({
      providerTrust: entry.trust,
      hasSourceTimestamp: hasTimestamp,
      freshnessMatch: freshnessMatch(useCase, freshness),
      isDirectPair: providerRate.calculationMethod === "direct",
      providerHealth: this.health.score(providerRate.providerId),
      isStale: freshness.isStale,
    });
    return buildNormalizedRate({
      baseCurrency: providerRate.baseCurrency,
      quoteCurrency: providerRate.quoteCurrency,
      rate: providerRate.rate,
      rateType: providerRate.rateType,
      mode,
      effectiveDate: providerRate.effectiveDate,
      observedAt: providerRate.observedAt,
      publishedAt: providerRate.publishedAt,
      retrievedAt: nowIso,
      providerId: providerRate.providerId,
      providerName: entry.provider.name,
      originalSourceIds: providerRate.sourceIds,
      calculationMethod: providerRate.calculationMethod,
      crossCurrency: providerRate.crossCurrency,
      freshness,
      confidence,
    });
  }
}

export function createRateEngine(options: RateEngineOptions): RateEngine {
  return new RateEngine(options);
}

export type { ExchangeRateProvider };
