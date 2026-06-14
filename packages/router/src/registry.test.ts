import type { ExchangeRateProvider, ProviderCapabilities } from "@openrates/provider-interface";
import { describe, expect, it } from "vitest";
import { ProviderHealthTracker, healthScore } from "./health";
import { ProviderRegistry } from "./registry";

function stubProvider(id: string, capabilities: ProviderCapabilities): ExchangeRateProvider {
  let calls = 0;
  return {
    id,
    name: id,
    capabilities: () => {
      calls += 1;
      return Promise.resolve({ ...capabilities, estimatedUpdateFrequencySeconds: calls });
    },
    healthCheck: () => Promise.resolve({ status: "healthy", checkedAt: "2026-06-15T00:00:00Z" }),
    getLatestRate: () => Promise.reject(new Error("unused")),
    getHistoricalRate: () => Promise.reject(new Error("unused")),
    getTimeSeries: () => Promise.reject(new Error("unused")),
    listCurrencies: () => Promise.resolve([]),
    normalizeError: (error) => error as never,
  };
}

const officialCaps: ProviderCapabilities = {
  supportedModes: ["official"],
  supportedRateTypes: ["official_reference"],
  supportsHistorical: true,
  supportsTimeSeries: true,
  supportsIntraday: false,
  supportsProviderTimestamp: false,
  requiresApiKey: false,
};

describe("ProviderRegistry", () => {
  it("orders providers by order then trust", () => {
    const registry = new ProviderRegistry();
    registry.register({ provider: stubProvider("a", officialCaps), order: 2, trust: 0.5 });
    registry.register({ provider: stubProvider("b", officialCaps), order: 1, trust: 0.9 });
    expect(registry.ordered().map((entry) => entry.provider.id)).toEqual(["b", "a"]);
  });

  it("memoizes capabilities", async () => {
    const registry = new ProviderRegistry();
    registry.register({ provider: stubProvider("a", officialCaps) });
    const first = await registry.capabilities("a");
    const second = await registry.capabilities("a");
    expect(first?.estimatedUpdateFrequencySeconds).toBe(1);
    expect(second?.estimatedUpdateFrequencySeconds).toBe(1);
  });

  it("returns undefined capabilities for an unknown provider", async () => {
    const registry = new ProviderRegistry();
    expect(await registry.capabilities("missing")).toBeUndefined();
  });
});

describe("ProviderHealthTracker", () => {
  it("maps statuses to scores", () => {
    expect(healthScore("healthy")).toBe(1);
    expect(healthScore("degraded")).toBe(0.5);
    expect(healthScore("unavailable")).toBe(0);
  });

  it("defaults to healthy and tracks outcomes", () => {
    const tracker = new ProviderHealthTracker();
    expect(tracker.status("x")).toBe("healthy");
    tracker.recordFailure("x");
    expect(tracker.status("x")).toBe("unavailable");
    expect(tracker.score("x")).toBe(0);
    tracker.recordSuccess("x");
    expect(tracker.status("x")).toBe("healthy");
  });

  it("check() queries the provider and records the reported status", async () => {
    const tracker = new ProviderHealthTracker();
    const health = await tracker.check(stubProvider("h", officialCaps));
    expect(health.status).toBe("healthy");
    expect(tracker.status("h")).toBe("healthy");
  });
});
