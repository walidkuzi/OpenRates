export interface RateCacheKeyParts {
  providerId: string;
  base: string;
  quote: string;
  date: string;
  mode: string;
}

export interface SeriesCacheKeyParts {
  providerId: string;
  base: string;
  quote: string;
  startDate: string;
  endDate: string;
  mode: string;
}

export function buildRateCacheKey(parts: RateCacheKeyParts): string {
  return [
    "rate",
    parts.providerId,
    parts.mode,
    parts.base.toUpperCase(),
    parts.quote.toUpperCase(),
    parts.date,
  ].join(":");
}

export function buildSeriesCacheKey(parts: SeriesCacheKeyParts): string {
  return [
    "series",
    parts.providerId,
    parts.mode,
    parts.base.toUpperCase(),
    parts.quote.toUpperCase(),
    parts.startDate,
    parts.endDate,
  ].join(":");
}

export function buildCurrenciesCacheKey(providerId: string): string {
  return `currencies:${providerId}`;
}

export function buildHealthCacheKey(providerId: string): string {
  return `health:${providerId}`;
}
