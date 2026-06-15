import { MemoryCache } from "@openrates/cache";
import { FrankfurterProvider } from "@openrates/provider-frankfurter";
import type { FetchLike } from "@openrates/provider-interface";
import { ProviderRegistry, RateEngine } from "@openrates/router";
import type { OpenRatesConfig } from "@openrates/schemas";

export function createCliEngine(config: OpenRatesConfig, fetch?: FetchLike): RateEngine {
  const registry = new ProviderRegistry();
  registry.register({
    provider: new FrankfurterProvider({
      baseUrl: config.frankfurterBaseUrl,
      timeoutMs: config.frankfurterTimeoutMs,
      ...(fetch ? { fetch } : {}),
    }),
    trust: 1,
    order: 0,
  });
  return new RateEngine({
    registry,
    cache: new MemoryCache({ maxItems: config.memoryCacheMaxItems }),
    config: {
      liveThresholdSeconds: config.liveThresholdSeconds,
      recentThresholdSeconds: config.recentThresholdSeconds,
    },
  });
}
