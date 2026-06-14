import { describe, expect, it } from "vitest";
import { type FreshnessInput, classifyFreshness } from "./freshness";

function officialInput(overrides: Partial<FreshnessInput> = {}): FreshnessInput {
  return {
    mode: "official",
    rateType: "official_reference",
    isHistoricalRequest: false,
    effectiveDate: "2026-06-15",
    retrievedAt: "2026-06-15T12:00:00Z",
    now: "2026-06-15T12:00:00Z",
    providerSupportsIntraday: false,
    providerSupportsTimestamp: false,
    liveThresholdSeconds: 300,
    recentThresholdSeconds: 3600,
    ...overrides,
  };
}

function marketInput(overrides: Partial<FreshnessInput> = {}): FreshnessInput {
  return {
    mode: "market",
    rateType: "market_midpoint",
    isHistoricalRequest: false,
    effectiveDate: "2026-06-15",
    retrievedAt: "2026-06-15T12:00:00Z",
    now: "2026-06-15T12:00:00Z",
    providerSupportsIntraday: true,
    providerSupportsTimestamp: true,
    liveThresholdSeconds: 300,
    recentThresholdSeconds: 3600,
    ...overrides,
  };
}

describe("official and daily rates are never live", () => {
  it("classifies the current business day as latest_available", () => {
    const result = classifyFreshness(officialInput());
    expect(result.freshnessClass).toBe("latest_available");
    expect(result.isLive).toBe(false);
  });

  it("classifies an older effective date as latest_business_day", () => {
    const result = classifyFreshness(
      officialInput({ effectiveDate: "2026-06-12", now: "2026-06-14T12:00:00Z" }),
    );
    expect(result.freshnessClass).toBe("latest_business_day");
    expect(result.isLive).toBe(false);
  });

  it("never marks an official reference rate live even with a fresh timestamp", () => {
    const result = classifyFreshness(
      officialInput({
        providerSupportsIntraday: true,
        providerSupportsTimestamp: true,
        observedAt: "2026-06-15T11:59:30Z",
      }),
    );
    expect(result.isLive).toBe(false);
  });

  it("classifies an exact historical date", () => {
    const result = classifyFreshness(
      officialInput({
        isHistoricalRequest: true,
        requestedDate: "2026-06-10",
        effectiveDate: "2026-06-10",
      }),
    );
    expect(result.freshnessClass).toBe("historical_exact_date");
    expect(result.isLive).toBe(false);
  });

  it("classifies a fallback to a previous available date", () => {
    const result = classifyFreshness(
      officialInput({
        isHistoricalRequest: true,
        requestedDate: "2026-06-14",
        effectiveDate: "2026-06-12",
      }),
    );
    expect(result.freshnessClass).toBe("historical_previous_available_date");
  });

  it("marks an official latest rate stale when it exceeds maxAgeSeconds", () => {
    const result = classifyFreshness(
      officialInput({
        effectiveDate: "2026-06-10",
        now: "2026-06-15T12:00:00Z",
        maxAgeSeconds: 86_400,
      }),
    );
    expect(result.isLive).toBe(false);
    expect(result.isStale).toBe(true);
    expect(result.freshnessClass).toBe("latest_business_day");
  });
});

describe("market rates", () => {
  it("classifies a fresh market rate as live", () => {
    const result = classifyFreshness(marketInput({ observedAt: "2026-06-15T11:59:00Z" }));
    expect(result.freshnessClass).toBe("live");
    expect(result.isLive).toBe(true);
    expect(result.freshnessSeconds).toBe(60);
  });

  it("classifies an hour-old market rate as recent", () => {
    const result = classifyFreshness(marketInput({ observedAt: "2026-06-15T11:30:00Z" }));
    expect(result.freshnessClass).toBe("recent");
    expect(result.isLive).toBe(false);
  });

  it("marks a rate stale when it exceeds maxAgeSeconds", () => {
    const result = classifyFreshness(
      marketInput({ observedAt: "2026-06-15T10:00:00Z", maxAgeSeconds: 3600 }),
    );
    expect(result.freshnessClass).toBe("stale");
    expect(result.isStale).toBe(true);
    expect(result.isLive).toBe(false);
  });

  it("marks a rate stale when it exceeds the expected update interval", () => {
    const result = classifyFreshness(
      marketInput({
        observedAt: "2026-06-15T11:45:00Z",
        expectedUpdateIntervalSeconds: 60,
      }),
    );
    expect(result.isStale).toBe(true);
  });

  it("returns unknown when no timestamp is available", () => {
    const result = classifyFreshness(
      marketInput({ providerSupportsTimestamp: false, observedAt: undefined }),
    );
    expect(result.freshnessClass).toBe("unknown");
    expect(result.isLive).toBe(false);
  });

  it("treats an aged-but-not-stale rate as latest_available", () => {
    const result = classifyFreshness(marketInput({ observedAt: "2026-06-15T10:00:00Z" }));
    expect(result.freshnessClass).toBe("latest_available");
    expect(result.isLive).toBe(false);
    expect(result.isStale).toBe(false);
  });
});
