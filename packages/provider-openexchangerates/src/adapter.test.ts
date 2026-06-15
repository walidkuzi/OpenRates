import { HttpError, HttpTimeoutError } from "@openrates/provider-interface";
import { describe, expect, it } from "vitest";
import { OpenExchangeRatesProvider } from "./adapter";

const FIXTURE_LATEST = {
  timestamp: 1_749_945_600,
  base: "USD",
  rates: { EUR: 0.9152, GBP: 0.7891, JPY: 157.42 },
};

const FIXTURE_HISTORICAL = {
  timestamp: 1_749_600_000,
  base: "USD",
  rates: { EUR: 0.9100, GBP: 0.7850, JPY: 156.80 },
};

const FIXTURE_SERIES = {
  start_date: "2026-06-01",
  end_date: "2026-06-05",
  base: "USD",
  rates: {
    "2026-06-01": { EUR: 0.9100 },
    "2026-06-02": { EUR: 0.9110 },
    "2026-06-03": { EUR: 0.9120 },
    "2026-06-04": { EUR: 0.9130 },
    "2026-06-05": { EUR: 0.9140 },
  },
};

const FIXTURE_CURRENCIES = { USD: "United States Dollar", EUR: "Euro", GBP: "British Pound" };

function makeProvider(fixture: Record<string, unknown> = {}): OpenExchangeRatesProvider {
  const mockFetch = async (url: string): Promise<Response> => {
    let data: unknown;
    if (url.includes("/latest")) data = fixture.latest ?? FIXTURE_LATEST;
    else if (url.includes("/historical")) data = fixture.historical ?? FIXTURE_HISTORICAL;
    else if (url.includes("/time-series")) data = fixture.series ?? FIXTURE_SERIES;
    else if (url.includes("/currencies")) data = fixture.currencies ?? FIXTURE_CURRENCIES;
    else data = {};
    return new Response(JSON.stringify(data), { status: 200 });
  };
  return new OpenExchangeRatesProvider({
    apiKey: "test_key",
    fetch: mockFetch,
    now: () => 1_749_945_700_000,
  });
}

describe("OpenExchangeRatesProvider", () => {
  it("reports capabilities as market mode with timestamp support", async () => {
    const provider = makeProvider();
    const caps = await provider.capabilities();
    expect(caps.supportedModes).toContain("market");
    expect(caps.supportsProviderTimestamp).toBe(true);
    expect(caps.requiresApiKey).toBe(true);
    expect(caps.supportsIntraday).toBe(false);
  });

  it("returns a market_indicative rate with publishedAt from timestamp", async () => {
    const provider = makeProvider();
    const rate = await provider.getLatestRate({ base: "USD", quote: "EUR" });
    expect(rate.rateType).toBe("market_indicative");
    expect(rate.providerId).toBe("openexchangerates");
    expect(typeof rate.rate).toBe("string");
    expect(Number(rate.rate)).toBeGreaterThan(0);
    expect(rate.publishedAt).toBeDefined();
    expect(rate.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns a rate for a historical date", async () => {
    const provider = makeProvider();
    const rate = await provider.getHistoricalRate({ base: "USD", quote: "EUR", date: "2026-06-05", datePolicy: "previous_available" });
    expect(rate.rateType).toBe("market_indicative");
    expect(Number(rate.rate)).toBeGreaterThan(0);
  });

  it("returns a time series with the correct number of points", async () => {
    const provider = makeProvider();
    const series = await provider.getTimeSeries({
      base: "USD",
      quote: "EUR",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
    });
    expect(series.rateType).toBe("market_indicative");
    expect(series.points).toHaveLength(5);
    expect(series.points[0]?.filled).toBe(false);
  });

  it("lists currencies", async () => {
    const provider = makeProvider();
    const currencies = await provider.listCurrencies();
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies.some((c) => c.code === "USD")).toBe(true);
  });

  it("throws RATE_NOT_AVAILABLE when quote is missing from response", async () => {
    const provider = makeProvider({ latest: { timestamp: 1_749_945_600, base: "USD", rates: {} } });
    await expect(provider.getLatestRate({ base: "USD", quote: "EUR" })).rejects.toMatchObject({
      code: "RATE_NOT_AVAILABLE",
    });
  });

  it("normalizes HTTP 401 to PROVIDER_AUTHENTICATION_FAILED", () => {
    const provider = makeProvider();
    const error = new HttpError(401, "Unauthorized", "");
    const normalized = provider.normalizeError(error);
    expect(normalized.code).toBe("PROVIDER_AUTHENTICATION_FAILED");
  });

  it("normalizes timeout to PROVIDER_TIMEOUT", () => {
    const provider = makeProvider();
    const error = new HttpTimeoutError("timeout");
    const normalized = provider.normalizeError(error);
    expect(normalized.code).toBe("PROVIDER_TIMEOUT");
  });
});
