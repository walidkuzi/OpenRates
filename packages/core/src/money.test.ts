import type { NormalizedRate } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { convertMoney } from "./money";

function makeRate(rate: string, from = "USD", to = "EUR", warnings: string[] = []): NormalizedRate {
  return {
    baseCurrency: from,
    quoteCurrency: to,
    rate,
    rateType: "official_reference",
    mode: "official",
    effectiveDate: "2026-06-12",
    retrievedAt: "2026-06-15T00:00:00Z",
    freshnessClass: "latest_business_day",
    isLive: false,
    isStale: false,
    providerId: "frankfurter",
    providerName: "Frankfurter",
    calculationMethod: "direct",
    confidenceScore: 0.9,
    confidenceLabel: "high",
    warnings,
  };
}

describe("convertMoney", () => {
  it("converts and rounds to target minor units", () => {
    const result = convertMoney({
      amount: "1000.00",
      rate: makeRate("0.865421"),
      toMinorUnits: 2,
    });
    expect(result.result.unroundedAmount).toBe("865.421");
    expect(result.result.roundedAmount).toBe("865.42");
    expect(result.result.minorUnits).toBe(2);
    expect(result.result.roundingMode).toBe("half_even");
    expect(result.input).toEqual({ amount: "1000.00", from: "USD", to: "EUR" });
  });

  it("handles zero minor unit currencies", () => {
    const result = convertMoney({
      amount: "1000",
      rate: makeRate("150.5", "USD", "JPY"),
      toMinorUnits: 0,
    });
    expect(result.result.roundedAmount).toBe("150500");
    expect(result.result.roundedAmount).not.toContain(".");
  });

  it("handles three minor unit currencies", () => {
    const result = convertMoney({
      amount: "100",
      rate: makeRate("0.30542", "USD", "KWD"),
      toMinorUnits: 3,
    });
    expect(result.result.roundedAmount).toBe("30.542");
  });

  it("applies banker's rounding (half-even)", () => {
    const down = convertMoney({ amount: "1", rate: makeRate("2.345"), toMinorUnits: 2 });
    const up = convertMoney({ amount: "1", rate: makeRate("2.355"), toMinorUnits: 2 });
    expect(down.result.roundedAmount).toBe("2.34");
    expect(up.result.roundedAmount).toBe("2.36");
  });

  it("returns zero for a zero amount", () => {
    const result = convertMoney({ amount: "0", rate: makeRate("0.865421"), toMinorUnits: 2 });
    expect(result.result.unroundedAmount).toBe("0");
    expect(result.result.roundedAmount).toBe("0.00");
  });

  it("returns the input amount for an identity rate", () => {
    const result = convertMoney({
      amount: "500.00",
      rate: makeRate("1", "SAR", "SAR"),
      toMinorUnits: 2,
    });
    expect(result.result.roundedAmount).toBe("500.00");
  });

  it("defaults unknown minor units to two and warns", () => {
    const result = convertMoney({ amount: "100", rate: makeRate("1.5"), toMinorUnits: null });
    expect(result.result.minorUnits).toBe(2);
    expect(result.rate.warnings.some((warning) => warning.includes("unknown"))).toBe(true);
  });

  it("applies spread, then percentage fee, then fixed fee in order", () => {
    const result = convertMoney({
      amount: "1000",
      rate: makeRate("1", "USD", "USD"),
      toMinorUnits: 2,
      fees: { spreadPercentage: "1", percentageFee: "2", fixedFee: "5" },
    });
    expect(result.fees).toBeDefined();
    expect(result.fees?.spreadPercentage).toBe("1");
    expect(result.fees?.percentageFee).toBe("2");
    expect(result.fees?.fixedFee).toBe("5");
    expect(result.fees?.estimatedReceivedAmount).toBe("965.20");
    expect(result.fees?.totalEstimatedCost).toBe("34.80");
  });

  it("omits fees when no fee input is provided", () => {
    const result = convertMoney({ amount: "10", rate: makeRate("1"), toMinorUnits: 2 });
    expect(result.fees).toBeUndefined();
  });

  it("omits fees when the fee object is empty", () => {
    const result = convertMoney({
      amount: "10",
      rate: makeRate("1"),
      toMinorUnits: 2,
      fees: {},
    });
    expect(result.fees).toBeUndefined();
  });

  it("carries existing rate warnings through to the result", () => {
    const result = convertMoney({
      amount: "10",
      rate: makeRate("1", "USD", "EUR", ["Existing warning."]),
      toMinorUnits: 2,
    });
    expect(result.rate.warnings).toContain("Existing warning.");
  });

  it("always includes the informational disclaimer", () => {
    const result = convertMoney({ amount: "10", rate: makeRate("1"), toMinorUnits: 2 });
    expect(result.disclaimer.toLowerCase()).toContain("informational");
  });
});
