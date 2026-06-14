import { describe, expect, it } from "vitest";
import {
  type FetchLike,
  HttpError,
  HttpNetworkError,
  type HttpResponse,
  HttpTimeoutError,
  httpGetJson,
} from "./http";

function response(body: unknown, status = 200): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

describe("httpGetJson", () => {
  it("returns parsed JSON on success", async () => {
    const fetch: FetchLike = async () => response({ ok: true });
    expect(await httpGetJson("http://example.test", { fetch, retries: 0 })).toEqual({ ok: true });
  });

  it("retries a retryable status and then succeeds", async () => {
    let calls = 0;
    const fetch: FetchLike = async () => {
      calls += 1;
      return calls < 2 ? response({}, 500) : response({ ok: true });
    };
    const result = await httpGetJson("http://example.test", { fetch, retries: 2, backoffMs: 1 });
    expect(result).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("throws HttpError after exhausting retries", async () => {
    const fetch: FetchLike = async () => response({ message: "boom" }, 503);
    await expect(
      httpGetJson("http://example.test", { fetch, retries: 1, backoffMs: 1 }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("does not retry a non-retryable status", async () => {
    let calls = 0;
    const fetch: FetchLike = async () => {
      calls += 1;
      return response({}, 404);
    };
    await expect(
      httpGetJson("http://example.test", { fetch, retries: 3, backoffMs: 1 }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(calls).toBe(1);
  });

  it("maps a timeout to HttpTimeoutError", async () => {
    const fetch: FetchLike = (_url, init) =>
      new Promise<HttpResponse>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    await expect(
      httpGetJson("http://example.test", { fetch, timeoutMs: 5, retries: 0 }),
    ).rejects.toBeInstanceOf(HttpTimeoutError);
  });

  it("wraps a network failure in HttpNetworkError after retries", async () => {
    const fetch: FetchLike = async () => {
      throw new Error("dns failure");
    };
    await expect(
      httpGetJson("http://example.test", { fetch, retries: 1, backoffMs: 1 }),
    ).rejects.toBeInstanceOf(HttpNetworkError);
  });
});
