export interface SdkResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface SdkRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export type SdkFetch = (url: string, init?: SdkRequestInit) => Promise<SdkResponse>;

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface RateParams {
  base: string;
  quote: string;
  date?: string;
  mode?: "official" | "market" | "auto";
  provider?: string;
  useCase?: string;
  datePolicy?: "previous_available" | "strict";
  allowFallback?: boolean;
  maxAgeSeconds?: number;
  responseDetail?: "compact" | "standard" | "full";
}

export interface ConvertParams {
  amount: string;
  from: string;
  to: string;
  date?: string;
  mode?: "official" | "market" | "auto";
  provider?: string;
  useCase?: string;
  datePolicy?: "previous_available" | "strict";
  allowFallback?: boolean;
  maxAgeSeconds?: number;
  fixedFee?: string;
  percentageFee?: string;
  spreadPercentage?: string;
  responseDetail?: "compact" | "standard" | "full";
}

export interface SeriesParams {
  base: string;
  quote: string;
  startDate: string;
  endDate: string;
  interval?: "day" | "week" | "month";
  mode?: "official" | "market";
  provider?: string;
  fillPolicy?: "none" | "previous";
  responseDetail?: "compact" | "standard" | "full";
}

export interface CurrenciesParams {
  query?: string;
  status?: "active" | "retired" | "all";
  limit?: number;
}

export interface RateResponse {
  base: string;
  quote: string;
  rate: string;
  rateType: string;
  effectiveDate: string;
  provider: string;
  freshness: string;
  isLive: boolean;
  [key: string]: unknown;
}

export interface ConversionResponse {
  from: string;
  to: string;
  amount: string;
  rate: string;
  convertedAmount: string;
  rateType: string;
  effectiveDate: string;
  provider: string;
  [key: string]: unknown;
}

export interface SeriesResponse {
  base: string;
  quote: string;
  startDate: string;
  endDate: string;
  provider: string;
  rateType: string;
  points: Array<{ date: string; rate: string; filled: boolean }>;
  [key: string]: unknown;
}
