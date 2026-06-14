import { MemoryCache } from "@openrates/cache";
import { FrankfurterProvider } from "@openrates/provider-frankfurter";
import type {
  ExchangeRateProvider,
  FetchLike,
  HttpResponse,
  ProviderCapabilities,
} from "@openrates/provider-interface";
import { OpenRatesError } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { RateEngine, createRateEngine } from "./engine";
import { ProviderRegistry } from "./registry";

const NOW = "2026-06-15T12:00:00Z";

function json(body: unknown, status = 200): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

interface FakeOptions {
  latestDate?: string;
  rates?: Record<string, number>;
  historical?: Record<string, { date: string; rate: number }>;
  series?: Record<string, Record<string, number>>;
  counter?: { count: number };
}

function fakeFetch(options: FakeOptions): FetchLike {
  return async (url) => {
    if (options.counter) {
      options.counter.count += 1;
    }
    const parsed = new URL(url);
    const base = (parsed.searchParams.get("base") ?? "").toUpperCase();
    const quote = (parsed.searchParams.get("symbols") ?? "").toUpperCase();
    const path = parsed.pathname.replace("/v1/", "");
    const rates = options.rates ?? {};

    if (path === "currencies") {
      return json({ USD: "United States Dollar", EUR: "Euro" });
    }
    if (path.includes("..")) {
      const [start = "", end = ""] = path.split("..");
      const map = options.series?.[`${base}:${quote}`] ?? {};
      const seriesRates: Record<string, Record<string, number>> = {};
      for (const [date, rate] of Object.entries(map)) {
        seriesRates[date] = { [quote]: rate };
      }
      return json({ amount: 1, base, start_date: start, end_date: end, rates: seriesRates });
    }
    if (path === "latest") {
      const rate = rates[`${base}:${quote}`];
      if (rate === undefined) {
        return json({ message: "not found" }, 404);
      }
      return json({
        amount: 1,
        base,
        date: options.latestDate ?? "2026-06-12",
        rates: { [quote]: rate },
      });
    }

    const historical = options.historical?.[`${path}:${base}:${quote}`];
    if (historical) {
      return json({ amount: 1, base, date: historical.date, rates: { [quote]: historical.rate } });
    }
    const fallbackRate = rates[`${base}:${quote}`];
    if (fallbackRate === undefined) {
      return json({ message: "not found" }, 404);
    }
    return json({ amount: 1, base, date: path, rates: { [quote]: fallbackRate } });
  };
}

const FULL_CAPS: ProviderCapabilities = {
  supportedModes: ["official"],
  supportedRateTypes: ["official_reference"],
  supportsHistorical: true,
  supportsTimeSeries: true,
  supportsIntraday: false,
  supportsProviderTimestamp: false,
  requiresApiKey: false,
};

class FailingProvider implements ExchangeRateProvider {
  readonly id = "failing";
  readonly name = "Failing";
  capabilities(): Promise<ProviderCapabilities> {
    return Promise.resolve(FULL_CAPS);
  }
  healthCheck() {
    return Promise.resolve({ status: "unavailable" as const, checkedAt: NOW });
  }
  getLatestRate(): Promise<never> {
    return Promise.reject(new OpenRatesError({ code: "PROVIDER_UNAVAILABLE", message: "down" }));
  }
  getHistoricalRate(): Promise<never> {
    return Promise.reject(new OpenRatesError({ code: "PROVIDER_UNAVAILABLE", message: "down" }));
  }
  getTimeSeries(): Promise<never> {
    return Promise.reject(new OpenRatesError({ code: "PROVIDER_UNAVAILABLE", message: "down" }));
  }
  listCurrencies() {
    return Promise.resolve([]);
  }
  normalizeError(error: unknown): OpenRatesError {
    return error instanceof OpenRatesError
      ? error
      : new OpenRatesError({ code: "INTERNAL_ERROR", message: "x" });
  }
}

function buildEngine(fetch: FetchLike): RateEngine {
  const registry = new ProviderRegistry();
  registry.register({
    provider: new FrankfurterProvider({ fetch, retries: 0 }),
    trust: 1,
    order: 1,
  });
  return new RateEngine({ registry, cache: new MemoryCache() });
}

