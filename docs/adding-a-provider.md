# Adding a provider

This guide walks through adding a new exchange-rate provider to OpenRates. You will
implement the `ExchangeRateProvider` interface, write contract tests, and register the
provider in the engine.

## The provider interface

Every provider must implement `ExchangeRateProvider`:

```ts
export interface ExchangeRateProvider {
  readonly id: string;
  readonly name: string;
  capabilities(): Promise<ProviderCapabilities>;
  healthCheck(): Promise<ProviderHealth>;
  getLatestRate(input: LatestRateInput): Promise<ProviderRate>;
  getHistoricalRate(input: HistoricalRateInput): Promise<ProviderRate>;
  getTimeSeries(input: TimeSeriesInput): Promise<ProviderTimeSeries>;
  listCurrencies(): Promise<ProviderCurrency[]>;
  normalizeError(error: unknown): OpenRatesError;
}
```

- `id` — Unique identifier used in logs and configuration (e.g., `"fixer"`, `"xe"`).
- `name` — Human-readable name (e.g., `"Fixer"`, `"XE"`).
- `capabilities()` — What the provider supports (modes, rate types, historical, intraday).
- `healthCheck()` — Ping the provider and report status and latency.
- `getLatestRate()` — Most recent rate for a currency pair.
- `getHistoricalRate()` — Rate for a specific date, respecting the `datePolicy`.
- `getTimeSeries()` — Rates for a date range.
- `listCurrencies()` — All currencies the provider supports.
- `normalizeError()` — Convert any error into a typed `OpenRatesError`.

## Provider capabilities

```ts
interface ProviderCapabilities {
  supportedModes: RateMode[];
  supportedRateTypes: RateType[];
  supportsHistorical: boolean;
  supportsTimeSeries: boolean;
  supportsIntraday: boolean;
  supportsProviderTimestamp: boolean;
  requiresApiKey: boolean;
  estimatedUpdateFrequencySeconds?: number;
  supportedCurrencies?: string[];
  baseCurrencyRestrictions?: string[];
}
```

Example for a market data provider with intraday support:

```ts
{
  supportedModes: ["market"],
  supportedRateTypes: ["spot"],
  supportsHistorical: true,
  supportsTimeSeries: true,
  supportsIntraday: true,
  supportsProviderTimestamp: true,
  requiresApiKey: true,
  estimatedUpdateFrequencySeconds: 60,
}
```

## Minimal adapter skeleton

Create `packages/provider-myservice/src/adapter.ts`:

```ts
import type {
  ExchangeRateProvider,
  HistoricalRateInput,
  LatestRateInput,
  ProviderCapabilities,
  ProviderCurrency,
  ProviderHealth,
  ProviderRate,
  ProviderTimeSeries,
  TimeSeriesInput,
} from "@openrates/provider-interface";
import { OpenRatesError } from "@openrates/schemas";

export class MyServiceProvider implements ExchangeRateProvider {
  readonly id = "myservice";
  readonly name = "MyService";

  constructor(private readonly apiKey: string) {}

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      supportedModes: ["market"],
      supportedRateTypes: ["spot"],
      supportsHistorical: true,
      supportsTimeSeries: true,
      supportsIntraday: false,
      supportsProviderTimestamp: false,
      requiresApiKey: true,
      estimatedUpdateFrequencySeconds: 3600,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      await this.fetch("/ping");
      return {
        status: "healthy",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getLatestRate(input: LatestRateInput): Promise<ProviderRate> {
    const data = await this.fetch(`/rates?base=${input.base}&to=${input.quote}`);
    return {
      baseCurrency: input.base,
      quoteCurrency: input.quote,
      rate: String(data.rate),
      rateType: "spot",
      effectiveDate: data.date,
      calculationMethod: "direct",
      providerId: this.id,
    };
  }

  async getHistoricalRate(input: HistoricalRateInput): Promise<ProviderRate> {
    const data = await this.fetch(
      `/rates?base=${input.base}&to=${input.quote}&date=${input.date}`
    );
    return {
      baseCurrency: input.base,
      quoteCurrency: input.quote,
      rate: String(data.rate),
      rateType: "spot",
      effectiveDate: data.date,
      calculationMethod: "direct",
      providerId: this.id,
    };
  }

  async getTimeSeries(input: TimeSeriesInput): Promise<ProviderTimeSeries> {
    const data = await this.fetch(
      `/series?base=${input.base}&to=${input.quote}&start=${input.startDate}&end=${input.endDate}`
    );
    return {
      baseCurrency: input.base,
      quoteCurrency: input.quote,
      startDate: input.startDate,
      endDate: input.endDate,
      rateType: "spot",
      providerId: this.id,
      points: data.rates.map((r: { date: string; rate: number }) => ({
        date: r.date,
        rate: String(r.rate),
        filled: false,
      })),
    };
  }

  async listCurrencies(): Promise<ProviderCurrency[]> {
    const data = await this.fetch("/currencies");
    return Object.entries(data).map(([code, name]) => ({ code, name: name as string }));
  }

  normalizeError(error: unknown): OpenRatesError {
    if (error instanceof OpenRatesError) return error;
    return new OpenRatesError({
      code: "PROVIDER_UNAVAILABLE",
      message: error instanceof Error ? error.message : String(error),
      retryable: true,
      cause: error,
    });
  }

  private async fetch(path: string): Promise<any> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await globalThis.fetch(`https://api.myservice.com${path}`, {
        headers: { "X-API-Key": this.apiKey },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } finally {
      clearTimeout(id);
    }
  }
}
```

## Error normalization

Map common HTTP and network errors to typed codes:

```ts
normalizeError(error: unknown): OpenRatesError {
  if (error instanceof OpenRatesError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new OpenRatesError({ code: "PROVIDER_TIMEOUT", message: "Request timed out.", retryable: true });
  }
  return new OpenRatesError({ code: "PROVIDER_UNAVAILABLE", message: "Provider error.", retryable: true });
}
```

## Contract tests

Use the test harness from `@openrates/provider-interface/testing`:

```ts
import { runProviderContractTests } from "@openrates/provider-interface/testing";
import { MyServiceProvider } from "./adapter";

runProviderContractTests(
  { describe, it },
  {
    createProvider: () => new MyServiceProvider("test_key"),
    knownBase: "USD",
    knownQuote: "EUR",
    historicalDate: "2024-01-15",
    unsupportedCurrency: "XYZ",
  }
);
```

Provide fixtures so tests are deterministic and do not require live network access.

## Configuration conventions

Use environment variable naming conventions:

```bash
OPENRATES_PROVIDER_MYSERVICE_API_KEY=secret
OPENRATES_PROVIDER_MYSERVICE_BASE_URL=https://api.myservice.com
OPENRATES_PROVIDER_MYSERVICE_TIMEOUT_MS=5000
OPENRATES_PROVIDER_MYSERVICE_ENABLED=true
```

Replace `MYSERVICE` with the uppercase provider id.

## Registering the provider

Register the provider in the engine (`apps/api/src/engine.ts`):

```ts
if (process.env.OPENRATES_PROVIDER_MYSERVICE_API_KEY) {
  registry.register({
    provider: new MyServiceProvider(process.env.OPENRATES_PROVIDER_MYSERVICE_API_KEY),
    order: 1,
    trust: 0.9,
  });
}
```

`order` controls selection priority (lower = first). `trust` is a confidence weight from 0
to 1.

## Testing end-to-end

```bash
pnpm test
curl "http://localhost:3000/v1/rates?base=USD&quote=EUR"
```

The response `providerId` field should show your provider's id.
