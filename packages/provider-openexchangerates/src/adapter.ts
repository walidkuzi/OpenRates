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
import { OxrClient, rateToString } from "./client";
import { normalizeOxrError } from "./errors";

export const OXR_ID = "openexchangerates";
export const OXR_NAME = "Open Exchange Rates";
export const OXR_DEFAULT_BASE_URL = "https://openexchangerates.org/api";

export interface OxrProviderOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetch?: FetchLike;
  now?: () => number;
}

export class OpenExchangeRatesProvider implements ExchangeRateProvider {
  readonly id = OXR_ID;
  readonly name = OXR_NAME;

  private readonly client: OxrClient;
  private readonly now: () => number;

  constructor(options: OxrProviderOptions) {
    this.client = new OxrClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? OXR_DEFAULT_BASE_URL,
      timeoutMs: options.timeoutMs ?? 5000,
      retries: options.retries ?? 2,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    this.now = options.now ?? Date.now;
  }

  capabilities(): Promise<ProviderCapabilities> {
    return Promise.resolve({
      supportedModes: ["market"],
      supportedRateTypes: ["market_indicative"],
      supportsHistorical: true,
      supportsTimeSeries: true,
      supportsIntraday: false,
      supportsProviderTimestamp: true,
      requiresApiKey: true,
      estimatedUpdateFrequencySeconds: 3_600,
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
      const normalized = normalizeOxrError(error);
      return {
        status: normalized.code === "PROVIDER_AUTHENTICATION_FAILED" ? "degraded" : "unavailable",
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
      throw normalizeOxrError(error);
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
      return this.toProviderRate(input.base, input.quote, data);
    } catch (error) {
      throw normalizeOxrError(error);
    }
  }

  async getTimeSeries(input: TimeSeriesInput): Promise<ProviderTimeSeries> {
    try {
      const data = await this.client.getTimeSeries(
        input.startDate,
        input.endDate,
        input.base,
        input.quote,
        input.signal,
      );
      const points: ProviderTimeSeriesPoint[] = [];
      for (const date of Object.keys(data.rates).sort()) {
        const dayRates = data.rates[date];
        const value = dayRates?.[input.quote];
        if (value !== undefined) {
          points.push({ date, rate: rateToString(value), filled: false });
        }
      }
      return {
        baseCurrency: input.base,
        quoteCurrency: input.quote,
        startDate: input.startDate,
        endDate: input.endDate,
        rateType: "market_indicative",
        providerId: this.id,
        points,
      };
    } catch (error) {
      throw normalizeOxrError(error);
    }
  }

  async listCurrencies(): Promise<ProviderCurrency[]> {
    try {
      const data = await this.client.getCurrencies();
      return Object.entries(data).map(([code, name]) => ({ code, name }));
    } catch (error) {
      throw normalizeOxrError(error);
    }
  }

  normalizeError(error: unknown): OpenRatesError {
    return normalizeOxrError(error);
  }

  private toProviderRate(
    base: string,
    quote: string,
    data: { timestamp: number; rates: Record<string, number>; base: string },
  ): ProviderRate {
    const value = data.rates[quote];
    if (value === undefined) {
      throw new OpenRatesError({
        code: "RATE_NOT_AVAILABLE",
        message: `Open Exchange Rates did not return a rate for ${base}/${quote}.`,
        details: { base, quote },
      });
    }
    const publishedAt = new Date(data.timestamp * 1000).toISOString();
    const effectiveDate = publishedAt.slice(0, 10);
    return {
      baseCurrency: base,
      quoteCurrency: quote,
      rate: rateToString(value),
      rateType: "market_indicative",
      effectiveDate,
      publishedAt,
      calculationMethod: "direct",
      providerId: this.id,
    };
  }
}
