import type { ErrorCode } from "@openrates/schemas";

export interface OpenRatesApiErrorOptions {
  code: ErrorCode | string;
  message: string;
  status: number;
  retryable?: boolean;
  requestId?: string;
  details?: Record<string, unknown>;
  suggestion?: string;
}

export class OpenRatesApiError extends Error {
  readonly code: ErrorCode | string;
  readonly status: number;
  readonly retryable: boolean;
  readonly requestId: string | undefined;
  readonly details: Record<string, unknown> | undefined;
  readonly suggestion: string | undefined;

  constructor(options: OpenRatesApiErrorOptions) {
    super(options.message);
    this.name = "OpenRatesApiError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.requestId = options.requestId;
    this.details = options.details;
    this.suggestion = options.suggestion;
  }
}

export function isOpenRatesApiError(value: unknown): value is OpenRatesApiError {
  return value instanceof OpenRatesApiError;
}