describe("RateEngine official conversions", () => {
  it("converts USD to EUR with a daily official rate", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.865421 } }));
    const result = await engine.convert({ amount: "1000.00", base: "USD", quote: "EUR", now: NOW });
    expect(result.conversion.result.roundedAmount).toBe("865.42");
    expect(result.conversion.rate.rateType).toBe("official_reference");
    expect(result.conversion.rate.isLive).toBe(false);
    expect(result.conversion.rate.freshnessClass).toBe("latest_business_day");
    expect(result.route.selectedProvider).toBe("frankfurter");
    expect(result.route.mode).toBe("official");
  });

  it("converts EUR to SAR", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "EUR:SAR": 4.05 } }));
    const result = await engine.convert({ amount: "100", base: "EUR", quote: "SAR", now: NOW });
    expect(result.conversion.result.roundedAmount).toBe("405.00");
  });

  it("converts USD to TRY", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:TRY": 38.5 } }));
    const result = await engine.convert({ amount: "100", base: "USD", quote: "TRY", now: NOW });
    expect(result.conversion.result.roundedAmount).toBe("3850.00");
  });

  it("converts USD to AFN", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:AFN": 70.25 } }));
    const result = await engine.convert({ amount: "10", base: "USD", quote: "AFN", now: NOW });
    expect(result.conversion.result.roundedAmount).toBe("702.50");
  });

  it("returns rate 1 for an identical currency pair without a provider call", async () => {
    const engine = buildEngine(fakeFetch({ rates: {} }));
    const result = await engine.convert({ amount: "500.00", base: "USD", quote: "USD", now: NOW });
    expect(result.conversion.result.roundedAmount).toBe("500.00");
    expect(result.conversion.rate.rate).toBe("1");
    expect(result.route.selectedProvider).toBe("identity");
  });

  it("returns zero for a zero amount", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.865421 } }));
    const result = await engine.convert({ amount: "0", base: "USD", quote: "EUR", now: NOW });
    expect(result.conversion.result.roundedAmount).toBe("0.00");
  });
});

