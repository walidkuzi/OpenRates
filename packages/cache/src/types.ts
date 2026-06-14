export interface CachedValue<T> {
  value: T;
  storedAtMs: number;
  storedAt: string;
}

export interface CacheStore {
  get<T>(key: string): Promise<CachedValue<T> | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export function cacheAgeSeconds(stored: CachedValue<unknown>, nowMs: number): number {
  return Math.max(0, (nowMs - stored.storedAtMs) / 1000);
}
