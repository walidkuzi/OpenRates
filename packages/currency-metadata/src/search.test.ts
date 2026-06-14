import { describe, expect, it } from "vitest";
import { searchCurrencies } from "./index";

describe("searchCurrencies", () => {
  it("finds currencies by partial name", () => {
    const codes = searchCurrencies("riyal").map((currency) => currency.code);
    expect(codes).toContain("SAR");
  });

  it("finds currencies by country", () => {
    const codes = searchCurrencies("japan").map((currency) => currency.code);
    expect(codes).toContain("JPY");
  });

  it("finds currencies by symbol", () => {
    const codes = searchCurrencies("€").map((currency) => currency.code);
    expect(codes).toContain("EUR");
  });

  it("ranks an exact code match first", () => {
    const results = searchCurrencies("usd");
    expect(results[0]?.code).toBe("USD");
  });

  it("excludes retired currencies unless requested", () => {
    expect(searchCurrencies("turkish lira").map((c) => c.code)).not.toContain("TRL");
    expect(searchCurrencies("turkish", { status: "all" }).map((c) => c.code)).toContain("TRL");
  });

  it("returns active currencies when the query is empty", () => {
    const results = searchCurrencies("", { limit: 5 });
    expect(results).toHaveLength(5);
  });
});
