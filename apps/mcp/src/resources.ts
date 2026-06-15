import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listCurrencies } from "@openrates/currency-metadata";
import type { RateEngine } from "@openrates/router";
import type { OpenRatesConfig } from "@openrates/schemas";

export interface ResourceDeps {
  engine: RateEngine;
  config: OpenRatesConfig;
}

const QUICKSTART = `OpenRates gives agents trustworthy currency rates.
- Convert an amount: call convert_currency with amount, from, to.
- Get a rate: call get_exchange_rate with base, quote.
- Use official mode (default) for accounting, invoices, and reporting.
- Always tell the user the effective date and rate type.
- Official daily rates are never live.`;

const TOOL_SELECTION = `Pick the right tool:
- convert_currency: convert a specific amount.
- get_exchange_rate: just the rate, no amount.
- get_exchange_rate_series: historical time series.
- list_currencies: discover currencies or resolve an ambiguous name.
- compare_exchange_rate_providers: compare a pair across providers.
- explain_exchange_rate: explain a concept to the user.`;

const RATE_TYPES = `Rate types:
- official_reference: central-bank daily reference rate (default; never live).
- market_midpoint / market_indicative: market feed rates (need a market provider).
- bank_buy / bank_sell / cash_buy / cash_sell: provider-specific transactional rates.
- computed_cross: combined through a pivot currency; lower confidence.`;

const FRESHNESS = `Freshness:
- live: market rate within the live threshold (only market data qualifies).
- recent: market rate within the recent threshold.
- latest_available / latest_business_day: the newest official rate; not live.
- historical_exact_date / historical_previous_available_date: a past date's rate.
- stale: older than allowed; never returned as current.
Official daily rates are never marked live.`;

const ERRORS = `Common error codes:
- AMBIGUOUS_CURRENCY: the currency name matched several codes; details.candidates lists them.
- UNSUPPORTED_CURRENCY / UNSUPPORTED_PAIR: not supported by the catalogue or provider.
- STRICT_DATE_NOT_AVAILABLE: strict mode and no rate on that exact date.
- RATE_TOO_STALE: the rate is older than the requested maximum age.
- PROVIDER_NOT_CONFIGURED: no provider for the requested mode (for example market).
- PROVIDER_TIMEOUT / PROVIDER_UNAVAILABLE / PROVIDER_RATE_LIMITED: transient; retryable.
Every error has a stable code, a message, and a retryable flag.`;

const LICENSE = `OpenRates Agent Gateway software is licensed under Apache-2.0.
Exchange-rate data comes from upstream providers (Frankfurter by default) under their own terms; OpenRates does not relicense provider data.`;

function text(uri: string, body: string, mimeType = "text/markdown") {
  return { contents: [{ uri, text: body, mimeType }] };
}

function json(uri: string, value: unknown) {
  return {
    contents: [{ uri, text: JSON.stringify(value, null, 2), mimeType: "application/json" }],
  };
}

export function registerResources(server: McpServer, deps: ResourceDeps): void {
  const { engine, config } = deps;

  const docs: Array<[string, string, string, string]> = [
    ["quickstart", "openrates://docs/quickstart", "Quickstart", QUICKSTART],
    ["tool-selection", "openrates://docs/tool-selection", "Tool selection", TOOL_SELECTION],
    ["rate-types", "openrates://docs/rate-types", "Rate types", RATE_TYPES],
    ["freshness", "openrates://docs/freshness", "Freshness", FRESHNESS],
    ["errors", "openrates://docs/errors", "Errors", ERRORS],
    ["license", "openrates://license", "License", LICENSE],
  ];

  for (const [name, uri, title, body] of docs) {
    server.registerResource(
      name,
      uri,
      { title, description: title, mimeType: "text/markdown" },
      () => text(uri, body),
    );
  }

  server.registerResource(
    "providers",
    "openrates://providers",
    { title: "Providers", description: "Configured rate providers.", mimeType: "application/json" },
    async (uri) => {
      const providers = [];
      for (const entry of engine.registry.ordered()) {
        providers.push({
          id: entry.provider.id,
          name: entry.provider.name,
          capabilities: await engine.registry.capabilities(entry.provider.id),
        });
      }
      return json(uri.href, { providers });
    },
  );

  server.registerResource(
    "currencies",
    "openrates://currencies",
    {
      title: "Currencies",
      description: "Supported active currencies.",
      mimeType: "application/json",
    },
    (uri) =>
      json(uri.href, {
        currencies: listCurrencies().map((currency) => ({
          code: currency.code,
          name: currency.name,
          minorUnits: currency.minorUnits,
        })),
      }),
  );

  server.registerResource(
    "capabilities",
    "openrates://capabilities",
    {
      title: "Capabilities",
      description: "Server and provider capabilities.",
      mimeType: "application/json",
    },
    async (uri) => {
      const providers = [];
      for (const entry of engine.registry.ordered()) {
        providers.push({
          id: entry.provider.id,
          name: entry.provider.name,
          capabilities: await engine.registry.capabilities(entry.provider.id),
        });
      }
      return json(uri.href, {
        service: { name: "openrates-agent", version: "1.0.0" },
        modes: ["official", "market", "auto"],
        defaultProvider: config.defaultProvider,
        providers,
      });
    },
  );
}
