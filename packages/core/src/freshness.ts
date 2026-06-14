import type { FreshnessClass, RateMode, RateType } from "@openrates/schemas";

export interface FreshnessInput {
  mode: RateMode;
  rateType: RateType;
  isHistoricalRequest: boolean;
  requestedDate?: string;
  effectiveDate: string;
  observedAt?: string;
  publishedAt?: string;
  retrievedAt: string;
  now: string;
  providerSupportsIntraday: boolean;
  providerSupportsTimestamp: boolean;
  liveThresholdSeconds: number;
  recentThresholdSeconds: number;
  maxAgeSeconds?: number;
  expectedUpdateIntervalSeconds?: number;
  staleToleranceSeconds?: number;
}

export interface FreshnessResult {
  freshnessClass: FreshnessClass;
  isLive: boolean;
  isStale: boolean;
  freshnessSeconds?: number;
}

function calendarDate(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

function effectiveDateAgeSeconds(effectiveDate: string, now: string): number {
  const effectiveMs = Date.parse(`${effectiveDate}T00:00:00Z`);
  const nowMs = Date.parse(now);
  return Math.max(0, (nowMs - effectiveMs) / 1000);
}

function withFreshnessSeconds(
  result: FreshnessResult,
  ageSeconds: number | undefined,
): FreshnessResult {
  if (ageSeconds === undefined) {
    return result;
  }
  return { ...result, freshnessSeconds: Math.round(ageSeconds) };
}

function isOfficialOrDaily(input: FreshnessInput): boolean {
  return (
    input.mode === "official" ||
    input.rateType === "official_reference" ||
    !input.providerSupportsIntraday
  );
}

function classifyDaily(input: FreshnessInput, ageSeconds: number | undefined): FreshnessResult {
  if (input.isHistoricalRequest) {
    const requested = input.requestedDate ?? input.effectiveDate;
    const freshnessClass: FreshnessClass =
      requested === input.effectiveDate
        ? "historical_exact_date"
        : "historical_previous_available_date";
    return withFreshnessSeconds({ freshnessClass, isLive: false, isStale: false }, ageSeconds);
  }

  let isStale = false;
  if (input.maxAgeSeconds !== undefined) {
    const effectiveAge = effectiveDateAgeSeconds(input.effectiveDate, input.now);
    if (effectiveAge > input.maxAgeSeconds) {
      isStale = true;
    }
  }

  const today = calendarDate(input.now);
  const freshnessClass: FreshnessClass =
    input.effectiveDate === today ? "latest_available" : "latest_business_day";

  return withFreshnessSeconds({ freshnessClass, isLive: false, isStale }, ageSeconds);
}

function classifyMarket(input: FreshnessInput, ageSeconds: number | undefined): FreshnessResult {
  if (ageSeconds === undefined || !input.providerSupportsTimestamp) {
    return { freshnessClass: "unknown", isLive: false, isStale: false };
  }

  const tolerance = input.staleToleranceSeconds ?? 0;
  let isStale = false;
  if (input.maxAgeSeconds !== undefined && ageSeconds > input.maxAgeSeconds) {
    isStale = true;
  }
  if (
    input.expectedUpdateIntervalSeconds !== undefined &&
    ageSeconds > input.expectedUpdateIntervalSeconds + tolerance
  ) {
    isStale = true;
  }

  const freshnessSeconds = Math.round(ageSeconds);

  if (!isStale && input.providerSupportsIntraday && ageSeconds <= input.liveThresholdSeconds) {
    return { freshnessClass: "live", isLive: true, isStale: false, freshnessSeconds };
  }
  if (!isStale && ageSeconds <= input.recentThresholdSeconds) {
    return { freshnessClass: "recent", isLive: false, isStale: false, freshnessSeconds };
  }
  if (isStale) {
    return { freshnessClass: "stale", isLive: false, isStale: true, freshnessSeconds };
  }
  return { freshnessClass: "latest_available", isLive: false, isStale: false, freshnessSeconds };
}

export function classifyFreshness(input: FreshnessInput): FreshnessResult {
  const nowMs = Date.parse(input.now);
  const observationTimestamp = input.observedAt ?? input.publishedAt;
  const ageSeconds =
    observationTimestamp !== undefined
      ? Math.max(0, (nowMs - Date.parse(observationTimestamp)) / 1000)
      : undefined;

  if (isOfficialOrDaily(input)) {
    return classifyDaily(input, ageSeconds);
  }
  return classifyMarket(input, ageSeconds);
}
