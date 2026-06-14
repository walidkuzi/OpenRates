import { describe, expect, it } from "vitest";
import {
  buildCurrenciesCacheKey,
  buildHealthCacheKey,
  buildRateCacheKey,
  buildSeriesCacheKey,
} from "./keys";

describe("cache keys", () => {
  it("builds a deterministic, normalized rate key", () => {
    const key = buildRateCacheKey({
      providerId: "frankfurter",
      base: "usd",
      quote: "eur",
      date: "2026-06-12",
      mode: "official",
    });
    expect(key).toBe("rate:frankfurter:official:USD:EUR:2026-06-12");
  });

  it("builds series, currencies, and health keys", () => {
    expect(
      buildSeriesCacheKey({
        providerId: "frankfurter",
        base: "USD",
        quote: "TRY",
        startDate: "2026-01-01",
        endDate: "2026-06-01",
        mode: "official",
      }),
    ).toBe("series:frankfurter:official:USD:TRY:2026-01-01:2026-06-01");
    expect(buildCurrenciesCacheKey("frankfurter")).toBe("currencies:frankfurter");
    expect(buildHealthCacheKey("frankfurter")).toBe("health:frankfurter");
  });
});
