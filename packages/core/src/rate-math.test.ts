import { OpenRatesError } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { crossRate, formatRate, inverseRate, isPositiveRate } from "./rate-math";

describe("inverseRate", () => {
  it("inverts exact rates", () => {
    expect(inverseRate("2")).toBe("0.5");
    expect(inverseRate("0.5")).toBe("2");
    expect(inverseRate("4")).toBe("0.25");
  });

  it("throws on a zero rate", () => {
    expect(() => inverseRate("0")).toThrow(OpenRatesError);
  });
});

describe("crossRate", () => {
  it("multiplies two legs exactly", () => {
    expect(crossRate("1.1", "2")).toBe("2.2");
    expect(crossRate("0.5", "0.5")).toBe("0.25");
  });
});

describe("formatRate", () => {
  it("rounds to the requested display precision with half-even", () => {
    expect(formatRate("0.123456789", 8)).toBe("0.12345679");
    expect(formatRate("0.5", 8)).toBe("0.5");
  });

  it("defaults to eight decimal places", () => {
    expect(formatRate("0.1234567891")).toBe("0.12345679");
  });
});

describe("isPositiveRate", () => {
  it("detects positive and non-positive rates", () => {
    expect(isPositiveRate("0.01")).toBe(true);
    expect(isPositiveRate("0")).toBe(false);
  });
});
