import { normalizedRateSchema } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { calculateConfidence } from "./confidence";
import { classifyFreshness } from "./freshness";
import { buildNormalizedRate } from "./rate-model";

function officialRate() {
  const freshness = classifyFreshness({
    mode: "official",
    rateType: "official_reference",
    isHistoricalRequest: false,
    effectiveDate: "2026-06-12",
    retrievedAt: "2026-06-15T12:00:00Z",
    now: "2026-06-15T12:00:00Z",
    providerSupportsIntraday: false,
    providerSupportsTimestamp: false,
    liveThresholdSeconds: 300,
    recentThresholdSeconds: 3600,
  });
  const confidence = calculateConfidence({
    providerTrust: 1,
    hasSourceTimestamp: false,
    freshnessMatch: 1,
    isDirectPair: false,
    providerHealth: 1,
  });
  return buildNormalizedRate({
    baseCurrency: "USD",
    quoteCurrency: "EUR",
    rate: "0.865421",
    rateType: "official_reference",
    mode: "official",
    effectiveDate: "2026-06-12",
    retrievedAt: "2026-06-15T12:00:00Z",
    providerId: "frankfurter",
    providerName: "Frankfurter",
    calculationMethod: "inverse",
    crossCurrency: "USD",
    freshness,
    confidence,
    warnings: ["Rate was computed through an inverse or cross calculation.", "Custom warning."],
  });
}

describe("buildNormalizedRate", () => {
  it("produces a schema-valid normalized rate", () => {
    const rate = officialRate();
    expect(() => normalizedRateSchema.parse(rate)).not.toThrow();
  });

  it("keeps official reference rates non-live", () => {
    const rate = officialRate();
    expect(rate.isLive).toBe(false);
    expect(rate.rateType).toBe("official_reference");
  });

  it("merges and deduplicates confidence reasons into warnings", () => {
    const rate = officialRate();
    const crossWarnings = rate.warnings.filter((warning) => warning.includes("cross"));
    expect(crossWarnings).toHaveLength(1);
    expect(rate.warnings).toContain("Custom warning.");
  });

  it("omits optional fields that were not supplied", () => {
    const rate = officialRate();
    expect(rate.observedAt).toBeUndefined();
    expect(rate.publishedAt).toBeUndefined();
  });

  it("carries calculation provenance", () => {
    const rate = officialRate();
    expect(rate.calculationMethod).toBe("inverse");
    expect(rate.crossCurrency).toBe("USD");
    expect(["high", "medium", "low"]).toContain(rate.confidenceLabel);
  });

  it("includes optional market fields when they are supplied", () => {
    const freshness = classifyFreshness({
      mode: "market",
      rateType: "market_midpoint",
      isHistoricalRequest: false,
      effectiveDate: "2026-06-15",
      retrievedAt: "2026-06-15T12:00:00Z",
      now: "2026-06-15T12:00:00Z",
      observedAt: "2026-06-15T11:59:00Z",
      providerSupportsIntraday: true,
      providerSupportsTimestamp: true,
      liveThresholdSeconds: 300,
      recentThresholdSeconds: 3600,
    });
    const confidence = calculateConfidence({
      providerTrust: 0.8,
      hasSourceTimestamp: true,
      freshnessMatch: 1,
      isDirectPair: true,
      providerHealth: 1,
    });
    const rate = buildNormalizedRate({
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      rate: "0.865421",
      rateType: "market_midpoint",
      mode: "market",
      effectiveDate: "2026-06-15",
      observedAt: "2026-06-15T11:59:00Z",
      publishedAt: "2026-06-15T11:59:05Z",
      retrievedAt: "2026-06-15T12:00:00Z",
      providerId: "example-market",
      providerName: "Example Market",
      originalSourceIds: ["src-1", "src-2"],
      calculationMethod: "direct",
      freshness,
      confidence,
      metadata: { feed: "indicative" },
    });

    expect(rate.isLive).toBe(true);
    expect(rate.observedAt).toBe("2026-06-15T11:59:00Z");
    expect(rate.publishedAt).toBe("2026-06-15T11:59:05Z");
    expect(rate.freshnessSeconds).toBe(60);
    expect(rate.originalSourceIds).toEqual(["src-1", "src-2"]);
    expect(rate.metadata).toEqual({ feed: "indicative" });
    expect(rate.crossCurrency).toBeUndefined();
  });
});
