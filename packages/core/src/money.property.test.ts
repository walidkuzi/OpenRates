import type { NormalizedRate } from "@openrates/schemas";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Decimal, HALF_EVEN } from "./decimal";
import { convertMoney } from "./money";
import { crossRate, inverseRate } from "./rate-math";

function makeRate(rate: string): NormalizedRate {
  return {
    baseCurrency: "USD",
    quoteCurrency: "EUR",
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
    warnings: [],
  };
}

describe("convertMoney properties", () => {
  it("computes amount * rate without floating point drift", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 1, max: 100_000_000 }),
        fc.constantFrom(0, 2, 3),
        (whole, cents, rateNumerator, minorUnits) => {
          const amount = `${whole}.${String(cents).padStart(2, "0")}`;
          const rate = new Decimal(rateNumerator).div(100_000_000).toString();
          const result = convertMoney({ amount, rate: makeRate(rate), toMinorUnits: minorUnits });
          const expectedUnrounded = new Decimal(amount).mul(rate).toString();
          expect(result.result.unroundedAmount).toBe(expectedUnrounded);
          expect(result.result.roundedAmount).toBe(
            new Decimal(expectedUnrounded).toFixed(minorUnits, HALF_EVEN),
          );
        },
      ),
    );
  });

  it("always rounds to exactly the target minor units", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.constantFrom(0, 2, 3),
        (amount, minorUnits) => {
          const result = convertMoney({
            amount: String(amount),
            rate: makeRate("1.23456789"),
            toMinorUnits: minorUnits,
          });
          const rounded = result.result.roundedAmount;
          if (minorUnits === 0) {
            expect(rounded.includes(".")).toBe(false);
          } else {
            expect(rounded.split(".")[1]?.length).toBe(minorUnits);
          }
        },
      ),
    );
  });
});

describe("rate math properties", () => {
  it("inverting twice returns the original within tolerance", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000_000 }), (numerator) => {
        const rate = new Decimal(numerator).div(100_000).toString();
        const back = inverseRate(inverseRate(rate));
        const relativeError = new Decimal(back).minus(rate).abs().div(rate);
        expect(relativeError.lessThan(new Decimal("1e-20"))).toBe(true);
      }),
    );
  });

  it("cross rate equals the exact product of its legs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (a, b) => {
          const legA = new Decimal(a).div(1000).toString();
          const legB = new Decimal(b).div(1000).toString();
          expect(crossRate(legA, legB)).toBe(new Decimal(legA).mul(legB).toString());
        },
      ),
    );
  });
});
