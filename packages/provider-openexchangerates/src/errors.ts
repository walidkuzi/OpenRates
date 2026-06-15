import { HttpError, HttpNetworkError, HttpTimeoutError } from "@openrates/provider-interface";
import { OpenRatesError } from "@openrates/schemas";

export class MalformedResponseError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Malformed Open Exchange Rates response: ${detail}`);
    this.name = "MalformedResponseError";
    this.detail = detail;
  }
}

export function normalizeOxrError(error: unknown): OpenRatesError {
  if (error instanceof OpenRatesError) return error;

  if (error instanceof HttpTimeoutError) {
    return new OpenRatesError({
      code: "PROVIDER_TIMEOUT",
      message: "The Open Exchange Rates request timed out.",
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof HttpNetworkError) {
    return new OpenRatesError({
      code: "PROVIDER_UNAVAILABLE",
      message: "Open Exchange Rates could not be reached.",
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) {
      return new OpenRatesError({
        code: "PROVIDER_AUTHENTICATION_FAILED",
        message: "Open Exchange Rates rejected the API key.",
        details: { status: error.status },
        cause: error,
      });
    }
    if (error.status === 404) {
      return new OpenRatesError({
        code: "RATE_NOT_AVAILABLE",
        message: "Open Exchange Rates has no data for this pair or date.",
        details: { status: error.status },
        cause: error,
      });
    }
    if (error.status === 429) {
      return new OpenRatesError({
        code: "PROVIDER_RATE_LIMITED",
        message: "Open Exchange Rates rate limit reached.",
        retryable: true,
        cause: error,
      });
    }
    if (error.status >= 500) {
      return new OpenRatesError({
        code: "PROVIDER_UNAVAILABLE",
        message: "Open Exchange Rates is temporarily unavailable.",
        retryable: true,
        cause: error,
      });
    }
    return new OpenRatesError({
      code: "PROVIDER_UNAVAILABLE",
      message: `Open Exchange Rates returned status ${error.status}.`,
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof MalformedResponseError) {
    return new OpenRatesError({
      code: "PROVIDER_UNAVAILABLE",
      message: "Open Exchange Rates returned a malformed response.",
      details: { detail: error.detail },
      cause: error,
    });
  }
  return new OpenRatesError({
    code: "INTERNAL_ERROR",
    message: "Unexpected error while calling Open Exchange Rates.",
    cause: error,
  });
}
