import { z } from "zod";
import { OpenRatesError } from "./errors";

export const configSchema = z.object({
  nodeEnv: z.enum(["development", "test", "production"]),
  port: z.number().int().positive(),
  host: z.string().min(1),

  defaultProvider: z.string().min(1),
  providerOrder: z.array(z.string().min(1)).min(1),
  allowFallback: z.boolean(),

  frankfurterBaseUrl: z.string().url(),
  frankfurterTimeoutMs: z.number().int().positive(),

  oxrApiKey: z.string().optional(),
  oxrBaseUrl: z.string().url().optional(),
  oxrTimeoutMs: z.number().int().positive().optional(),

  cacheDriver: z.enum(["memory", "redis"]),
  memoryCacheMaxItems: z.number().int().positive(),
  redisUrl: z.string().optional(),

  liveThresholdSeconds: z.number().int().positive(),
  recentThresholdSeconds: z.number().int().positive(),
  providerDisagreementPercent: z.number().nonnegative(),

  logLevel: z.enum(["debug", "info", "warn", "error"]),
  logAmounts: z.boolean(),
  telemetry: z.boolean(),

  apiAuthEnabled: z.boolean(),
  apiKeys: z.array(z.string()),

  rateLimitEnabled: z.boolean(),
  rateLimitPerMinute: z.number().int().positive(),

  maxSeriesPoints: z.number().int().positive(),
  maxDailyRangeYears: z.number().int().positive(),
});
export type OpenRatesConfig = z.infer<typeof configSchema>;

type EnvRecord = Record<string, string | undefined>;

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function readList(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined || value === "") {
    return fallback;
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function loadConfig(env: EnvRecord = process.env): OpenRatesConfig {
  const candidate = {
    nodeEnv: env.NODE_ENV ?? "development",
    port: readNumber(env.PORT, 3000),
    host: env.HOST ?? "0.0.0.0",

    defaultProvider: env.OPENRATES_DEFAULT_PROVIDER ?? "frankfurter",
    providerOrder: readList(env.OPENRATES_PROVIDER_ORDER, ["frankfurter"]),
    allowFallback: readBoolean(env.OPENRATES_ALLOW_FALLBACK, true),

    frankfurterBaseUrl: env.FRANKFURTER_BASE_URL ?? "https://api.frankfurter.dev",
    frankfurterTimeoutMs: readNumber(env.FRANKFURTER_TIMEOUT_MS, 5000),

    oxrApiKey:
      env.OPENRATES_PROVIDER_OPENEXCHANGERATES_API_KEY !== undefined &&
      env.OPENRATES_PROVIDER_OPENEXCHANGERATES_API_KEY.length > 0
        ? env.OPENRATES_PROVIDER_OPENEXCHANGERATES_API_KEY
        : undefined,
    oxrBaseUrl:
      env.OPENRATES_PROVIDER_OPENEXCHANGERATES_BASE_URL !== undefined &&
      env.OPENRATES_PROVIDER_OPENEXCHANGERATES_BASE_URL.length > 0
        ? env.OPENRATES_PROVIDER_OPENEXCHANGERATES_BASE_URL
        : undefined,
    oxrTimeoutMs:
      env.OPENRATES_PROVIDER_OPENEXCHANGERATES_TIMEOUT_MS !== undefined
        ? readNumber(env.OPENRATES_PROVIDER_OPENEXCHANGERATES_TIMEOUT_MS, 5000)
        : undefined,

    cacheDriver: env.OPENRATES_CACHE_DRIVER ?? "memory",
    memoryCacheMaxItems: readNumber(env.OPENRATES_MEMORY_CACHE_MAX_ITEMS, 10000),
    redisUrl: env.REDIS_URL !== undefined && env.REDIS_URL.length > 0 ? env.REDIS_URL : undefined,

    liveThresholdSeconds: readNumber(env.OPENRATES_LIVE_THRESHOLD_SECONDS, 300),
    recentThresholdSeconds: readNumber(env.OPENRATES_RECENT_THRESHOLD_SECONDS, 3600),
    providerDisagreementPercent: readNumber(env.OPENRATES_PROVIDER_DISAGREEMENT_PERCENT, 1.0),

    logLevel: env.OPENRATES_LOG_LEVEL ?? "info",
    logAmounts: readBoolean(env.OPENRATES_LOG_AMOUNTS, false),
    telemetry: readBoolean(env.OPENRATES_TELEMETRY, false),

    apiAuthEnabled: readBoolean(env.OPENRATES_API_AUTH_ENABLED, false),
    apiKeys: readList(env.OPENRATES_API_KEYS, []),

    rateLimitEnabled: readBoolean(env.OPENRATES_RATE_LIMIT_ENABLED, false),
    rateLimitPerMinute: readNumber(env.OPENRATES_RATE_LIMIT_PER_MINUTE, 120),

    maxSeriesPoints: readNumber(env.OPENRATES_MAX_SERIES_POINTS, 2000),
    maxDailyRangeYears: readNumber(env.OPENRATES_MAX_DAILY_RANGE_YEARS, 5),
  };

  const parsed = configSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new OpenRatesError({
      code: "INVALID_REQUEST",
      message: "Invalid OpenRates configuration.",
      details: { issues: parsed.error.issues },
    });
  }
  return parsed.data;
}