describe("RateEngine date policies", () => {
  it("uses the previous available date on a weekend", async () => {
    const engine = buildEngine(
      fakeFetch({ historical: { "2026-06-14:USD:EUR": { date: "2026-06-12", rate: 0.865 } } }),
    );
    const result = await engine.getRate({
      base: "USD",
      quote: "EUR",
      date: "2026-06-14",
      datePolicy: "previous_available",
      now: NOW,
    });
    expect(result.rate.effectiveDate).toBe("2026-06-12");
    expect(result.rate.freshnessClass).toBe("historical_previous_available_date");
  });

  it("fails strict requests when the exact date was not published", async () => {
    const engine = buildEngine(
      fakeFetch({ historical: { "2026-06-14:USD:EUR": { date: "2026-06-12", rate: 0.865 } } }),
    );
    await expect(
      engine.getRate({
        base: "USD",
        quote: "EUR",
        date: "2026-06-14",
        datePolicy: "strict",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "STRICT_DATE_NOT_AVAILABLE" });
  });
});

describe("RateEngine currency resolution", () => {
  it("rejects an unsupported currency", async () => {
    const engine = buildEngine(fakeFetch({ rates: {} }));
    await expect(engine.getRate({ base: "USD", quote: "ZZZ", now: NOW })).rejects.toMatchObject({
      code: "UNSUPPORTED_CURRENCY",
    });
  });

  it("rejects an ambiguous currency with candidates", async () => {
    const engine = buildEngine(fakeFetch({ rates: {} }));
    await expect(engine.getRate({ base: "dollar", quote: "EUR", now: NOW })).rejects.toMatchObject({
      code: "AMBIGUOUS_CURRENCY",
    });
  });
});

describe("RateEngine fallback", () => {
  function engineWithFailingPrimary(): RateEngine {
    const registry = new ProviderRegistry();
    registry.register({ provider: new FailingProvider(), order: 0 });
    registry.register({
      provider: new FrankfurterProvider({
        fetch: fakeFetch({ rates: { "USD:EUR": 0.86 } }),
        retries: 0,
      }),
      trust: 1,
      order: 1,
    });
    return new RateEngine({ registry, cache: new MemoryCache() });
  }

  it("falls back visibly when the primary provider fails", async () => {
    const result = await engineWithFailingPrimary().getRate({
      base: "USD",
      quote: "EUR",
      now: NOW,
    });
    expect(result.route.fallbackUsed).toBe(true);
    expect(result.route.attempted).toEqual(["failing", "frankfurter"]);
    expect(result.rate.providerId).toBe("frankfurter");
    expect(result.rate.warnings.some((warning) => warning.includes("fallback"))).toBe(true);
  });

  it("does not fall back when fallback is disabled", async () => {
    await expect(
      engineWithFailingPrimary().getRate({
        base: "USD",
        quote: "EUR",
        allowFallback: false,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});

describe("RateEngine cache", () => {
  it("serves a second identical request from cache", async () => {
    const counter = { count: 0 };
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 }, counter }));
    const first = await engine.getRate({ base: "USD", quote: "EUR", now: NOW });
    const second = await engine.getRate({ base: "USD", quote: "EUR", now: "2026-06-15T12:01:00Z" });
    expect(first.cache.hit).toBe(false);
    expect(second.cache.hit).toBe(true);
    expect(second.cache.ageSeconds).toBeGreaterThanOrEqual(0);
    expect(counter.count).toBe(1);
  });
});

describe("RateEngine stale protection", () => {
  it("refuses to return a rate older than the allowed maximum age", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    await expect(
      engine.getRate({
        base: "USD",
        quote: "EUR",
        maxAgeSeconds: 3600,
        allowFallback: false,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "RATE_TOO_STALE" });
  });
});

describe("RateEngine mode resolution", () => {
  it("reports when no market provider is configured", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    await expect(
      engine.getRate({ base: "USD", quote: "EUR", mode: "market", now: NOW }),
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
  });
});

describe("RateEngine confidence", () => {
  it("scores official reference higher for reporting than for general use", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    const reporting = await engine.getRate({
      base: "USD",
      quote: "EUR",
      useCase: "reporting",
      now: NOW,
    });
    const general = await engine.getRate({ base: "USD", quote: "EUR", now: NOW });
    expect(reporting.rate.confidenceLabel).toBe("high");
    expect(general.rate.confidenceLabel).toBe("medium");
  });
});

describe("RateEngine time series", () => {
  it("returns ordered points", async () => {
    const engine = buildEngine(
      fakeFetch({
        series: {
          "USD:EUR": { "2026-06-10": 0.864, "2026-06-11": 0.8655, "2026-06-12": 0.865421 },
        },
      }),
    );
    const result = await engine.getSeries({
      base: "USD",
      quote: "EUR",
      startDate: "2026-06-10",
      endDate: "2026-06-12",
      now: NOW,
    });
    expect(result.points.map((point) => point.date)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
    expect(result.points.every((point) => point.filled === false)).toBe(true);
  });

  it("fills missing days when fillPolicy is previous", async () => {
    const engine = buildEngine(
      fakeFetch({ series: { "USD:EUR": { "2026-06-10": 0.864, "2026-06-12": 0.865421 } } }),
    );
    const result = await engine.getSeries({
      base: "USD",
      quote: "EUR",
      startDate: "2026-06-10",
      endDate: "2026-06-12",
      fillPolicy: "previous",
      now: NOW,
    });
    expect(result.points.map((point) => point.date)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
    expect(result.points[1]).toMatchObject({ date: "2026-06-11", rate: "0.864", filled: true });
  });

  it("validates the date range", async () => {
    const engine = buildEngine(fakeFetch({}));
    await expect(
      engine.getSeries({
        base: "USD",
        quote: "EUR",
        startDate: "bad",
        endDate: "2026-06-12",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "INVALID_DATE" });
    await expect(
      engine.getSeries({
        base: "USD",
        quote: "EUR",
        startDate: "2026-06-12",
        endDate: "2026-06-10",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_DATE_RANGE" });
  });

  it("reports when no provider supports time series", async () => {
    const registry = new ProviderRegistry();
    registry.register({
      provider: {
        id: "noseries",
        name: "No Series",
        capabilities: () => Promise.resolve({ ...FULL_CAPS, supportsTimeSeries: false }),
        healthCheck: () => Promise.resolve({ status: "healthy" as const, checkedAt: NOW }),
        getLatestRate: () => Promise.reject(new Error("x")),
        getHistoricalRate: () => Promise.reject(new Error("x")),
        getTimeSeries: () => Promise.reject(new Error("x")),
        listCurrencies: () => Promise.resolve([]),
        normalizeError: (error: unknown) =>
          error instanceof OpenRatesError
            ? error
            : new OpenRatesError({ code: "INTERNAL_ERROR", message: "x" }),
      },
    });
    const engine = new RateEngine({ registry, cache: new MemoryCache() });
    await expect(
      engine.getSeries({
        base: "USD",
        quote: "EUR",
        startDate: "2026-06-10",
        endDate: "2026-06-12",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
  });

  it("serves a repeated series request from cache", async () => {
    const counter = { count: 0 };
    const engine = buildEngine(
      fakeFetch({ series: { "USD:EUR": { "2026-06-10": 0.864 } }, counter }),
    );
    await engine.getSeries({
      base: "USD",
      quote: "EUR",
      startDate: "2026-06-10",
      endDate: "2026-06-10",
      now: NOW,
    });
    const second = await engine.getSeries({
      base: "USD",
      quote: "EUR",
      startDate: "2026-06-10",
      endDate: "2026-06-10",
      now: NOW,
    });
    expect(second.cache.hit).toBe(true);
    expect(counter.count).toBe(1);
  });
});

describe("RateEngine input validation and selection", () => {
  it("rejects an invalid amount", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    await expect(
      engine.convert({ amount: "abc", base: "USD", quote: "EUR", now: NOW }),
    ).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
  });

  it("rejects an invalid date", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    await expect(
      engine.getRate({ base: "USD", quote: "EUR", date: "2026/06/14", now: NOW }),
    ).rejects.toMatchObject({ code: "INVALID_DATE" });
  });

  it("honors an explicitly requested provider", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    const result = await engine.getRate({
      base: "USD",
      quote: "EUR",
      provider: "frankfurter",
      now: NOW,
    });
    expect(result.route.selectedProvider).toBe("frankfurter");
  });

  it("rejects an unknown explicit provider", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    await expect(
      engine.getRate({ base: "USD", quote: "EUR", provider: "nope", now: NOW }),
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
  });

  it("rejects an explicit provider that does not support the mode", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    await expect(
      engine.getRate({
        base: "USD",
        quote: "EUR",
        provider: "frankfurter",
        mode: "market",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MODE" });
  });

  it("relaxes auto market selection to official when no market provider exists", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    const result = await engine.getRate({
      base: "USD",
      quote: "EUR",
      useCase: "treasury",
      now: NOW,
    });
    expect(result.route.mode).toBe("official");
  });

  it("surfaces an unsupported pair from the provider", async () => {
    const engine = buildEngine(fakeFetch({ rates: {} }));
    await expect(engine.getRate({ base: "USD", quote: "EUR", now: NOW })).rejects.toMatchObject({
      code: "UNSUPPORTED_PAIR",
    });
  });

  it("refuses a stale rate even with fallback allowed", async () => {
    const engine = buildEngine(fakeFetch({ rates: { "USD:EUR": 0.86 } }));
    await expect(
      engine.getRate({ base: "USD", quote: "EUR", maxAgeSeconds: 3600, now: NOW }),
    ).rejects.toMatchObject({ code: "RATE_TOO_STALE" });
  });

  it("can be created through the factory", async () => {
    const registry = new ProviderRegistry();
    registry.register({
      provider: new FrankfurterProvider({
        fetch: fakeFetch({ rates: { "USD:EUR": 0.86 } }),
        retries: 0,
      }),
      trust: 1,
    });
    const engine = createRateEngine({ registry, cache: new MemoryCache() });
    const result = await engine.getRate({ base: "USD", quote: "EUR", now: NOW });
    expect(result.rate.providerId).toBe("frankfurter");
  });
});
