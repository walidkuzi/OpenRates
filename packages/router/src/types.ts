import type {
  DatePolicy,
  MoneyConversionResult,
  NormalizedRate,
  RateMode,
  UseCase,
} from "@openrates/schemas";

export interface RateQuery {
  base: string;
  quote: string;
  date?: string;
  mode?: RateMode;
  provider?: string;
  useCase?: UseCase;
  datePolicy?: DatePolicy;
  allowFallback?: boolean;
  maxAgeSeconds?: number;
  now?: string;
}

export interface ConvertQuery extends RateQuery {
  amount: string;
  fixedFee?: string;
  percentageFee?: string;
  spreadPercentage?: string;
}

export interface SeriesQuery {
  base: string;
  quote: string;
  startDate: string;
  endDate: string;
  mode?: RateMode;
  provider?: string;
  fillPolicy?: "none" | "previous";
  now?: string;
}

export interface RouteInfo {
  selectedProvider: string;
  mode: RateMode;
  fallbackUsed: boolean;
  attempted: string[];
}

export interface CacheInfo {
  hit: boolean;
  storedAt?: string;
  ageSeconds?: number;
}

export interface RateResult {
  rate: NormalizedRate;
  route: RouteInfo;
  cache: CacheInfo;
}

export interface ConversionResult {
  conversion: MoneyConversionResult;
  route: RouteInfo;
  cache: CacheInfo;
}

export interface SeriesPoint {
  date: string;
  rate: string;
  filled: boolean;
}

export interface SeriesResult {
  baseCurrency: string;
  quoteCurrency: string;
  startDate: string;
  endDate: string;
  mode: RateMode;
  provider: string;
  rateType: string;
  points: SeriesPoint[];
  cache: CacheInfo;
}

export interface CompareQuery {
  base: string;
  quote: string;
  date?: string;
  providers?: string[];
  mode?: RateMode;
  maxProviders?: number;
  now?: string;
}

export interface ProviderQuote {
  provider: string;
  rate: string;
  rateType: string;
  effectiveDate: string;
  freshnessClass: string;
  differencePercent?: string;
}

export interface ProviderFailure {
  provider: string;
  code: string;
  message: string;
}

export interface CompareResult {
  base: string;
  quote: string;
  date: string;
  results: ProviderQuote[];
  failures: ProviderFailure[];
  median?: string;
  maxDifferencePercent?: string;
  disagreement: boolean;
}
