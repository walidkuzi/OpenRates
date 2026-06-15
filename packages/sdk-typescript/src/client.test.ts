import { buildApp, createApiEngine } from "@openrates/api";
import { loadConfig } from "@openrates/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OpenRatesClient } from "./client";
import { OpenRatesApiError } from "./errors";
import type { SdkFetch, SdkResponse } from "./types";

interface InjectResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

function fakeFrankfurter(): (url: string) => Promise<InjectResponse> {
  const rates: Record<string, number> = { "USD:EUR": 0.865421 };
  return async (url) => {
    const parsed = new URL(url);
    const base = (parsed.searchParams.get("base") ?? "").toUpperCase();
    const quote = (parsed.searchParams.get("symbols") ?? "").toUpperCase();
    const path = parsed.pathname.replace("/v1/", "");
    const body =
      path === "currencies"
        ? { USD: "United States Dollar", EUR: "Euro" }
        : path === "latest" && rates[`${base}:${quote}`] !== undefined
          ? { amount: 1, base, date: "2026-06-12", rates: { [quote]: rates[`${base}:${quote}`] } }
          : { message: "not found" };
    const status = JSON.stringify(body).includes("not found") ? 404 : 200;
    return {
      ok: status < 400,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
}

function jsonResponse(body: unknown, status: number): SdkResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("OpenRatesClient against the REST API", () => {
  let client: OpenRatesClient;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const config = loadConfig({});
    const engine = createApiEngine(config, { fetch: fakeFrankfurter() });
    const app = await buildApp({ engine, config });
    close = () => app.close();
    const injectFetch: SdkFetch = async (url, init) => {
      const path = url.replace("http://test.local", "");
      const response = await app.inject({
        method: (init?.method ?? "GET") as "GET",
        url: path,
        headers: init?.headers,
        payload: init?.body,
      });
      return {
        ok: response.statusCode >= 200 && response.statusCode < 300,
        status: response.statusCode,
        json: async () => response.json(),
        text: async () => response.body,
      };
    };
    client = new OpenRatesClient({ baseUrl: "http://test.local", fetch: injectFetch });
  });

  afterAll(async () => {
    await close();
  });

  it("gets a rate", async () => {
    const rate = await client.getRate({ base: "USD", quote: "EUR" });
    expect(rate.rateType).toBe("official_reference");
    expect(rate.provider).toBe("frankfurter");
    expect(rate.isLive).toBe(false);
  });

  it("converts an amount", async () => {
    const result = await client.convert({ amount: "1000.00", from: "USD", to: "EUR" });
    expect(result.convertedAmount).toBe("865.42");
  });

  it("lists currencies", async () => {
    const result = (await client.listCurrencies({ query: "riyal" })) as {
      currencies: Array<{ code: string }>;
    };
    expect(result.currencies.some((currency) => currency.code === "SAR")).toBe(true);
  });

  it("throws a typed error for an unsupported currency", async () => {
    await expect(client.getRate({ base: "USD", quote: "ZZZ" })).rejects.toBeInstanceOf(
      OpenRatesApiError,
    );
    try {
      await client.getRate({ base: "USD", quote: "ZZZ" });
    } catch (error) {
      expect(error).toBeInstanceOf(OpenRatesApiError);
      expect((error as OpenRatesApiError).code).toBe("UNSUPPORTED_CURRENCY");
      expect((error as OpenRatesApiError).status).toBe(400);
      expect((error as OpenRatesApiError).requestId).toMatch(/^req_/);
    }
  });
});

describe("OpenRatesClient transport behavior", () => {
  it("retries a retryable status on safe requests", async () => {
    let calls = 0;
    const fetch: SdkFetch = async () => {
      calls += 1;
      if (calls < 2) {
        return jsonResponse({ success: false, error: { code: "PROVIDER_UNAVAILABLE", message: "down", retryable: true } }, 502);
      }
      return jsonResponse({ success: true, data: { ok: true }, requestId: "req_1", generatedAt: "now" }, 200);
    };
    const client = new OpenRatesClient({ baseUrl: "http://test.local", fetch, retries: 2 });
    const result = (await client.health()) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it("does not retry POST requests", async () => {
    let calls = 0;
    const fetch: SdkFetch = async () => {
      calls += 1;
      return jsonResponse({ success: false, error: { code: "INVALID_AMOUNT", message: "bad", retryable: false } }, 400);
    };
    const client = new OpenRatesClient({ baseUrl: "http://test.local", fetch, retries: 2 });
    await expect(client.convert({ amount: "x", from: "USD", to: "EUR" })).rejects.toBeInstanceOf(
      OpenRatesApiError,
    );
    expect(calls).toBe(1);
  });

  it("maps a timeout to a typed error", async () => {
    const fetch: SdkFetch = (_url, init) =>
      new Promise<SdkResponse>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    const client = new OpenRatesClient({ baseUrl: "http://test.local", fetch, timeoutMs: 5, retries: 0 });
    await expect(client.health()).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
  });
});
