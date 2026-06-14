import { OpenRatesError } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { FrankfurterProvider } from "./adapter";
import currencies from "./fixtures/currencies.json";
import { createFrankfurterFakeFetch } from "./fixtures/fake-fetch";
import historicalExact from "./fixtures/historical-exact.json";
import historicalWeekend from "./fixtures/historical-weekend.json";
import latest from "./fixtures/latest.json";
import series from "./fixtures/series.json";

function provider(fetch = createFrankfurterFakeFetch({ latest, series, currencies })) {
  return new FrankfurterProvider({ fetch, retries: 0 });
}

describe("FrankfurterProvider latest", () => {
  it("returns a normalized official reference rate", async () => {
    const rate = await provider().getLatestRate({ base: "USD", quote: "EUR" });
    expect(rate).toMatchObject({
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      rate: "0.865421",
      rateType: "official_reference",
      effectiveDate: "2026-06-12",
      calculationMethod: "direct",
      providerId: "frankfurter",
    });
    expect(rate.observedAt).toBeUndefined();
  });

  it("throws RATE_NOT_AVAILABLE when the quote is missing from the response", async () => {
    await expect(provider().getLatestRate({ base: "USD", quote: "GBP" })).rejects.toMatchObject({
      code: "RATE_NOT_AVAILABLE",
    });
  });
});

describe("FrankfurterProvider capabilities", () => {
  it("reports official, non-intraday, key-free capabilities", async () => {
    const capabilities = await provider().capabilities();
    expect(capabilities.supportsIntraday).toBe(false);
    expect(capabilities.supportsProviderTimestamp).toBe(false);
    expect(capabilities.requiresApiKey).toBe(false);
    expect(capabilities.supportsHistorical).toBe(true);
    expect(capabilities.supportedRateTypes).toContain("official_reference");
  });
});

describe("FrankfurterProvider historical date policy", () => {
  it("uses the previous available date by default on a weekend", async () => {
    const fetch = createFrankfurterFakeFetch({ defaultHistorical: historicalWeekend });
    const rate = await provider(fetch).getHistoricalRate({
      base: "USD",
      quote: "EUR",
      date: "2026-06-14",
      datePolicy: "previous_available",
    });
    expect(rate.effectiveDate).toBe("2026-06-12");
  });

  it("fails with STRICT_DATE_NOT_AVAILABLE when strict and no rate was published", async () => {
    const fetch = createFrankfurterFakeFetch({ defaultHistorical: historicalWeekend });
    await expect(
      provider(fetch).getHistoricalRate({
        base: "USD",
        quote: "EUR",
        date: "2026-06-14",
        datePolicy: "strict",
      }),
    ).rejects.toMatchObject({
      code: "STRICT_DATE_NOT_AVAILABLE",
    });
  });

  it("returns the exact date when strict and the rate exists", async () => {
    const fetch = createFrankfurterFakeFetch({
      historicalByDate: { "2026-06-10": historicalExact },
    });
    const rate = await provider(fetch).getHistoricalRate({
      base: "USD",
      quote: "EUR",
      date: "2026-06-10",
      datePolicy: "strict",
    });
    expect(rate.effectiveDate).toBe("2026-06-10");
  });
});

describe("FrankfurterProvider time series", () => {
  it("returns ordered points marked as not filled", async () => {
    const result = await provider().getTimeSeries({
      base: "USD",
      quote: "EUR",
      startDate: "2026-06-10",
      endDate: "2026-06-12",
    });
    expect(result.points.map((point) => point.date)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
    expect(result.points.every((point) => point.filled === false)).toBe(true);
    expect(result.points[2]?.rate).toBe("0.865421");
  });
});

describe("FrankfurterProvider currencies and health", () => {
  it("lists currencies with names", async () => {
    const list = await provider().listCurrencies();
    expect(list.find((currency) => currency.code === "USD")?.name).toBe("United States Dollar");
  });

  it("reports healthy status with latency", async () => {
    const times = [1000, 1050];
    let index = 0;
    const instance = new FrankfurterProvider({
      fetch: createFrankfurterFakeFetch({ currencies }),
      retries: 0,
      now: () => times[index++] ?? 2000,
    });
    const health = await instance.healthCheck();
    expect(health.status).toBe("healthy");
    expect(health.latencyMs).toBe(50);
    expect(health.checkedAt).toContain("T");
  });

  it("reports unavailable status when the provider fails", async () => {
    const instance = new FrankfurterProvider({
      fetch: createFrankfurterFakeFetch({ latest: {}, notFoundSymbols: [] }),
      retries: 0,
    });
    const failing = new FrankfurterProvider({
      fetch: () => Promise.reject(new Error("down")),
      retries: 0,
    });
    expect((await instance.capabilities()).requiresApiKey).toBe(false);
    const health = await failing.healthCheck();
    expect(health.status).toBe("unavailable");
  });
});

describe("FrankfurterProvider error normalization", () => {
  it("passes through an existing OpenRatesError", () => {
    const original = new OpenRatesError({ code: "RATE_NOT_AVAILABLE", message: "x" });
    expect(provider().normalizeError(original)).toBe(original);
  });
});
