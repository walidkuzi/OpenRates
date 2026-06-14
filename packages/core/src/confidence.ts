import type { ConfidenceLabel } from "@openrates/schemas";

export const CONFIDENCE_WEIGHTS = {
  providerTrust: 0.4,
  sourceTimestamp: 0.15,
  freshnessMatch: 0.2,
  directPair: 0.1,
  providerHealth: 0.1,
  crossProviderAgreement: 0.05,
} as const;

const STALE_CONFIDENCE_CAP = 0.59;

export interface ConfidenceInput {
  providerTrust: number;
  hasSourceTimestamp: boolean;
  freshnessMatch: number;
  isDirectPair: boolean;
  providerHealth: number;
  crossProviderAgreement?: number;
  isStale?: boolean;
}

export interface ConfidenceResult {
  score: number;
  label: ConfidenceLabel;
  factors: Record<keyof typeof CONFIDENCE_WEIGHTS, number>;
  reasons: string[];
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function confidenceLabelFor(score: number): ConfidenceLabel {
  if (score >= 0.85) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const normalized = {
    providerTrust: clamp01(input.providerTrust),
    sourceTimestamp: input.hasSourceTimestamp ? 1 : 0,
    freshnessMatch: clamp01(input.freshnessMatch),
    directPair: input.isDirectPair ? 1 : 0,
    providerHealth: clamp01(input.providerHealth),
    crossProviderAgreement:
      input.crossProviderAgreement === undefined ? 1 : clamp01(input.crossProviderAgreement),
  };

  const factors: Record<keyof typeof CONFIDENCE_WEIGHTS, number> = {
    providerTrust: round4(normalized.providerTrust * CONFIDENCE_WEIGHTS.providerTrust),
    sourceTimestamp: round4(normalized.sourceTimestamp * CONFIDENCE_WEIGHTS.sourceTimestamp),
    freshnessMatch: round4(normalized.freshnessMatch * CONFIDENCE_WEIGHTS.freshnessMatch),
    directPair: round4(normalized.directPair * CONFIDENCE_WEIGHTS.directPair),
    providerHealth: round4(normalized.providerHealth * CONFIDENCE_WEIGHTS.providerHealth),
    crossProviderAgreement: round4(
      normalized.crossProviderAgreement * CONFIDENCE_WEIGHTS.crossProviderAgreement,
    ),
  };

  let rawScore =
    normalized.providerTrust * CONFIDENCE_WEIGHTS.providerTrust +
    normalized.sourceTimestamp * CONFIDENCE_WEIGHTS.sourceTimestamp +
    normalized.freshnessMatch * CONFIDENCE_WEIGHTS.freshnessMatch +
    normalized.directPair * CONFIDENCE_WEIGHTS.directPair +
    normalized.providerHealth * CONFIDENCE_WEIGHTS.providerHealth +
    normalized.crossProviderAgreement * CONFIDENCE_WEIGHTS.crossProviderAgreement;

  const reasons: string[] = [];

  if (!input.hasSourceTimestamp) {
    reasons.push("Provider did not supply an observation or publication timestamp.");
  }
  if (!input.isDirectPair) {
    reasons.push("Rate was computed through an inverse or cross calculation.");
  }
  if (input.crossProviderAgreement !== undefined && input.crossProviderAgreement < 0.5) {
    reasons.push("Configured providers disagree on this currency pair.");
  }
  if (input.providerHealth < 1) {
    reasons.push("Provider health is degraded.");
  }

  if (input.isStale === true) {
    reasons.push("Rate is stale and should not be treated as current.");
    rawScore = Math.min(rawScore, STALE_CONFIDENCE_CAP);
  }

  const score = round2(clamp01(rawScore));
  return { score, label: confidenceLabelFor(score), factors, reasons };
}
