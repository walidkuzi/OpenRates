import type { NormalizedRate } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { shapeConversion, shapeRate, shapeSeries } from "./format";
import type { ConversionResult, RateResult, SeriesResult } from "./types";

const normalizedRate: NormalizedRate = {
  baseCurrency: "USD",
  quoteCurrency: "EUR",
  rate: "0.865421",
  rateType: "official_reference",
  mode: "official",
  effectiveDate: "2026-06-12",
  retrievedAt: "2026-06-15T12:00:00Z",
  freshnessClass: "latest_business_day",
  isLive: false,
  isStale: false,
  providerId: "frankfurter",
  providerName: "Frankfurter",
  calculationMethod: "direct",
  confidenceScore: 0.83,
  confidenceLabel: "medium",
  warnings: ["A note."],
};

const rateResult: RateResult = {
  rate: normalizedRate,
  route: {
    selectedProvider: "frankfurter",
    mode: "official",
    fallbackUsed: false,
    attempted: ["frankfurter"],
  },
  cache: { hit: false },
};

const conversionResult: ConversionResult = {
  conversion: {
    input: { amount: "1000.00", from: "USD", to: "EUR" },
    rate: normalizedRate,
    result: {
      unroundedAmount: "865.421",
      roundedAmount: "865.42",
      minorUnits: 2,
      roundingMode: "half_even",
    },
    disclaimer: "Informational only.",
  },
  route: rateResult.route,
  cache: { hit: false },
};

describe("shapeRate", () => {
  it("compact carries the essentials and the main warning", () => {
    const shaped = shapeRate(rateResult, "compact");
    expect(shaped).toMatchObject({
      base: "USD",
      quote: "EUR",
      rate: "0.865421",
      provider: "frankfurter",
      isLive: false,
      warning: "A note.",
    });
    expect(shaped.confidence).toBeUndefined();
  });

  it("standard adds confidence and warnings but not route", () => {
    const shaped = shapeRate(rateResult, "standard");
    expect(shaped.confidence).toEqual({ score: 0.83, label: "medium" });
    expect(shaped.warnings).toEqual(["A note."]);
    expect(shaped.route).toBeUndefined();
  });

  it("full adds route, cache, inverse, and timestamps", () => {
    const shaped = shapeRate(rateResult, "full");
    expect(shaped.route).toBeDefined();
    expect(shaped.cache).toEqual({ hit: false });
    expect(typeof shaped.inverseRate).toBe("string");
    expect(shaped.timestamps).toBeDefined();
  });
});

describe("shapeConversion", () => {
  it("compact includes the converted amount", () => {
    const shaped = shapeConversion(conversionResult, "compact");
    expect(shaped).toMatchObject({ from: "USD", to: "EUR", convertedAmount: "865.42" });
  });

  it("standard includes rounding and disclaimer", () => {
    const shaped = shapeConversion(conversionResult, "standard");
    expect(shaped.rounding).toEqual({ minorUnits: 2, mode: "half_even" });
    expect(shaped.disclaimer).toBe("Informational only.");
  });

  it("full includes the unrounded amount", () => {
    const shaped = shapeConversion(conversionResult, "full");
    expect(shaped.unroundedAmount).toBe("865.421");
  });
});

describe("shapeSeries", () => {
  it("summarizes points with a count", () => {
    const series: SeriesResult = {
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      startDate: "2026-06-10",
      endDate: "2026-06-12",
      mode: "official",
      provider: "frankfurter",
      rateType: "official_reference",
      points: [
        { date: "2026-06-10", rate: "0.864", filled: false },
        { date: "2026-06-12", rate: "0.865421", filled: false },
      ],
      cache: { hit: false },
    };
    expect(shapeSeries(series).count).toBe(2);
    expect(shapeSeries(series, "full").cache).toEqual({ hit: false });
  });
});
