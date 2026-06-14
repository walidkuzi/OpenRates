import { describe, expect, it } from "vitest";
import { resolveCurrency } from "./index";

describe("resolveCurrency unambiguous names", () => {
  it("resolves qualified names from the PRD examples", () => {
    expect(resolveCurrency("Saudi riyal").resolved?.code).toBe("SAR");
    expect(resolveCurrency("Turkish lira").resolved?.code).toBe("TRY");
    expect(resolveCurrency("Afghani").resolved?.code).toBe("AFN");
    expect(resolveCurrency("US dollar").resolved?.code).toBe("USD");
  });

  it("resolves direct ISO codes", () => {
    const result = resolveCurrency("eur");
    expect(result.resolved?.code).toBe("EUR");
    expect(result.ambiguous).toBe(false);
  });

  it("treats a resolved name as unambiguous with a single candidate", () => {
    const result = resolveCurrency("euro");
    expect(result.ambiguous).toBe(false);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.code).toBe("EUR");
  });
});

describe("resolveCurrency ambiguity", () => {
  it("flags dollar as ambiguous and returns candidates", () => {
    const result = resolveCurrency("dollar");
    expect(result.ambiguous).toBe(true);
    expect(result.resolved).toBeUndefined();
    const codes = result.candidates.map((currency) => currency.code);
    expect(codes).toContain("USD");
    expect(codes).toContain("AUD");
    expect(codes).toContain("CAD");
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it("never returns an undefined candidate for ambiguous terms", () => {
    for (const term of ["dollar", "peso", "franc", "dinar", "rupee", "pound", "shilling"]) {
      const result = resolveCurrency(term);
      expect(result.ambiguous).toBe(true);
      for (const candidate of result.candidates) {
        expect(candidate).toBeDefined();
        expect(candidate.code).toMatch(/^[A-Z]{3}$/);
      }
    }
  });
});

describe("resolveCurrency notes", () => {
  it("explains the onshore/offshore distinction for yuan", () => {
    const result = resolveCurrency("yuan");
    expect(result.resolved?.code).toBe("CNY");
    expect(result.note).toContain("CNH");
  });

  it("handles a retired currency with replacement guidance", () => {
    const result = resolveCurrency("old Turkish lira");
    expect(result.resolved?.code).toBe("TRL");
    expect(result.resolved?.status).toBe("retired");
    expect(result.resolved?.replacedBy).toBe("TRY");
    expect(result.note).toContain("TRY");
  });
});

describe("resolveCurrency misses", () => {
  it("returns no resolution and no candidates for unknown input", () => {
    const result = resolveCurrency("not-a-currency");
    expect(result.resolved).toBeUndefined();
    expect(result.ambiguous).toBe(false);
    expect(result.candidates).toHaveLength(0);
  });
});
