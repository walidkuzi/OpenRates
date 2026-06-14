import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";
import { OpenRatesError } from "./errors";

describe("loadConfig", () => {
  it("falls back to documented defaults when the environment is empty", () => {
    const config = loadConfig({});
    expect(config.nodeEnv).toBe("development");
    expect(config.port).toBe(3000);
    expect(config.defaultProvider).toBe("frankfurter");
    expect(config.providerOrder).toEqual(["frankfurter"]);
    expect(config.allowFallback).toBe(true);
    expect(config.frankfurterBaseUrl).toBe("https://api.frankfurter.dev");
    expect(config.liveThresholdSeconds).toBe(300);
    expect(config.recentThresholdSeconds).toBe(3600);
    expect(config.logAmounts).toBe(false);
    expect(config.telemetry).toBe(false);
    expect(config.redisUrl).toBeUndefined();
  });

  it("parses booleans, numbers, and lists from strings", () => {
    const config = loadConfig({
      OPENRATES_ALLOW_FALLBACK: "false",
      OPENRATES_PROVIDER_ORDER: "frankfurter, ecb ,imf",
      OPENRATES_LIVE_THRESHOLD_SECONDS: "120",
      OPENRATES_LOG_AMOUNTS: "true",
      OPENRATES_API_KEYS: "key-a,key-b",
      PORT: "8080",
    });
    expect(config.allowFallback).toBe(false);
    expect(config.providerOrder).toEqual(["frankfurter", "ecb", "imf"]);
    expect(config.liveThresholdSeconds).toBe(120);
    expect(config.logAmounts).toBe(true);
    expect(config.apiKeys).toEqual(["key-a", "key-b"]);
    expect(config.port).toBe(8080);
  });

  it("rejects invalid numeric configuration with a typed error", () => {
    expect(() => loadConfig({ PORT: "not-a-number" })).toThrow(OpenRatesError);
    try {
      loadConfig({ PORT: "not-a-number" });
    } catch (error) {
      expect(error).toBeInstanceOf(OpenRatesError);
      expect((error as OpenRatesError).code).toBe("INVALID_REQUEST");
    }
  });

  it("rejects an invalid provider base URL", () => {
    expect(() => loadConfig({ FRANKFURTER_BASE_URL: "not a url" })).toThrow(OpenRatesError);
  });
});
