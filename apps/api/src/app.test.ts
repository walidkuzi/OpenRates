import type { FetchLike, HttpResponse } from "@openrates/provider-interface";
import { loadConfig } from "@openrates/schemas";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { createApiEngine } from "./engine";

function json(body: unknown, status = 200): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function fakeFetch(): FetchLike {
  const rates: Record<string, number> = { "USD:EUR": 0.865421, "EUR:SAR": 4.05 };
  return async (url) => {
    const parsed = new URL(url);
    const base = (parsed.searchParams.get("base") ?? "").toUpperCase();
    const quote = (parsed.searchParams.get("symbols") ?? "").toUpperCase();
    const path = parsed.pathname.replace("/v1/", "");

    if (path === "currencies") {
      return json({ USD: "United States Dollar", EUR: "Euro" });
    }
    if (path.includes("..")) {
      return json({
        amount: 1,
        base,
        start_date: "2026-06-10",
        end_date: "2026-06-12",
        rates: { "2026-06-10": { [quote]: 0.864 }, "2026-06-12": { [quote]: 0.865421 } },
      });
    }
    if (path === "latest") {
      const rate = rates[`${base}:${quote}`];
      if (rate === undefined) {
        return json({ message: "not found" }, 404);
      }
      return json({ amount: 1, base, date: "2026-06-12", rates: { [quote]: rate } });
    }
    if (path === "2026-06-14") {
      return json({ amount: 1, base, date: "2026-06-12", rates: { [quote]: 0.865 } });
    }
    const rate = rates[`${base}:${quote}`];
    if (rate === undefined) {
      return json({ message: "not found" }, 404);
    }
    return json({ amount: 1, base, date: path, rates: { [quote]: rate } });
  };
}

function makeApp(env: Record<string, string | undefined> = {}): Promise<FastifyInstance> {
  const config = loadConfig(env);
  const engine = createApiEngine(config, { fetch: fakeFetch() });
  return buildApp({ engine, config });
}

describe("REST API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await makeApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("converts an amount and returns a success envelope", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/convert",
      payload: { amount: "1000.00", from: "USD", to: "EUR" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.requestId).toMatch(/^req_/);
    expect(body.generatedAt).toBeTypeOf("string");
    expect(body.data.convertedAmount).toBe("865.42");
    expect(body.data.rateType).toBe("official_reference");
    expect(body.data.isLive).toBe(false);
  });

  it("returns a rate for a pair", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/rates?base=USD&quote=EUR" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.rateType).toBe("official_reference");
    expect(body.data.provider).toBe("frankfurter");
  });

  it("honors compact response detail", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/rates?base=USD&quote=EUR&responseDetail=compact",
    });
    const body = response.json();
    expect(body.data.confidence).toBeUndefined();
    expect(body.data.rate).toBeTypeOf("string");
  });

  it("returns a time series", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/series?base=USD&quote=EUR&startDate=2026-06-10&endDate=2026-06-12",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.data.points)).toBe(true);
    expect(body.data.count).toBeGreaterThan(0);
  });

  it("uses the previous available date by default and fails strict requests", async () => {
    const lenient = await app.inject({
      method: "GET",
      url: "/v1/rates?base=USD&quote=EUR&date=2026-06-14",
    });
    expect(lenient.json().data.effectiveDate).toBe("2026-06-12");

    const strict = await app.inject({
      method: "GET",
      url: "/v1/rates?base=USD&quote=EUR&date=2026-06-14&datePolicy=strict",
    });
    expect(strict.statusCode).toBe(404);
    expect(strict.json().error.code).toBe("STRICT_DATE_NOT_AVAILABLE");
  });

  it("searches and looks up currencies", async () => {
    const search = await app.inject({ method: "GET", url: "/v1/currencies?query=riyal" });
    expect(search.json().data.currencies.some((c: { code: string }) => c.code === "SAR")).toBe(
      true,
    );

    const lookup = await app.inject({ method: "GET", url: "/v1/currencies/USD" });
    expect(lookup.json().data.code).toBe("USD");
  });

  it("returns typed errors for unknown and ambiguous currencies", async () => {
    const unknown = await app.inject({ method: "GET", url: "/v1/currencies/ZZZ" });
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json().error.code).toBe("UNSUPPORTED_CURRENCY");

    const ambiguous = await app.inject({ method: "GET", url: "/v1/currencies/dollar" });
    expect(ambiguous.json().error.code).toBe("AMBIGUOUS_CURRENCY");
    expect(ambiguous.json().error.details.candidates).toContain("USD");
  });

  it("lists providers and capabilities without secrets", async () => {
    const providers = await app.inject({ method: "GET", url: "/v1/providers" });
    const list = providers.json().data.providers;
    expect(list.some((p: { id: string }) => p.id === "frankfurter")).toBe(true);
    expect(JSON.stringify(list)).not.toContain("apiKey");

    const capabilities = await app.inject({ method: "GET", url: "/v1/capabilities" });
    expect(capabilities.json().data.service.name).toBe("openrates-agent");
  });

  it("reports a missing provider", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/providers/nope" });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });

  it("answers health and readiness probes", async () => {
    const health = await app.inject({ method: "GET", url: "/v1/health" });
    expect(health.json().data.status).toBe("ok");
    const ready = await app.inject({ method: "GET", url: "/v1/ready" });
    expect(ready.statusCode).toBe(200);
    expect(ready.json().data.ready).toBe(true);
  });

  it("serves an OpenAPI document and docs", async () => {
    const openapi = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(openapi.statusCode).toBe(200);
    const spec = openapi.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/v1/convert"]).toBeDefined();
    expect(spec.paths["/v1/rates"]).toBeDefined();

    const docs = await app.inject({ method: "GET", url: "/docs" });
    expect(docs.statusCode).toBeLessThan(400);
  });

  it("validates request input", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/rates?base=USD" });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });

  it("rejects an invalid amount", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/convert",
      payload: { amount: "abc", from: "USD", to: "EUR" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_AMOUNT");
  });

  it("sets security headers and a request id", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.json().requestId).toMatch(/^req_/);
  });

  it("returns a 404 envelope for unknown routes", async () => {
    const response = await app.inject({ method: "GET", url: "/nope" });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });
});

describe("REST API authentication", () => {
  it("requires an API key when enabled but exempts health", async () => {
    const app = await makeApp({
      OPENRATES_API_AUTH_ENABLED: "true",
      OPENRATES_API_KEYS: "secret-key",
    });

    const denied = await app.inject({ method: "GET", url: "/v1/rates?base=USD&quote=EUR" });
    expect(denied.statusCode).toBe(401);

    const allowed = await app.inject({
      method: "GET",
      url: "/v1/rates?base=USD&quote=EUR",
      headers: { "x-api-key": "secret-key" },
    });
    expect(allowed.statusCode).toBe(200);

    const health = await app.inject({ method: "GET", url: "/v1/health" });
    expect(health.statusCode).toBe(200);

    await app.close();
  });
});

describe("REST API rate limiting", () => {
  it("limits requests when enabled", async () => {
    const app = await makeApp({
      OPENRATES_RATE_LIMIT_ENABLED: "true",
      OPENRATES_RATE_LIMIT_PER_MINUTE: "1",
    });

    const first = await app.inject({ method: "GET", url: "/v1/health" });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: "GET", url: "/v1/health" });
    expect(second.statusCode).toBe(429);

    await app.close();
  });
});
