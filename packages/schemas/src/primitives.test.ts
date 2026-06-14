import { describe, expect, it } from "vitest";
import {
  amountStringSchema,
  currencyCodeSchema,
  dateInputSchema,
  isoDateSchema,
} from "./primitives";

describe("currencyCodeSchema", () => {
  it("normalizes case and trims whitespace", () => {
    expect(currencyCodeSchema.parse("usd")).toBe("USD");
    expect(currencyCodeSchema.parse("  eur ")).toBe("EUR");
  });

  it("rejects codes that are not three letters", () => {
    expect(currencyCodeSchema.safeParse("us").success).toBe(false);
    expect(currencyCodeSchema.safeParse("usdd").success).toBe(false);
    expect(currencyCodeSchema.safeParse("US1").success).toBe(false);
  });
});

describe("amountStringSchema", () => {
  it("accepts non-negative decimal strings", () => {
    expect(amountStringSchema.parse("1000.00")).toBe("1000.00");
    expect(amountStringSchema.parse("0")).toBe("0");
  });

  it("rejects negatives and non-numeric input", () => {
    expect(amountStringSchema.safeParse("-5").success).toBe(false);
    expect(amountStringSchema.safeParse("abc").success).toBe(false);
    expect(amountStringSchema.safeParse("1,000").success).toBe(false);
  });
});

describe("date schemas", () => {
  it("accepts ISO dates", () => {
    expect(isoDateSchema.parse("2026-06-12")).toBe("2026-06-12");
  });

  it("rejects malformed dates", () => {
    expect(isoDateSchema.safeParse("2026/06/12").success).toBe(false);
    expect(isoDateSchema.safeParse("06-12-2026").success).toBe(false);
  });

  it("accepts the latest keyword and ISO dates for date input", () => {
    expect(dateInputSchema.parse("latest")).toBe("latest");
    expect(dateInputSchema.parse("2026-06-12")).toBe("2026-06-12");
    expect(dateInputSchema.safeParse("yesterday").success).toBe(false);
  });
});
