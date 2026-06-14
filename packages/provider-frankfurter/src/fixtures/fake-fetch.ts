import type { FetchLike, HttpResponse } from "@openrates/provider-interface";

export function jsonResponse(body: unknown, status = 200): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

export interface FrankfurterFakeOptions {
  latest?: unknown;
  series?: unknown;
  currencies?: unknown;
  historicalByDate?: Record<string, unknown>;
  defaultHistorical?: unknown;
  notFoundSymbols?: string[];
}

function symbolsFrom(url: string): string | null {
  return new URL(url).searchParams.get("symbols");
}

function dateFromPath(url: string): string {
  const pathname = new URL(url).pathname;
  return pathname.replace("/v1/", "");
}

export function createFrankfurterFakeFetch(options: FrankfurterFakeOptions): FetchLike {
  return async (url) => {
    const symbols = symbolsFrom(url);
    if (symbols && options.notFoundSymbols?.includes(symbols)) {
      return jsonResponse({ message: "not found" }, 404);
    }

    if (url.includes("/v1/currencies")) {
      return jsonResponse(options.currencies ?? {});
    }
    if (url.includes("..")) {
      return jsonResponse(options.series ?? {});
    }
    if (url.includes("/v1/latest")) {
      return jsonResponse(options.latest ?? {});
    }

    const date = dateFromPath(url).split("?")[0] ?? "";
    const historical = options.historicalByDate?.[date] ?? options.defaultHistorical;
    return jsonResponse(historical ?? {});
  };
}

export function statusFetch(status: number, body: unknown = { message: "error" }): FetchLike {
  return async () => jsonResponse(body, status);
}

export function timeoutFetch(): FetchLike {
  return (_url, init) =>
    new Promise<HttpResponse>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
}
