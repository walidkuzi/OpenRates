import { MemoryCache } from "@openrates/cache";
import { FrankfurterProvider } from "@openrates/provider-frankfurter";
import type { FetchLike } from "@openrates/provider-interface";
import { ProviderRegistry, RateEngine } from "@openrates/router";
import type { OpenRatesConfig } from "@openrates/schemas";

export interface McpEngineOptions {
  fetch?: FetchLike;
}

export function createMcpEngine(
  config: OpenRatesConfig,
  options: McpEngineOptions = {},
): RateEngine {
  const registry = new ProviderRegistry();
  registry.register({
    provider: new FrankfurterProvider({
      baseUrl: config.frankfurterBaseUrl,
      timeoutMs: config.frankfurterTimeoutMs,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    }),
    trust: 1,
    order: 0,
  });

  const cache = new MemoryCache({ maxItems: config.memoryCacheMaxItems });

  return new RateEngine({
    registry,
    cache,
    config: {
      liveThresholdSeconds: config.liveThresholdSeconds,
      recentThresholdSeconds: config.recentThresholdSeconds,
    },
  });
}
