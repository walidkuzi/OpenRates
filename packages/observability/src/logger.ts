import { type DestinationStream, type Logger, type LoggerOptions, pino } from "pino";

export type { Logger };

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface CreateLoggerOptions {
  level?: LogLevel;
  name?: string;
  base?: Record<string, unknown>;
  redact?: string[];
}

export const DEFAULT_REDACT_PATHS: readonly string[] = [
  "apiKey",
  "api_key",
  "apiKeys",
  "password",
  "secret",
  "token",
  "authorization",
  "providerApiKey",
  "headers.authorization",
  "headers.Authorization",
  "*.apiKey",
  "*.api_key",
  "*.password",
  "*.secret",
  "*.token",
  "*.authorization",
];

export const REDACTION_CENSOR = "[redacted]";

export function createLogger(
  options: CreateLoggerOptions = {},
  destination?: DestinationStream,
): Logger {
  const loggerOptions: LoggerOptions = {
    level: options.level ?? "info",
    redact: {
      paths: [...DEFAULT_REDACT_PATHS, ...(options.redact ?? [])],
      censor: REDACTION_CENSOR,
    },
  };

  if (options.name !== undefined) {
    loggerOptions.name = options.name;
  }
  if (options.base !== undefined) {
    loggerOptions.base = options.base;
  }

  return destination ? pino(loggerOptions, destination) : pino(loggerOptions);
}
