import { currencyMetadataSchema } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import {
  CURRENCIES,
  getCurrency,
  getMinorUnits,
  hasCurrency,
  isActiveCurrency,
  listCurrencies,
} from "./index";

describe("getCurrency", () => {
  it("normalizes case and whitespace", () => {
    expect(getCurrency("usd")?.code).toBe("USD");
    expect(getCurrency("  eur ")?.code).toBe("EUR");
  });

  it("returns undefined for unknown codes", () => {
    expect(getCurrency("XYZ")).toBeUndefined();
    expect(hasCurrency("XYZ")).toBe(false);
  });
});

describe("getMinorUnits", () => {
  it("returns the correct minor units per currency", () => {
    expect(getMinorUnits("USD")).toBe(2);
    expect(getMinorUnits("JPY")).toBe(0);
    expect(getMinorUnits("KRW")).toBe(0);
    expect(getMinorUnits("KWD")).toBe(3);
    expect(getMinorUnits("BHD")).toBe(3);
    expect(getMinorUnits("OMR")).toBe(3);
  });

  it("returns undefined for an unknown currency", () => {
    expect(getMinorUnits("ZZZ")).toBeUndefined();
  });
});

describe("listCurrencies", () => {
  it("returns only active currencies by default", () => {
    const codes = listCurrencies().map((currency) => currency.code);
    expect(codes).toContain("USD");
    expect(codes).not.toContain("TRL");
  });

  it("includes retired currencies when requested", () => {
    const codes = listCurrencies({ status: "all" }).map((currency) => currency.code);
    expect(codes).toContain("TRL");
  });

  it("respects the limit", () => {
    expect(listCurrencies({ limit: 3 })).toHaveLength(3);
  });

  it("knows which currencies are active", () => {
    expect(isActiveCurrency("USD")).toBe(true);
    expect(isActiveCurrency("TRL")).toBe(false);
  });
});

describe("catalogue integrity", () => {
  it("every entry matches the metadata schema", () => {
    for (const currency of CURRENCIES) {
      expect(() => currencyMetadataSchema.parse(currency)).not.toThrow();
    }
  });

  it("uses unique three-letter uppercase codes", () => {
    const codes = CURRENCIES.map((currency) => currency.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("references existing replacement currencies", () => {
    for (const currency of CURRENCIES) {
      if (currency.replacedBy !== undefined) {
        expect(hasCurrency(currency.replacedBy)).toBe(true);
      }
    }
  });

  it("keeps minor units within a sane range", () => {
    for (const currency of CURRENCIES) {
      if (currency.minorUnits !== null) {
        expect(currency.minorUnits).toBeGreaterThanOrEqual(0);
        expect(currency.minorUnits).toBeLessThanOrEqual(4);
      }
    }
  });
});
