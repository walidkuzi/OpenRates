import type { CalculationMethod, NormalizedRate, RateMode, RateType } from "@openrates/schemas";
import type { ConfidenceResult } from "./confidence";
import type { FreshnessResult } from "./freshness";

export interface BuildRateInput {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  rateType: RateType;
  mode: RateMode;
  effectiveDate: string;
  observedAt?: string;
  publishedAt?: string;
  retrievedAt: string;
  providerId: string;
  providerName: string;
  originalSourceIds?: string[];
  calculationMethod: CalculationMethod;
  crossCurrency?: string;
  freshness: FreshnessResult;
  confidence: ConfidenceResult;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export function buildNormalizedRate(input: BuildRateInput): NormalizedRate {
  const mergedWarnings = [...(input.warnings ?? []), ...input.confidence.reasons];
  const warnings = [...new Set(mergedWarnings)];

  const rate: NormalizedRate = {
    baseCurrency: input.baseCurrency,
    quoteCurrency: input.quoteCurrency,
    rate: input.rate,
    rateType: input.rateType,
    mode: input.mode,
    effectiveDate: input.effectiveDate,
    retrievedAt: input.retrievedAt,
    freshnessClass: input.freshness.freshnessClass,
    isLive: input.freshness.isLive,
    isStale: input.freshness.isStale,
    providerId: input.providerId,
    providerName: input.providerName,
    calculationMethod: input.calculationMethod,
    confidenceScore: input.confidence.score,
    confidenceLabel: input.confidence.label,
    warnings,
  };

  if (input.observedAt !== undefined) {
    rate.observedAt = input.observedAt;
  }
  if (input.publishedAt !== undefined) {
    rate.publishedAt = input.publishedAt;
  }
  if (input.freshness.freshnessSeconds !== undefined) {
    rate.freshnessSeconds = input.freshness.freshnessSeconds;
  }
  if (input.originalSourceIds !== undefined) {
    rate.originalSourceIds = input.originalSourceIds;
  }
  if (input.crossCurrency !== undefined) {
    rate.crossCurrency = input.crossCurrency;
  }
  if (input.metadata !== undefined) {
    rate.metadata = input.metadata;
  }

  return rate;
}
