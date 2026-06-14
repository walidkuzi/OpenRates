import { describe, expect, it } from "vitest";
import { MemoryCache } from "./memory";
import { cacheAgeSeconds } from "./types";

describe("MemoryCache", () => {
  it("stores and retrieves a value with timestamps", async () => {
    let nowMs = 1000;
    const cache = new MemoryCache({ now: () => nowMs });
    await cache.set("k", { rate: "1.5" }, 60);
    nowMs = 31_000;
    const result = await cache.get<{ rate: string }>("k");
    expect(result?.value).toEqual({ rate: "1.5" });
    expect(result?.storedAtMs).toBe(1000);
    expect(result && cacheAgeSeconds(result, nowMs)).toBe(30);
  });

  it("returns undefined for a missing key", async () => {
    const cache = new MemoryCache();
    expect(await cache.get("missing")).toBeUndefined();
  });

  it("expires entries after their TTL", async () => {
    let nowMs = 0;
    const cache = new MemoryCache({ now: () => nowMs });
    await cache.set("k", "v", 60);
    nowMs = 59_000;
    expect(await cache.get("k")).toBeDefined();
    nowMs = 60_001;
    expect(await cache.get("k")).toBeUndefined();
  });

  it("evicts the least recently used entry past the limit", async () => {
    const cache = new MemoryCache({ maxItems: 2 });
    await cache.set("a", 1, 600);
    await cache.set("b", 2, 600);
    await cache.get("a");
    await cache.set("c", 3, 600);
    expect(await cache.get("b")).toBeUndefined();
    expect(await cache.get("a")).toBeDefined();
    expect(await cache.get("c")).toBeDefined();
    expect(cache.size).toBe(2);
  });

  it("deletes and clears entries", async () => {
    const cache = new MemoryCache();
    await cache.set("a", 1, 600);
    await cache.delete("a");
    expect(await cache.get("a")).toBeUndefined();
    await cache.set("b", 2, 600);
    await cache.clear();
    expect(await cache.get("b")).toBeUndefined();
  });
});
