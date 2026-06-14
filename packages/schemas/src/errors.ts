import { z } from "zod";

export const errorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "INVALID_AMOUNT",
  "INVALID_DATE",
  "AMBIGUOUS_CURRENCY",
  "UNSUPPORTED_CURRENCY",
  "UNSUPPORTED_PAIR",
  "UNSUPPORTED_MODE",
  "UNSUPPORTED_DATE_RANGE",
  "PROVIDER_NOT_CONFIGURED",
  "PROVIDER_AUTHENTICATION_FAILED",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "RATE_NOT_AVAILABLE",
  "RATE_TOO_STALE",
  "STRICT_DATE_NOT_AVAILABLE",
  "FALLBACK_NOT_ALLOWED",
  "CACHE_ERROR",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const serializedErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  details: z.record(z.unknown()).optional(),
  suggestion: z.string().optional(),
});
export type SerializedError = z.infer<typeof serializedErrorSchema>;

const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set([
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "CACHE_ERROR",
  "INTERNAL_ERROR",
]);

export function isRetryableCode(code: ErrorCode): boolean {
  return RETRYABLE_CODES.has(code);
}

export interface OpenRatesErrorOptions {
  code: ErrorCode;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
  suggestion?: string;
  cause?: unknown;
}

export class OpenRatesError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Record<string, unknown> | undefined;
  readonly suggestion: string | undefined;

  constructor(options: OpenRatesErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "OpenRatesError";
    this.code = options.code;
    this.retryable = options.retryable ?? isRetryableCode(options.code);
    this.details = options.details;
    this.suggestion = options.suggestion;
  }

  toJSON(): SerializedError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.details !== undefined ? { details: this.details } : {}),
      ...(this.suggestion !== undefined ? { suggestion: this.suggestion } : {}),
    };
  }
}

export function isOpenRatesError(value: unknown): value is OpenRatesError {
  return value instanceof OpenRatesError;
}
