import type { ExchangeRateProvider, ProviderCapabilities } from "@openrates/provider-interface";

export interface ProviderRegistration {
  provider: ExchangeRateProvider;
  trust?: number;
  order?: number;
}

export interface RegistryEntry {
  provider: ExchangeRateProvider;
  trust: number;
  order: number;
}

const DEFAULT_TRUST = 0.8;

export class ProviderRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  private readonly capabilityCache = new Map<string, ProviderCapabilities>();

  register(registration: ProviderRegistration): void {
    const order = registration.order ?? this.entries.size;
    this.entries.set(registration.provider.id, {
      provider: registration.provider,
      trust: registration.trust ?? DEFAULT_TRUST,
      order,
    });
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): RegistryEntry | undefined {
    return this.entries.get(id);
  }

  ordered(): RegistryEntry[] {
    return [...this.entries.values()].sort((a, b) => a.order - b.order || b.trust - a.trust);
  }

  async capabilities(id: string): Promise<ProviderCapabilities | undefined> {
    const cached = this.capabilityCache.get(id);
    if (cached) {
      return cached;
    }
    const entry = this.entries.get(id);
    if (!entry) {
      return undefined;
    }
    const capabilities = await entry.provider.capabilities();
    this.capabilityCache.set(id, capabilities);
    return capabilities;
  }
}
