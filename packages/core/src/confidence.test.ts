import { describe, expect, it } from "vitest";
import { calculateConfidence, confidenceLabelFor } from "./confidence";

describe("calculateConfidence", () => {
  it("gives a perfect signal the maximum score", () => {
    const result = calculateConfidence({
      providerTrust: 1,
      hasSourceTimestamp: true,
      freshnessMatch: 1,
      isDirectPair: true,
      providerHealth: 1,
    });
    expect(result.score).toBe(1);
    expect(result.label).toBe("high");
    expect(result.reasons).toHaveLength(0);
  });

  it("lets a trusted official reference reach high confidence without an intraday timestamp", () => {
    const result = calculateConfidence({
      providerTrust: 1,
      hasSourceTimestamp: false,
      freshnessMatch: 1,
      isDirectPair: true,
      providerHealth: 1,
    });
    expect(result.score).toBe(0.85);
    expect(result.label).toBe("high");
  });

  it("reduces confidence for a computed cross rate", () => {
    const result = calculateConfidence({
      providerTrust: 1,
      hasSourceTimestamp: false,
      freshnessMatch: 1,
      isDirectPair: false,
      providerHealth: 1,
    });
    expect(result.score).toBe(0.75);
    expect(result.label).toBe("medium");
    expect(result.reasons.some((reason) => reason.includes("cross"))).toBe(true);
  });

  it("never gives a stale rate high confidence", () => {
    const result = calculateConfidence({
      providerTrust: 1,
      hasSourceTimestamp: true,
      freshnessMatch: 1,
      isDirectPair: true,
      providerHealth: 1,
      isStale: true,
    });
    expect(result.score).toBeLessThan(0.6);
    expect(result.label).toBe("low");
    expect(result.reasons.some((reason) => reason.includes("stale"))).toBe(true);
  });

  it("flags provider disagreement", () => {
    const result = calculateConfidence({
      providerTrust: 1,
      hasSourceTimestamp: true,
      freshnessMatch: 1,
      isDirectPair: true,
      providerHealth: 1,
      crossProviderAgreement: 0.2,
    });
    expect(result.reasons.some((reason) => reason.includes("disagree"))).toBe(true);
  });

  it("exposes weighted factor contributions that sum to the score", () => {
    const result = calculateConfidence({
      providerTrust: 0.5,
      hasSourceTimestamp: true,
      freshnessMatch: 0.5,
      isDirectPair: true,
      providerHealth: 1,
    });
    const sum = Object.values(result.factors).reduce((total, value) => total + value, 0);
    expect(Math.round(sum * 100) / 100).toBe(result.score);
  });
});

describe("confidenceLabelFor", () => {
  it("maps scores to labels at the documented thresholds", () => {
    expect(confidenceLabelFor(0.85)).toBe("high");
    expect(confidenceLabelFor(0.84)).toBe("medium");
    expect(confidenceLabelFor(0.6)).toBe("medium");
    expect(confidenceLabelFor(0.59)).toBe("low");
  });
});
