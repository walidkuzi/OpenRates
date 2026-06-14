import { describe, expect, it } from "vitest";
import { RedisCache, type RedisLikeClient } from "./redis";

function fakeClient(): RedisLikeClient & { store: Map<string, string>; lastTtl?: number } {
  const store = new Map<string, string>();
  return {
    store,
    lastTtl: undefined as number | undefined,
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, options) {
      this.lastTtl = options.ttlSeconds;
      store.set(key, value);
    },
    async del(key) {
      store.delete(key);
    },
  };
}

describe("RedisCache", () => {
  it("serializes values and forwards the TTL", async () => {
    const client = fakeClient();
    const cache = new RedisCache(client, { now: () => 5000 });
    await cache.set("k", { rate: "1.5" }, 120);
    expect(client.lastTtl).toBe(120);
    const result = await cache.get<{ rate: string }>("k");
    expect(result?.value).toEqual({ rate: "1.5" });
    expect(result?.storedAtMs).toBe(5000);
  });

  it("returns undefined and clears a corrupt entry", async () => {
    const client = fakeClient();
    client.store.set("bad", "{not json");
    const cache = new RedisCache(client);
    expect(await cache.get("bad")).toBeUndefined();
    expect(client.store.has("bad")).toBe(false);
  });

  it("deletes entries", async () => {
    const client = fakeClient();
    const cache = new RedisCache(client);
    await cache.set("k", 1, 60);
    await cache.delete("k");
    expect(await cache.get("k")).toBeUndefined();
  });
});
