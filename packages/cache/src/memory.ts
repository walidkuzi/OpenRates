import type { CacheStore, CachedValue } from "./types";

interface StoredItem {
  value: unknown;
  storedAtMs: number;
  storedAt: string;
  expiresAtMs: number;
}

export interface MemoryCacheOptions {
  maxItems?: number;
  now?: () => number;
}

const DEFAULT_MAX_ITEMS = 10_000;

export class MemoryCache implements CacheStore {
  private readonly store = new Map<string, StoredItem>();
  private readonly maxItems: number;
  private readonly now: () => number;

  constructor(options: MemoryCacheOptions = {}) {
    this.maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
    this.now = options.now ?? Date.now;
  }

  get<T>(key: string): Promise<CachedValue<T> | undefined> {
    const item = this.store.get(key);
    if (item === undefined) {
      return Promise.resolve(undefined);
    }
    if (item.expiresAtMs <= this.now()) {
      this.store.delete(key);
      return Promise.resolve(undefined);
    }
    this.store.delete(key);
    this.store.set(key, item);
    return Promise.resolve({
      value: item.value as T,
      storedAtMs: item.storedAtMs,
      storedAt: item.storedAt,
    });
  }

  set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const nowMs = this.now();
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, {
      value,
      storedAtMs: nowMs,
      storedAt: new Date(nowMs).toISOString(),
      expiresAtMs: nowMs + ttlSeconds * 1000,
    });
    this.evict();
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }

  get size(): number {
    return this.store.size;
  }

  private evict(): void {
    while (this.store.size > this.maxItems) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.store.delete(oldest);
    }
  }
}
