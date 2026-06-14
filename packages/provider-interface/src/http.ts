export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<HttpResponse>;

export class HttpError extends Error {
  readonly status: number;
  readonly bodyText: string;

  constructor(status: number, bodyText: string) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

export class HttpTimeoutError extends Error {
  constructor() {
    super("Request timed out.");
    this.name = "HttpTimeoutError";
  }
}

export class HttpNetworkError extends Error {
  constructor(cause: unknown) {
    super("Network request failed.", { cause });
    this.name = "HttpNetworkError";
  }
}

export interface HttpGetOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 200;

function resolveFetch(provided?: FetchLike): FetchLike {
  if (provided) {
    return provided;
  }
  const globalFetch = (globalThis as unknown as { fetch?: FetchLike }).fetch;
  if (!globalFetch) {
    throw new Error("No fetch implementation is available; provide one explicitly.");
  }
  return globalFetch;
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

function withTimeout(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;
  const onExternalAbort = () => controller.abort(external?.reason);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (external) {
    if (external.aborted) {
      controller.abort(external.reason);
    } else {
      external.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
    timedOut: () => timedOut,
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function httpGetJson(url: string, options: HttpGetOptions = {}): Promise<unknown> {
  const fetchImpl = resolveFetch(options.fetch);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeout = withTimeout(timeoutMs, options.signal);
    try {
      const response = await fetchImpl(url, { signal: timeout.signal });
      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        const httpError = new HttpError(response.status, bodyText);
        if (isRetryableStatus(response.status) && attempt < retries) {
          lastError = httpError;
          await delay(backoffMs * 2 ** attempt, options.signal);
          continue;
        }
        throw httpError;
      }
      return await response.json();
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      const normalized = timeout.timedOut() ? new HttpTimeoutError() : new HttpNetworkError(error);
      if (attempt < retries) {
        lastError = normalized;
        await delay(backoffMs * 2 ** attempt, options.signal);
        continue;
      }
      throw normalized;
    } finally {
      timeout.cleanup();
    }
  }

  throw lastError ?? new HttpNetworkError(new Error("Request failed."));
}
