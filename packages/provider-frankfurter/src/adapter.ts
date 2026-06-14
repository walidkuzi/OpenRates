import type {
  ExchangeRateProvider,
  FetchLike,
  HistoricalRateInput,
  LatestRateInput,
  ProviderCapabilities,
  ProviderCurrency,
  ProviderHealth,
  ProviderRate,
  ProviderTimeSeries,
  ProviderTimeSeriesPoint,
  TimeSeriesInput,
} from "@openrates/provider-interface";
import { OpenRatesError } from "@openrates/schemas";
import { FrankfurterClient, type LatestResponse, rateToString } from "./client";
import { normalizeFrankfurterError } from "./errors";

export const FRANKFURTER_ID = "frankfurter";
export const FRANKFURTER_NAME = "Frankfurter";
export const FRANKFURTER_DEFAULT_BASE_URL = "https://api.frankfurter.dev";

export interface FrankfurterProviderOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetch?: FetchLike;
  now?: () => number;
}

export class FrankfurterProvider implements ExchangeRateProvider {
  readonly id = FRANKFURTER_ID;
  readonly name = FRANKFURTER_NAME;

  private readonly client: FrankfurterClient;
  private readonly now: () => number;

  constructor(options: FrankfurterProviderOptions = {}) {
    const clientOptions = {
      baseUrl: options.baseUrl ?? FRANKFURTER_DEFAULT_BASE_URL,
      timeoutMs: options.timeoutMs ?? 5000,
      retries: options.retries ?? 2,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    };
    this.client = new FrankfurterClient(clientOptions);
    this.now = options.now ?? Date.now;
  }

  capabilities(): Promise<ProviderCapabilities> {
    return Promise.resolve({
      supportedModes: ["official"],
      supportedRateTypes: ["official_reference"],
      supportsHistorical: true,
      supportsTimeSeries: true,
      supportsIntraday: false,
      supportsProviderTimestamp: false,
      requiresApiKey: false,
      estimatedUpdateFrequencySeconds: 86_400,
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startedAt = this.now();
    const checkedAt = new Date(startedAt).toISOString();
    try {
      await this.client.getCurrencies();
      const latencyMs = this.now() - startedAt;
      return {
        status: "healthy",
        checkedAt,
        latencyMs,
        lastSuccessfulRequestAt: checkedAt,
      };
    } catch (error) {
      const normalized = normalizeFrankfurterError(error);
      return {
        status: "unavailable",
        checkedAt,
        message: normalized.message,
      };
    }
  }

  async getLatestRate(input: LatestRateInput): Promise<ProviderRate> {
    try {
      const data = await this.client.getLatest(input.base, input.quote, input.signal);
      return this.toProviderRate(input.base, input.quote, data);
    } catch (error) {
      throw normalizeFrankfurterError(error);
    }
  }

  async getHistoricalRate(input: HistoricalRateInput): Promise<ProviderRate> {
    try {
      const data = await this.client.getHistorical(
        input.date,
        input.base,
        input.quote,
        input.signal,
      );
      if (input.datePolicy === "strict" && data.date !== input.date) {
        throw new OpenRatesError({
          code: "STRICT_DATE_NOT_AVAILABLE",
          message: `Frankfurter published no rate for ${input.date}.`,
          details: { requestedDate: input.date, effectiveDate: data.date },
          suggestion: "Retry with datePolicy 'previous_available' to use the prior rate.",
        });
      }
      return this.toProviderRate(input.base, input.quote, data);
    } catch (error) {
      throw normalizeFrankfurterError(error);
    }
  }

  async getTimeSeries(input: TimeSeriesInput): Promise<ProviderTimeSeries> {
    try {
      const data = await this.client.getSeries(
        input.startDate,
        input.endDate,
        input.base,
        input.quote,
        input.signal,
      );
      const points: ProviderTimeSeriesPoint[] = [];
      for (const date of Object.keys(data.rates).sort()) {
        const value = data.rates[date]?.[input.quote];
        if (value !== undefined) {
          points.push({ date, rate: rateToString(value), filled: false });
        }
      }

      return {
        baseCurrency: input.base,
        quoteCurrency: input.quote,
        startDate: input.startDate,
        endDate: input.endDate,
        rateType: "official_reference",
        providerId: this.id,
        points,
      };
    } catch (error) {
      throw normalizeFrankfurterError(error);
    }
  }

  async listCurrencies(): Promise<ProviderCurrency[]> {
    try {
      const data = await this.client.getCurrencies();
      return Object.entries(data).map(([code, name]) => ({ code, name }));
    } catch (error) {
      throw normalizeFrankfurterError(error);
    }
  }

  normalizeError(error: unknown): OpenRatesError {
    return normalizeFrankfurterError(error);
  }

  private toProviderRate(base: string, quote: string, data: LatestResponse): ProviderRate {
    const value = data.rates[quote];
    if (value === undefined) {
      throw new OpenRatesError({
        code: "RATE_NOT_AVAILABLE",
        message: `Frankfurter did not return a rate for ${base}/${quote}.`,
        details: { base, quote },
      });
    }
    return {
      baseCurrency: base,
      quoteCurrency: quote,
      rate: rateToString(value),
      rateType: "official_reference",
      effectiveDate: data.date,
      calculationMethod: "direct",
      providerId: this.id,
    };
  }
}
