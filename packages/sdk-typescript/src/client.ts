import { OpenRatesApiError } from "./errors";
import type {
  ConversionResponse,
  ConvertParams,
  CurrenciesParams,
  RateParams,
  RateResponse,
  RequestOptions,
  SdkFetch,
  SeriesParams,
  SeriesResponse,
} from "./types";

export interface OpenRatesClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetch?: SdkFetch;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

type QueryValue = string | number | boolean | undefined;

function resolveFetch(provided?: SdkFetch): SdkFetch {
  if (provided) {
    return provided;
  }
  const globalFetch = (globalThis as unknown as { fetch?: SdkFetch }).fetch;
  if (!globalFetch) {
    throw new Error("No fetch implementation is available; pass one in OpenRatesClientOptions.");
  }
  return globalFetch;
}

function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function withTimeout(timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort(external?.reason);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  if (external) {
    if (external.aborted) {
      controller.abort(external.reason);
    } else {
      external.addEventListener("abort", onAbort, { once: true });
    }
  }
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onAbort);
    },
  };
}

function isSuccessEnvelope(value: unknown): value is { success: true; data: unknown } {
  return (
    typeof value === "object" && value !== null && (value as { success?: unknown }).success === true
  );
}

function toApiError(payload: unknown, status: number): OpenRatesApiError {
  if (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { success?: unknown }).success === false
  ) {
    const envelope = payload as {
      error?: {
        code?: string;
        message?: string;
        retryable?: boolean;
        details?: Record<string, unknown>;
        suggestion?: string;
      };
      requestId?: string;
    };
    const error = envelope.error ?? {};
    return new OpenRatesApiError({
      code: error.code ?? "INTERNAL_ERROR",
      message: error.message ?? "Request failed.",
      status,
      retryable: error.retryable ?? false,
      requestId: envelope.requestId,
      details: error.details,
      suggestion: error.suggestion,
    });
  }
  return new OpenRatesApiError({
    code: "INTERNAL_ERROR",
    message: `Unexpected response with status ${status}.`,
    status,
    retryable: status >= 500,
  });
}

export class OpenRatesClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: SdkFetch;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly headers: Record<string, string>;

  constructor(options: OpenRatesClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = resolveFetch(options.fetch);
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.retries = options.retries ?? 2;
    this.headers = options.headers ?? {};
  }

  getRate(params: RateParams, options: RequestOptions = {}): Promise<RateResponse> {
    return this.request<RateResponse>("GET", `/v1/rates${toQuery({ ...params })}`, {
      retryable: true,
      signal: options.signal,
    });
  }

  convert(params: ConvertParams, options: RequestOptions = {}): Promise<ConversionResponse> {
    return this.request<ConversionResponse>("POST", "/v1/convert", {
      body: params,
      signal: options.signal,
    });
  }

  getSeries(params: SeriesParams, options: RequestOptions = {}): Promise<SeriesResponse> {
    return this.request<SeriesResponse>("GET", `/v1/rates/series${toQuery({ ...params })}`, {
      retryable: true,
      signal: options.signal,
    });
  }

  listCurrencies(params: CurrenciesParams = {}, options: RequestOptions = {}): Promise<unknown> {
    return this.request("GET", `/v1/currencies${toQuery({ ...params })}`, {
      retryable: true,
      signal: options.signal,
    });
  }

  getCurrency(code: string, options: RequestOptions = {}): Promise<unknown> {
    return this.request("GET", `/v1/currencies/${encodeURIComponent(code)}`, {
      retryable: true,
      signal: options.signal,
    });
  }

  getProviders(options: RequestOptions = {}): Promise<unknown> {
    return this.request("GET", "/v1/providers", { retryable: true, signal: options.signal });
  }

  getProvider(id: string, options: RequestOptions = {}): Promise<unknown> {
    return this.request("GET", `/v1/providers/${encodeURIComponent(id)}`, {
      retryable: true,
      signal: options.signal,
    });
  }

  getCapabilities(options: RequestOptions = {}): Promise<unknown> {
    return this.request("GET", "/v1/capabilities", { retryable: true, signal: options.signal });
  }

  health(options: RequestOptions = {}): Promise<unknown> {
    return this.request("GET", "/v1/health", { retryable: true, signal: options.signal });
  }

  ready(options: RequestOptions = {}): Promise<unknown> {
    return this.request("GET", "/v1/ready", { retryable: true, signal: options.signal });
  }

  private async request<T>(
    method: string,
    path: string,
    options: { body?: unknown; retryable?: boolean; signal?: AbortSignal },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { ...this.headers };
    if (this.apiKey !== undefined) {
      headers["x-api-key"] = this.apiKey;
    }
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const maxAttempts = options.retryable === true ? this.retries + 1 : 1;
    let lastError: OpenRatesApiError | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const timeout = withTimeout(this.timeoutMs, options.signal);
      try {
        const response = await this.fetchImpl(url, {
          method,
          headers,
          signal: timeout.signal,
          ...(body !== undefined ? { body } : {}),
        });
        const payload = await response.json().catch(() => undefined);
        if (!response.ok || !isSuccessEnvelope(payload)) {
          const error = toApiError(payload, response.status);
          if (error.retryable && attempt < maxAttempts - 1) {
            lastError = error;
            await delay(200 * 2 ** attempt, options.signal);
            continue;
          }
          throw error;
        }
        return payload.data as T;
      } catch (error) {
        if (error instanceof OpenRatesApiError) {
          throw error;
        }
        const wrapped = new OpenRatesApiError({
          code: timeout.timedOut() ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
          message: timeout.timedOut()
            ? "The request timed out."
            : "The request failed to reach the server.",
          status: 0,
          retryable: true,
        });
        if (attempt < maxAttempts - 1) {
          lastError = wrapped;
          await delay(200 * 2 ** attempt, options.signal);
          continue;
        }
        throw wrapped;
      } finally {
        timeout.cleanup();
      }
    }

    throw (
      lastError ??
      new OpenRatesApiError({ code: "INTERNAL_ERROR", message: "Request failed.", status: 0 })
    );
  }
}
