import { runProviderContractTests } from "@openrates/provider-interface/testing";
import { describe, it } from "vitest";
import { FrankfurterProvider } from "./adapter";
import currencies from "./fixtures/currencies.json";
import { createFrankfurterFakeFetch, statusFetch, timeoutFetch } from "./fixtures/fake-fetch";
import latest from "./fixtures/latest.json";
import series from "./fixtures/series.json";

const happyFetch = createFrankfurterFakeFetch({
  latest,
  series,
  currencies,
  historicalByDate: {
    "2026-06-12": { amount: 1, base: "USD", date: "2026-06-12", rates: { EUR: 0.865421 } },
  },
  defaultHistorical: { amount: 1, base: "USD", date: "2026-06-12", rates: { EUR: 0.865 } },
  notFoundSymbols: ["ZZZ"],
});

runProviderContractTests(
  { describe, it },
  {
    createProvider: () => new FrankfurterProvider({ fetch: happyFetch, retries: 0 }),
    knownBase: "USD",
    knownQuote: "EUR",
    historicalDate: "2026-06-12",
    unsupportedCurrency: "ZZZ",
    faults: {
      timeout: () => new FrankfurterProvider({ fetch: timeoutFetch(), timeoutMs: 5, retries: 0 }),
      rateLimited: () => new FrankfurterProvider({ fetch: statusFetch(429), retries: 0 }),
      unavailable: () => new FrankfurterProvider({ fetch: statusFetch(503), retries: 0 }),
      malformed: () =>
        new FrankfurterProvider({
          fetch: createFrankfurterFakeFetch({ latest: { unexpected: true } }),
          retries: 0,
        }),
    },
  },
);
