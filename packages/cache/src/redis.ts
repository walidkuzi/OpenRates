import type { CacheStore, CachedValue } from "./types";

export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ttlSeconds: number }): Promise<void>;
  del(key: string): Promise<void>;
  clear?(): Promise<void>;
}

export interface RedisCacheOptions {
  now?: () => number;
}

export class RedisCache implements CacheStore {
  private readonly client: RedisLikeClient;
  private readonly now: () => number;

  constructor(client: RedisLikeClient, options: RedisCacheOptions = {}) {
    this.client = client;
    this.now = options.now ?? Date.now;
  }

  async get<T>(key: string): Promise<CachedValue<T> | undefined> {
    const raw = await this.client.get(key);
    if (raw === null) {
      return undefined;
    }
    try {
      return JSON.parse(raw) as CachedValue<T>;
    } catch {
      await this.client.del(key);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const nowMs = this.now();
    const payload: CachedValue<T> = {
      value,
      storedAtMs: nowMs,
      storedAt: new Date(nowMs).toISOString(),
    };
    await this.client.set(key, JSON.stringify(payload), { ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    if (this.client.clear) {
      await this.client.clear();
    }
  }
}
