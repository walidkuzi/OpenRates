import {
  type ErrorCode,
  OpenRatesError,
  type SerializedError,
  isOpenRatesError,
  toFailureEnvelope,
  toSuccessEnvelope,
} from "@openrates/schemas";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  INVALID_AMOUNT: 400,
  INVALID_DATE: 400,
  AMBIGUOUS_CURRENCY: 400,
  UNSUPPORTED_CURRENCY: 400,
  UNSUPPORTED_PAIR: 400,
  UNSUPPORTED_MODE: 400,
  UNSUPPORTED_DATE_RANGE: 400,
  PROVIDER_NOT_CONFIGURED: 400,
  PROVIDER_AUTHENTICATION_FAILED: 502,
  PROVIDER_RATE_LIMITED: 429,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_UNAVAILABLE: 502,
  RATE_NOT_AVAILABLE: 404,
  RATE_TOO_STALE: 409,
  STRICT_DATE_NOT_AVAILABLE: 404,
  FALLBACK_NOT_ALLOWED: 409,
  CACHE_ERROR: 500,
  INTERNAL_ERROR: 500,
};

export function statusForCode(code: ErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function sendSuccess(
  request: FastifyRequest,
  reply: FastifyReply,
  data: unknown,
  status = 200,
): void {
  reply.code(status).send(toSuccessEnvelope(data, request.id, new Date().toISOString()));
}

export function sendFailure(
  request: FastifyRequest,
  reply: FastifyReply,
  error: SerializedError,
  status: number,
): void {
  reply.code(status).send(toFailureEnvelope(error, request.id));
}

export function registerErrorHandling(app: FastifyInstance, isProduction: boolean): void {
  app.setNotFoundHandler((request, reply) => {
    sendFailure(
      request,
      reply,
      {
        code: "INVALID_REQUEST",
        message: `Route ${request.method} ${request.url} was not found.`,
        retryable: false,
      },
      404,
    );
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (isOpenRatesError(error)) {
      sendFailure(request, reply, error.toJSON(), statusForCode(error.code));
      return;
    }

    const status = typeof error.statusCode === "number" ? error.statusCode : 500;
    if (status === 429) {
      sendFailure(
        request,
        reply,
        { code: "PROVIDER_RATE_LIMITED", message: "Too many requests.", retryable: true },
        429,
      );
      return;
    }
    if (status >= 400 && status < 500) {
      sendFailure(
        request,
        reply,
        { code: "INVALID_REQUEST", message: error.message, retryable: false },
        status,
      );
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    const internal = new OpenRatesError({
      code: "INTERNAL_ERROR",
      message: isProduction ? "An internal error occurred." : error.message,
    });
    sendFailure(request, reply, internal.toJSON(), 500);
  });
}
