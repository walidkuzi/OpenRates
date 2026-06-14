import { HttpError, HttpNetworkError, HttpTimeoutError } from "@openrates/provider-interface";
import { OpenRatesError } from "@openrates/schemas";

export class MalformedResponseError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(`Malformed Frankfurter response: ${detail}`);
    this.name = "MalformedResponseError";
    this.detail = detail;
  }
}

export function normalizeFrankfurterError(error: unknown): OpenRatesError {
  if (error instanceof OpenRatesError) {
    return error;
  }
  if (error instanceof HttpTimeoutError) {
    return new OpenRatesError({
      code: "PROVIDER_TIMEOUT",
      message: "The Frankfurter request timed out.",
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof HttpNetworkError) {
    return new OpenRatesError({
      code: "PROVIDER_UNAVAILABLE",
      message: "Frankfurter could not be reached.",
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof HttpError) {
    if (error.status === 404) {
      return new OpenRatesError({
        code: "UNSUPPORTED_PAIR",
        message: "Frankfurter has no data for this currency pair or date.",
        details: { status: error.status },
        cause: error,
      });
    }
    if (error.status === 429) {
      return new OpenRatesError({
        code: "PROVIDER_RATE_LIMITED",
        message: "Frankfurter rate limit reached.",
        retryable: true,
        cause: error,
      });
    }
    if (error.status >= 500) {
      return new OpenRatesError({
        code: "PROVIDER_UNAVAILABLE",
        message: "Frankfurter is temporarily unavailable.",
        retryable: true,
        cause: error,
      });
    }
    if (error.status === 400 || error.status === 422) {
      return new OpenRatesError({
        code: "INVALID_REQUEST",
        message: "Frankfurter rejected the request.",
        details: { status: error.status },
        cause: error,
      });
    }
    return new OpenRatesError({
      code: "PROVIDER_UNAVAILABLE",
      message: `Frankfurter returned status ${error.status}.`,
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof MalformedResponseError) {
    return new OpenRatesError({
      code: "PROVIDER_UNAVAILABLE",
      message: "Frankfurter returned a malformed response.",
      details: { detail: error.detail },
      cause: error,
    });
  }
  return new OpenRatesError({
    code: "INTERNAL_ERROR",
    message: "Unexpected error while calling Frankfurter.",
    cause: error,
  });
}
