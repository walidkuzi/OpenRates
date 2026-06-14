import type { CalculationMethod, OpenRatesError, RateMode, RateType } from "@openrates/schemas";

export type DatePolicy = "previous_available" | "strict";

export interface ProviderCapabilities {
  supportedModes: RateMode[];
  supportedRateTypes: RateType[];
  supportsHistorical: boolean;
  supportsTimeSeries: boolean;
  supportsIntraday: boolean;
  supportsProviderTimestamp: boolean;
  requiresApiKey: boolean;
  estimatedUpdateFrequencySeconds?: number;
  supportedCurrencies?: string[];
  baseCurrencyRestrictions?: string[];
}

export interface ProviderHealth {
  status: "healthy" | "degraded" | "unavailable";
  checkedAt: string;
  latencyMs?: number;
  lastSuccessfulRequestAt?: string;
  message?: string;
}

export interface ProviderRate {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  rateType: RateType;
  effectiveDate: string;
  observedAt?: string;
  publishedAt?: string;
  calculationMethod: CalculationMethod;
  crossCurrency?: string;
  providerId: string;
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProviderTimeSeriesPoint {
  date: string;
  rate: string;
  filled?: boolean;
}

export interface ProviderTimeSeries {
  baseCurrency: string;
  quoteCurrency: string;
  startDate: string;
  endDate: string;
  rateType: RateType;
  providerId: string;
  points: ProviderTimeSeriesPoint[];
}

export interface ProviderCurrency {
  code: string;
  name?: string;
}

export interface LatestRateInput {
  base: string;
  quote: string;
  signal?: AbortSignal;
}

export interface HistoricalRateInput {
  base: string;
  quote: string;
  date: string;
  datePolicy: DatePolicy;
  signal?: AbortSignal;
}

export interface TimeSeriesInput {
  base: string;
  quote: string;
  startDate: string;
  endDate: string;
  signal?: AbortSignal;
}

export interface ExchangeRateProvider {
  readonly id: string;
  readonly name: string;
  capabilities(): Promise<ProviderCapabilities>;
  healthCheck(): Promise<ProviderHealth>;
  getLatestRate(input: LatestRateInput): Promise<ProviderRate>;
  getHistoricalRate(input: HistoricalRateInput): Promise<ProviderRate>;
  getTimeSeries(input: TimeSeriesInput): Promise<ProviderTimeSeries>;
  listCurrencies(): Promise<ProviderCurrency[]>;
  normalizeError(error: unknown): OpenRatesError;
}
