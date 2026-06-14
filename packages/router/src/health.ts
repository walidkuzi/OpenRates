import type { ExchangeRateProvider, ProviderHealth } from "@openrates/provider-interface";

export type HealthStatus = "healthy" | "degraded" | "unavailable";

export function healthScore(status: HealthStatus): number {
  switch (status) {
    case "healthy":
      return 1;
    case "degraded":
      return 0.5;
    case "unavailable":
      return 0;
  }
}

export class ProviderHealthTracker {
  private readonly state = new Map<string, HealthStatus>();

  recordSuccess(id: string): void {
    this.state.set(id, "healthy");
  }

  recordFailure(id: string): void {
    this.state.set(id, "unavailable");
  }

  status(id: string): HealthStatus {
    return this.state.get(id) ?? "healthy";
  }

  score(id: string): number {
    return healthScore(this.status(id));
  }

  async check(provider: ExchangeRateProvider): Promise<ProviderHealth> {
    const health = await provider.healthCheck();
    this.state.set(provider.id, health.status);
    return health;
  }
}
