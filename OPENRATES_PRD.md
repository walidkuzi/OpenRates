# OpenRates Agent Gateway
## Complete Product Requirements Document (PRD)

**Document version:** 1.0  
**Status:** Build-ready  
**Product type:** Open-source infrastructure for AI agents  
**Primary interface:** Model Context Protocol (MCP)  
**Secondary interfaces:** REST API, OpenAPI, TypeScript SDK, CLI  
**License:** Apache-2.0 for software  
**Working product name:** OpenRates Agent Gateway  
**Primary repository name:** `openrates-agent`  

---

# 1. Executive Summary

OpenRates Agent Gateway is a free, open-source currency intelligence service designed specifically for AI agents.

It allows an AI agent to discover and use current, historical, and provider-specific currency exchange rates without depending on the language model's internal knowledge, manually browsing websites, or understanding different financial-data APIs.

The product will expose a small, clearly described set of MCP tools that agents can discover automatically. It will also expose a normal REST API, OpenAPI documentation, a TypeScript SDK, and a command-line interface.

The product must return more than a conversion number. Every response must explain:

- Which currencies were used.
- Which rate was used.
- When the rate was effective.
- When the rate was published.
- When the rate was retrieved.
- Whether the rate is truly live, recent, daily, or stale.
- Whether it is an official reference rate or a market rate.
- Which provider supplied the rate.
- Whether the rate was direct or calculated through another currency.
- How the result was rounded.
- Whether fees, spreads, or other real-world differences are excluded.
- Whether the result is appropriate for the requested use case.

The first production version will use Frankfurter as the default source for official reference rates. The architecture will support additional provider adapters, including providers that offer faster market rates through bring-your-own-key configuration.

The product will never describe a daily official rate as real-time. Honesty about rate type, freshness, and source is a core product requirement.

---

# 2. Product Vision

## 2.1 Vision statement

Make reliable currency intelligence a standard capability that any AI agent can discover and use safely in seconds.

## 2.2 Product promise

An AI agent using OpenRates should always know:

1. The numerical exchange rate.
2. The meaning of that rate.
3. The freshness of the rate.
4. The origin of the rate.
5. The limitations of the rate.
6. Whether the result is appropriate for the user's task.

## 2.3 Long-term vision

OpenRates should become the standard open-source currency tool layer for:

- General-purpose AI assistants.
- Coding agents.
- Browser agents.
- Procurement agents.
- Accounting agents.
- Travel agents.
- E-commerce agents.
- Sales agents.
- Financial-reporting agents.
- Invoice-processing agents.
- Autonomous business workflows.
- Multi-agent systems.
- No-code AI-agent builders.

---

# 3. Problem Statement

Language models do not inherently know the current exchange rate. Their internal knowledge can be outdated, incomplete, or wrong.

Agents currently solve this problem in unreliable ways:

- They guess from memory.
- They search the web and extract a number from an unknown source.
- They use a provider without understanding its rate type.
- They call a daily-rate API and describe the result as live.
- They fail to distinguish a central-bank reference rate from a market midpoint.
- They ignore weekends and public holidays.
- They apply incorrect decimal precision.
- They omit provider attribution.
- They silently use stale fallback data.
- They fail when an API provider is unavailable.
- They use binary floating-point calculations that introduce monetary rounding errors.
- They return a result without warning that a bank or payment provider may apply fees and spread.

Existing exchange-rate APIs are usually designed for human developers. Their response formats, terminology, authentication, limits, and data meanings differ.

Existing basic currency MCP servers often wrap one provider and return a number. They do not provide a universal trust, normalization, fallback, and explanation layer.

OpenRates solves this by creating one agent-native interface over multiple possible exchange-rate sources.

---

# 4. Product Principles

The implementation must follow these principles.

## 4.1 Agents first

Every feature must be usable without a graphical interface. MCP is the primary interface.

## 4.2 Honest freshness

The system must never label a rate as live unless the provider supplies sufficiently recent market data and the freshness rules classify it as live.

## 4.3 Provenance by default

Every result must include the source provider and the effective rate date or timestamp.

## 4.4 Deterministic money calculations

Use decimal arithmetic. Never use native JavaScript floating-point math for final monetary calculations.

## 4.5 Small tool surface

The MCP server should expose a small number of well-designed tools. Too many overlapping tools make agent selection less reliable.

## 4.6 Self-discoverable

An agent should understand what the server does by reading the MCP server instructions, tool descriptions, schemas, resources, and examples.

## 4.7 Open-source and self-hostable

The full core product must run locally or on private infrastructure.

## 4.8 Provider-neutral

The internal domain model must not depend on one provider's response format.

## 4.9 Safe fallbacks

Fallback behavior must be visible. The system must not silently substitute a lower-quality rate.

## 4.10 Simple developer experience

A developer should be able to start the MCP server with one command and connect an agent in a few minutes.

---

# 5. Goals

## 5.1 Primary goals

1. Give AI agents current official exchange rates.
2. Support historical exchange rates.
3. Convert monetary amounts accurately.
4. Clearly identify rate type and freshness.
5. Provide source attribution and confidence information.
6. Support local MCP over stdio.
7. Support remote MCP over Streamable HTTP.
8. Provide a REST API with OpenAPI documentation.
9. Provide a provider-adapter architecture.
10. Support self-hosting through Docker.
11. Require no API key for the default official-reference mode.
12. Allow optional faster market-rate providers through bring-your-own-key configuration.
13. Make the project easy for agents and developers to discover and understand.
14. Provide strong tests, evaluation cases, and documentation.
15. Publish the project as reusable open-source infrastructure.

## 5.2 Secondary goals

1. Provide a TypeScript SDK.
2. Provide a command-line interface.
3. Provide a simple web playground.
4. Support provider comparison.
5. Explain differences between exchange-rate types.
6. Calculate estimated effective conversion after fees and spread.
7. Provide caching, health checks, and fallbacks.
8. Publish to the official MCP Registry when stable.

---

# 6. Non-Goals

The first stable release will not:

- Execute currency trades.
- Transfer money.
- Connect to bank accounts.
- Provide investment recommendations.
- Predict future exchange rates.
- Guarantee the exact rate offered by a bank, card network, exchange office, or payment processor.
- Operate as a trading terminal.
- Scrape websites as the primary data strategy.
- Store customer financial documents.
- Require user accounts.
- Include billing.
- Include a complex administration dashboard.
- Claim legal, accounting, or tax authority.
- Support cryptocurrency as a first-class requirement in version 1.
- Support unofficial parallel-market rates by default.
- Hide provider or data limitations.

---

# 7. Target Users

## 7.1 AI-agent end users

People using:

- Claude Code.
- Claude Desktop.
- Claude web or agent environments that support MCP.
- OpenAI agents and the Responses API.
- Codex.
- Cursor.
- Windsurf.
- Cline.
- VS Code agent extensions.
- Local AI assistants.

## 7.2 AI-agent platform builders

Companies building:

- No-code agent builders.
- Multi-agent orchestration systems.
- AI employee platforms.
- Workflow automation platforms.
- Customer-service agents.
- Browser agents.
- Voice agents.
- Enterprise copilots.

## 7.3 Application developers

Developers building:

- Travel applications.
- E-commerce systems.
- Invoice systems.
- Expense systems.
- Accounting tools.
- Procurement tools.
- Cross-border pricing systems.
- Reporting dashboards.
- International marketplaces.
- Financial data pipelines.

## 7.4 Self-hosting organizations

Organizations that need:

- Private infrastructure.
- Predictable behavior.
- Open-source code.
- No dependency on a proprietary gateway.
- Control over API keys.
- Internal auditability.
- Provider choice.

---

# 8. Core Jobs to Be Done

## 8.1 General conversion

> When a user asks an agent to convert an amount, the agent needs a trustworthy current rate and a correctly rounded result.

## 8.2 Historical invoice conversion

> When an agent analyzes an invoice, it needs the rate that applied on the invoice date, not today's rate.

## 8.3 Current international pricing

> When an agent compares products or services across countries, it needs a sufficiently fresh market or reference rate and must explain any limitations.

## 8.4 Accounting and reporting

> When an agent prepares a report, it needs official reference rates with a clear effective date and provider.

## 8.5 Rate trend analysis

> When an agent studies currency movement, it needs a normalized time series with consistent dates and missing-data handling.

## 8.6 Provider validation

> When a result appears unusual, an agent needs to compare providers and understand why rates differ.

## 8.7 Real-world received amount

> When a user asks how much they may actually receive, the agent needs to apply optional fixed fees, percentage fees, and spread.

---

# 9. Product Scope

The complete product contains the following components:

1. **Core currency domain package**
2. **Provider adapter system**
3. **Default Frankfurter provider**
4. **Optional provider plugins**
5. **Rate router**
6. **Freshness classifier**
7. **Confidence calculator**
8. **Money conversion engine**
9. **MCP server**
10. **REST API**
11. **OpenAPI specification**
12. **TypeScript SDK**
13. **CLI**
14. **Documentation website**
15. **Web playground**
16. **Docker image**
17. **Docker Compose setup**
18. **Automated tests**
19. **Agent evaluation suite**
20. **CI/CD and release automation**

---

# 10. Product Modes

## 10.1 Official Reference Mode

This is the default mode.

It is appropriate for:

- General questions.
- Reports.
- Historical conversions.
- Invoices.
- Research.
- Travel estimates.
- E-commerce display estimates.
- Expense calculations.
- Accounting support.

The default provider will be Frankfurter.

The server must label these results as `official_reference`.

It must not call them real-time.

## 10.2 Market Mode

This mode is optional and provider-dependent.

It is appropriate for:

- More current price estimates.
- Treasury monitoring.
- Rapidly changing markets.
- Checkout estimates.
- Cross-border pricing.

Users configure their own market-data provider API keys.

A market-mode result must be labeled based on provider capability, such as:

- `market_midpoint`
- `market_indicative`
- `bank_buy`
- `bank_sell`

## 10.3 Automatic Mode

The user or agent may request `auto`.

The router selects a source based on:

- Requested use case.
- Requested freshness.
- Configured providers.
- Provider availability.
- Currency support.
- Historical support.
- Cost policy.
- User preferences.

The response must still reveal the final selected mode and provider.

---

# 11. Locked Product Decisions

These decisions are considered final for the first implementation.

| Area | Decision |
|---|---|
| Main language | TypeScript |
| Runtime | Node.js 22 or newer |
| Package manager | pnpm |
| Monorepo | pnpm workspaces with Turborepo |
| HTTP framework | Fastify |
| MCP SDK | Official Model Context Protocol TypeScript SDK |
| Validation | Zod |
| Money arithmetic | Decimal.js |
| Logging | Pino |
| Tests | Vitest |
| Formatting and linting | Biome |
| API documentation | OpenAPI 3.1 and Scalar or Swagger UI |
| Default provider | Frankfurter |
| Cache | In-memory by default; optional Redis |
| Main remote transport | MCP Streamable HTTP |
| Local transport | MCP stdio |
| Containerization | Docker and Docker Compose |
| License | Apache-2.0 |
| Initial SDK | TypeScript |
| Initial hosted mode | Optional, not required for local completion |
| Database | No mandatory database for MVP |
| Authentication | None for local deployment; API-key middleware available for hosted deployments |

---

# 12. High-Level Architecture

```text
AI Agent / Developer Application
        |
        |-- MCP stdio
        |-- MCP Streamable HTTP
        |-- REST API
        |-- TypeScript SDK
        |-- CLI
        |
Interface Layer
        |
Application Services
        |
        |-- Conversion Service
        |-- Rate Query Service
        |-- Time-Series Service
        |-- Currency Metadata Service
        |-- Explanation Service
        |-- Provider Comparison Service
        |
Rate Router
        |
        |-- Provider capability matching
        |-- Freshness policy
        |-- Health status
        |-- Fallback policy
        |-- Cost policy
        |
Provider Adapters
        |
        |-- Frankfurter
        |-- ECB optional direct adapter
        |-- IMF optional adapter
        |-- Market provider adapters
        |-- Community provider adapters
        |
Normalization Layer
        |
        |-- Universal rate model
        |-- Currency metadata
        |-- Decimal conversion
        |-- Confidence score
        |-- Warnings
        |
Cache
        |
        |-- In-memory LRU
        |-- Optional Redis
```

---

# 13. Repository Structure

```text
openrates-agent/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── mcp/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── docs/
│   │   ├── content/
│   │   ├── public/
│   │   └── package.json
│   └── playground/
│       ├── src/
│       └── package.json
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── currency-metadata/
│   ├── provider-interface/
│   ├── provider-frankfurter/
│   ├── provider-ecb/
│   ├── provider-imf/
│   ├── provider-market-example/
│   ├── router/
│   ├── cache/
│   ├── sdk-typescript/
│   ├── cli/
│   ├── observability/
│   └── test-utils/
├── examples/
│   ├── claude-code/
│   ├── claude-desktop/
│   ├── openai-responses/
│   ├── cursor/
│   ├── windsuf/
│   ├── node/
│   └── docker/
├── evals/
│   ├── cases/
│   ├── runners/
│   └── reports/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/
├── .github/
│   └── workflows/
├── openapi/
│   └── openapi.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── LICENSE
├── CHANGELOG.md
├── llms.txt
├── llms-full.txt
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
├── tsconfig.base.json
└── .env.example
```

Correct the `windsuf` directory spelling to `windsurf` during implementation.

---

# 14. Universal Domain Model

All providers must be normalized into one internal model.

## 14.1 Currency code

```ts
type CurrencyCode = string;
```

Validation requirements:

- Convert input to uppercase.
- Require three characters for normal ISO currency codes.
- Validate against the supported currency catalogue.
- Return a clear error for unknown or unsupported codes.
- Support aliases before validation.

## 14.2 Rate type

```ts
type RateType =
  | "official_reference"
  | "market_midpoint"
  | "market_indicative"
  | "bank_buy"
  | "bank_sell"
  | "cash_buy"
  | "cash_sell"
  | "parallel_market"
  | "computed_cross";
```

## 14.3 Freshness classification

```ts
type FreshnessClass =
  | "live"
  | "recent"
  | "latest_available"
  | "latest_business_day"
  | "historical_exact_date"
  | "historical_previous_available_date"
  | "stale"
  | "unknown";
```

## 14.4 Rate mode

```ts
type RateMode = "official" | "market" | "auto";
```

## 14.5 Normalized rate record

```ts
interface NormalizedRate {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;

  rateType: RateType;
  mode: RateMode;

  effectiveDate: string;
  observedAt?: string;
  publishedAt?: string;
  retrievedAt: string;

  freshnessClass: FreshnessClass;
  freshnessSeconds?: number;
  isLive: boolean;
  isStale: boolean;

  providerId: string;
  providerName: string;
  originalSourceIds?: string[];

  calculationMethod: "direct" | "inverse" | "cross";
  crossCurrency?: string;

  confidenceScore: number;
  confidenceLabel: "high" | "medium" | "low";

  warnings: string[];
  metadata?: Record<string, unknown>;
}
```

## 14.6 Money conversion result

```ts
interface MoneyConversionResult {
  input: {
    amount: string;
    from: string;
    to: string;
  };

  rate: NormalizedRate;

  result: {
    unroundedAmount: string;
    roundedAmount: string;
    minorUnits: number;
    roundingMode: "half_even";
  };

  fees?: {
    fixedFee?: string;
    percentageFee?: string;
    spreadPercentage?: string;
    totalEstimatedCost?: string;
    estimatedReceivedAmount?: string;
  };

  disclaimer: string;
}
```

---

# 15. Currency Metadata

The product needs a local currency metadata package.

Each currency entry should contain:

```ts
interface CurrencyMetadata {
  code: string;
  numericCode?: string;
  name: string;
  minorUnits: number | null;
  status: "active" | "retired" | "fund" | "metal" | "special";
  countries: string[];
  symbols: string[];
  aliases: string[];
  introducedAt?: string;
  retiredAt?: string;
  replacedBy?: string;
}
```

The metadata package must support:

- Currency code lookup.
- Human-name lookup.
- Country-name lookup.
- Common alias lookup.
- Minor-unit lookup.
- Active or retired status.
- Replacement currency guidance.

Examples:

- `Saudi riyal` -> `SAR`
- `Turkish lira` -> `TRY`
- `Afghani` -> `AFN`
- `US dollar` -> `USD`
- `dollar` -> ambiguous; return clarification candidates
- `yuan` -> likely `CNY`, but explain `CNH` if market context is relevant
- `old Turkish lira` -> retired currency handling

Do not silently choose an ambiguous currency when multiple valid matches exist.

---

# 16. Provider Adapter Interface

Every provider must implement the same contract.

```ts
interface ExchangeRateProvider {
  id: string;
  name: string;

  capabilities(): Promise<ProviderCapabilities>;

  healthCheck(): Promise<ProviderHealth>;

  getLatestRate(input: LatestRateInput): Promise<ProviderRate>;

  getHistoricalRate(
    input: HistoricalRateInput
  ): Promise<ProviderRate>;

  getTimeSeries(
    input: TimeSeriesInput
  ): Promise<ProviderTimeSeries>;

  listCurrencies(): Promise<ProviderCurrency[]>;

  normalizeError(error: unknown): OpenRatesError;
}
```

## 16.1 Provider capabilities

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

## 16.2 Provider health

```ts
interface ProviderHealth {
  status: "healthy" | "degraded" | "unavailable";
  checkedAt: string;
  latencyMs?: number;
  lastSuccessfulRequestAt?: string;
  message?: string;
}
```

## 16.3 Provider requirements

Each adapter must:

- Use request timeouts.
- Retry only safe idempotent requests.
- Apply bounded exponential backoff.
- Normalize errors.
- Respect provider rate limits.
- Never log API keys.
- Include provider response timestamps when available.
- Clearly report unsupported pairs.
- Include provider attribution.
- Be independently testable.
- Include fixture-based contract tests.

---

# 17. Default Provider: Frankfurter

Frankfurter will be enabled by default.

## 17.1 Responsibilities

The adapter must support:

- Latest official rates.
- Historical rates.
- Date ranges.
- Currency list.
- Source attribution where available.
- Base and quote conversion.
- Previous available business-day handling.

## 17.2 Configuration

```env
OPENRATES_DEFAULT_PROVIDER=frankfurter
FRANKFURTER_BASE_URL=https://api.frankfurter.dev
FRANKFURTER_TIMEOUT_MS=5000
```

The base URL must be configurable so users can point OpenRates to their own Frankfurter deployment.

## 17.3 Classification

Frankfurter results must normally be classified as:

```text
mode: official
rateType: official_reference
isLive: false
```

## 17.4 Weekend behavior

When the user requests `latest` on a weekend or holiday:

- Return the latest available rate.
- Set freshness to `latest_business_day`.
- Include the effective date.
- Include a warning that no newer official rate was published.

When the user requests an exact historical date with no published rate:

- Default behavior: use the previous available published rate.
- Mark `freshnessClass` as `historical_previous_available_date`.
- Include both requested date and actual effective date.
- Allow `datePolicy: "strict"` to return an error instead.

---

# 18. Rate Router

The Rate Router chooses the provider.

## 18.1 Router input

```ts
interface RateRequestPolicy {
  mode: "official" | "market" | "auto";
  provider?: string;
  maxAgeSeconds?: number;
  allowFallback: boolean;
  datePolicy: "previous_available" | "strict";
  useCase?:
    | "general"
    | "accounting"
    | "invoice"
    | "travel"
    | "ecommerce"
    | "treasury"
    | "trading_reference"
    | "reporting";
}
```

## 18.2 Provider selection priority

1. Explicitly requested provider.
2. Provider matching requested mode.
3. Provider supporting the currency pair.
4. Provider supporting requested historical date.
5. Provider satisfying maximum age.
6. Healthy provider.
7. Preferred configured order.
8. Lowest-cost allowed provider.
9. Fallback provider, if permitted.

## 18.3 Fallback rules

- Fallback must never be invisible.
- If a market provider fails and an official provider is used, include a major warning.
- If `allowFallback` is false, return an error.
- If a provider's result is too old for `maxAgeSeconds`, do not use it unless fallback policy explicitly allows stale data.
- Never return a stale result as live.

## 18.4 Default policy by use case

| Use case | Default mode | Fallback |
|---|---|---|
| General | official | allowed |
| Accounting | official | allowed |
| Invoice | official | allowed |
| Reporting | official | allowed |
| Travel | auto | allowed |
| E-commerce | auto | allowed |
| Treasury | market | disabled unless configured |
| Trading reference | market | disabled unless configured |

---

# 19. Freshness Engine

Freshness is one of the product's most important features.

## 19.1 Time fields

The system must distinguish:

- `requestedAt`: when the user or agent made the request.
- `effectiveDate`: the date the rate applies to.
- `observedAt`: when the market value was observed, if available.
- `publishedAt`: when the provider published the value, if available.
- `retrievedAt`: when OpenRates fetched it.

## 19.2 Live classification

A result can be marked `live` only when:

- The provider supports intraday rates.
- The provider gives a reliable observation or publication timestamp.
- The rate age is inside the configured live threshold.
- The provider adapter classifies the rate as market data.

Default thresholds:

```env
OPENRATES_LIVE_THRESHOLD_SECONDS=300
OPENRATES_RECENT_THRESHOLD_SECONDS=3600
```

## 19.3 Daily official rates

Daily official rates must be classified as:

- `latest_available`
- `latest_business_day`
- `historical_exact_date`
- `historical_previous_available_date`

They must never set `isLive: true`.

## 19.4 Stale data

A rate is stale when:

- It exceeds the provider-specific expected update interval plus tolerance.
- It exceeds `maxAgeSeconds`.
- Its source timestamp is unavailable and the retrieved cache entry is too old.

A stale result may only be returned when explicitly allowed.

---

# 20. Confidence Score

The confidence score helps agents reason about result quality. It is not a prediction of market accuracy.

## 20.1 Score range

```text
0.00 to 1.00
```

## 20.2 Factors

Suggested initial formula:

- Provider trust: 40%
- Source timestamp availability: 15%
- Freshness match: 20%
- Direct pair availability: 10%
- Provider health: 10%
- Cross-provider agreement: 5%

## 20.3 Labels

```text
0.85 to 1.00 = high
0.60 to 0.84 = medium
0.00 to 0.59 = low
```

## 20.4 Rules

- Official central-bank reference data may receive high confidence for reporting use cases even if it is not intraday.
- A stale market rate must not receive high confidence.
- A computed cross-rate may reduce confidence.
- If providers strongly disagree, reduce confidence and include a warning.
- The response must explain major confidence reductions.

---

# 21. MCP Server Requirements

The MCP server is the main product interface.

## 21.1 Transports

Support:

1. `stdio` for local clients.
2. Streamable HTTP at `/mcp` for remote clients.

## 21.2 Server information

The server must identify itself as:

```json
{
  "name": "openrates-agent",
  "title": "OpenRates Agent Gateway",
  "version": "1.0.0"
}
```

## 21.3 Server instructions

The MCP server instructions must tell agents:

- Use OpenRates whenever a task requires a current or historical currency rate.
- Do not use model memory for current rates.
- Use official mode for accounting, invoices, reporting, and general reference.
- Use market mode only when the user needs a more current indicative rate and a market provider is configured.
- Always mention the effective date and rate type in user-facing answers.
- Mention fees and spread when relevant.
- Never describe an official daily rate as live.
- Ask for clarification only when the currency itself is ambiguous.

## 21.4 MCP tools

Version 1 must expose exactly these six core tools:

1. `convert_currency`
2. `get_exchange_rate`
3. `get_exchange_rate_series`
4. `list_currencies`
5. `compare_exchange_rate_providers`
6. `explain_exchange_rate`

Avoid adding overlapping tools until evaluation proves they are necessary.

---

# 22. MCP Tool: `convert_currency`

## 22.1 Purpose

Convert an amount from one currency to another.

## 22.2 Input schema

```ts
{
  amount: string;
  from: string;
  to: string;

  date?: string; // YYYY-MM-DD or "latest"
  mode?: "official" | "market" | "auto";
  provider?: string;
  useCase?: string;

  datePolicy?: "previous_available" | "strict";
  allowFallback?: boolean;
  maxAgeSeconds?: number;

  fixedFee?: string;
  percentageFee?: string;
  spreadPercentage?: string;

  responseDetail?: "compact" | "standard" | "full";
}
```

## 22.3 Defaults

```text
date = latest
mode = auto
datePolicy = previous_available
allowFallback = true
responseDetail = standard
```

## 22.4 Behavior

- Resolve currency aliases.
- Validate amount as a decimal string.
- Reject negative amounts unless a future use case explicitly supports them.
- Return zero correctly for zero amount.
- If source and target are identical, return rate `1`.
- Query the selected provider.
- Use Decimal.js for multiplication.
- Round according to target minor units.
- Use banker's rounding (`half_even`).
- Apply optional fees and spread.
- Include warnings and disclaimer.

## 22.5 Example compact output

```json
{
  "from": "USD",
  "to": "EUR",
  "amount": "1000.00",
  "rate": "0.865421",
  "convertedAmount": "865.42",
  "rateType": "official_reference",
  "effectiveDate": "2026-06-12",
  "provider": "frankfurter",
  "freshness": "latest_business_day",
  "warning": "Actual providers may add fees or spread."
}
```

---

# 23. MCP Tool: `get_exchange_rate`

## 23.1 Purpose

Return the rate between two currencies without converting an amount.

## 23.2 Input schema

```ts
{
  base: string;
  quote: string;

  date?: string;
  mode?: "official" | "market" | "auto";
  provider?: string;
  useCase?: string;

  datePolicy?: "previous_available" | "strict";
  allowFallback?: boolean;
  maxAgeSeconds?: number;

  responseDetail?: "compact" | "standard" | "full";
}
```

## 23.3 Behavior

- Return direct, inverse, or cross rate.
- Explain the calculation method.
- Return the actual effective date.
- Return provider and freshness.
- Return confidence.
- Return warnings.
- Return inverse rate in full response mode.

---

# 24. MCP Tool: `get_exchange_rate_series`

## 24.1 Purpose

Return a historical rate time series.

## 24.2 Input schema

```ts
{
  base: string;
  quote: string;
  startDate: string;
  endDate: string;

  interval?: "day" | "week" | "month";
  mode?: "official" | "market";
  provider?: string;
  fillPolicy?: "none" | "previous";
  responseDetail?: "compact" | "standard" | "full";
}
```

## 24.3 Limits

Default public limits:

- Maximum daily range: 5 years.
- Maximum returned points: 2,000.
- Larger self-hosted limits configurable by environment variable.

## 24.4 Behavior

- Return ordered points.
- Clearly mark filled dates.
- Do not invent values.
- For `fillPolicy: previous`, copy the previous published rate and mark `filled: true`.
- Support weekly and monthly aggregation.
- Document whether aggregation uses period-end or average.
- Default aggregation: period-end.

---

# 25. MCP Tool: `list_currencies`

## 25.1 Purpose

Discover supported currencies and resolve ambiguous names.

## 25.2 Input schema

```ts
{
  query?: string;
  status?: "active" | "retired" | "all";
  provider?: string;
  limit?: number;
}
```

## 25.3 Behavior

- Without a query, return supported active currencies.
- With a query, search code, name, country, symbol, and aliases.
- Return ambiguity candidates.
- Include provider support.
- Include minor units.
- Include retired status.

---

# 26. MCP Tool: `compare_exchange_rate_providers`

## 26.1 Purpose

Compare the same currency pair across enabled providers.

## 26.2 Input schema

```ts
{
  base: string;
  quote: string;
  date?: string;
  providers?: string[];
  mode?: "official" | "market" | "auto";
  maxProviders?: number;
}
```

## 26.3 Behavior

- Query providers in parallel with concurrency limits.
- Return successful and failed providers separately.
- Calculate percentage difference from the median.
- Do not claim one provider is correct only because it is near the median.
- Explain rate-type differences.
- Flag large disagreement.

## 26.4 Default disagreement threshold

```env
OPENRATES_PROVIDER_DISAGREEMENT_PERCENT=1.0
```

For managed or pegged currencies, allow provider-specific thresholds later.

---

# 27. MCP Tool: `explain_exchange_rate`

## 27.1 Purpose

Explain exchange-rate concepts in simple language.

## 27.2 Input schema

```ts
{
  topic:
    | "official_vs_market"
    | "buy_vs_sell"
    | "mid_market"
    | "fees_and_spread"
    | "freshness"
    | "cross_rate"
    | "weekend_rate"
    | "currency_alias"
    | "provider_difference";
  context?: {
    base?: string;
    quote?: string;
    provider?: string;
  };
}
```

## 27.3 Behavior

Return a short, structured explanation suitable for an AI agent to include in a user-facing answer.

This tool should use local documentation and rules. It should not require an external provider call unless context comparison is necessary.

---

# 28. MCP Resources

Expose these read-only resources:

```text
openrates://docs/quickstart
openrates://docs/tool-selection
openrates://docs/rate-types
openrates://docs/freshness
openrates://docs/errors
openrates://providers
openrates://currencies
openrates://capabilities
openrates://license
```

Resources should be short, structured, and easy for agents to read.

---

# 29. MCP Prompts

Prompts are optional in the first release but recommended.

Suggested prompts:

- `convert_invoice_amount`
- `compare_international_prices`
- `prepare_currency_report`
- `explain_rate_to_user`

Prompts must not create a dependency on the UI. They are convenience templates only.

---

# 30. REST API

Base path:

```text
/v1
```

## 30.1 Endpoints

```text
GET  /v1/capabilities
GET  /v1/providers
GET  /v1/providers/:providerId
GET  /v1/currencies
GET  /v1/currencies/:code
GET  /v1/rates
GET  /v1/rates/series
POST /v1/convert
GET  /v1/health
GET  /v1/ready
GET  /openapi.json
GET  /docs
POST /mcp
```

## 30.2 `GET /v1/rates`

Example:

```text
GET /v1/rates?base=USD&quote=EUR&date=latest&mode=official
```

## 30.3 `POST /v1/convert`

Request:

```json
{
  "amount": "1000.00",
  "from": "USD",
  "to": "EUR",
  "date": "latest",
  "mode": "official"
}
```

## 30.4 Standard API envelope

Success:

```json
{
  "success": true,
  "data": {},
  "requestId": "req_...",
  "generatedAt": "2026-06-14T20:00:00Z"
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_CURRENCY",
    "message": "The currency code XYZ is not supported.",
    "details": {},
    "retryable": false
  },
  "requestId": "req_..."
}
```

---

# 31. Error Model

## 31.1 Error codes

```text
INVALID_REQUEST
INVALID_AMOUNT
INVALID_DATE
AMBIGUOUS_CURRENCY
UNSUPPORTED_CURRENCY
UNSUPPORTED_PAIR
UNSUPPORTED_MODE
UNSUPPORTED_DATE_RANGE
PROVIDER_NOT_CONFIGURED
PROVIDER_AUTHENTICATION_FAILED
PROVIDER_RATE_LIMITED
PROVIDER_TIMEOUT
PROVIDER_UNAVAILABLE
RATE_NOT_AVAILABLE
RATE_TOO_STALE
STRICT_DATE_NOT_AVAILABLE
FALLBACK_NOT_ALLOWED
CACHE_ERROR
INTERNAL_ERROR
```

## 31.2 Error requirements

Every error must include:

- Stable machine-readable code.
- Simple human-readable message.
- Retryable boolean.
- Relevant details.
- Suggested correction when possible.
- No secret values.
- Request ID.

## 31.3 Agent-friendly recovery

Examples:

- For ambiguous `dollar`, return likely codes and ask the agent to choose.
- For missing market provider, suggest using official mode or configuring a provider.
- For unavailable weekend date in strict mode, suggest `previous_available`.
- For rate limiting, include retry guidance when known.

---

# 32. Caching

## 32.1 Cache layers

1. In-process LRU cache enabled by default.
2. Optional Redis for multi-instance deployments.

## 32.2 Cache keys

Cache keys must include:

- Provider.
- Base currency.
- Quote currency.
- Date.
- Mode.
- Relevant provider options.

## 32.3 Suggested TTLs

| Data | TTL |
|---|---:|
| Currency metadata | 24 hours |
| Provider capabilities | 1 hour |
| Provider health | 30 seconds |
| Official latest rate | 15 minutes |
| Historical rate | 7 days |
| Historical time series | 24 hours |
| Market live rate | Provider update interval or lower |
| Error negative cache | 30 seconds |

## 32.4 Cache response metadata

A full response should indicate:

```ts
{
  cache: {
    hit: boolean;
    storedAt?: string;
    ageSeconds?: number;
  }
}
```

## 32.5 Stale-while-revalidate

May be enabled for official rates.

If stale data is returned during revalidation:

- Mark it as stale.
- Include its cache age.
- Do not call it latest.
- Respect request policy.

---

# 33. Precision and Rounding

## 33.1 Input

Amounts and rates must enter the system as strings.

## 33.2 Internal calculations

Use Decimal.js.

## 33.3 Rate precision

Preserve provider precision.

For calculated inverse or cross rates:

- Use at least 18 significant decimal digits internally.
- Return a configurable display precision.
- Default returned rate precision: 8 decimal places, while preserving full precision in full-detail responses.

## 33.4 Monetary rounding

- Round converted amount to target currency minor units.
- Default rounding mode: half-even.
- Return unrounded amount in full response.
- If minor units are unknown, default to 2 and include a warning.

## 33.5 Fees

Fee order:

1. Calculate gross converted amount.
2. Apply spread if provided.
3. Apply percentage fee.
4. Apply fixed fee.
5. Round final received amount.

The exact calculation order must be documented and tested.

---

# 34. Security Requirements

## 34.1 General

- Validate all input with Zod.
- Set request-body limits.
- Set URL and query-length limits.
- Use outbound request timeouts.
- Prevent arbitrary provider URLs from request input.
- Allow provider base URLs only through trusted configuration.
- Never execute shell commands from MCP input.
- Never read arbitrary files from MCP input.
- Never expose environment variables.
- Redact secrets in logs.
- Use secure HTTP headers.
- Disable detailed stack traces in production responses.

## 34.2 API keys

- Provider keys come from environment variables.
- Keys must never be returned through capabilities endpoints.
- Logs must redact known secret fields.
- Hosted deployments may use an OpenRates API key middleware.
- Local deployments require no OpenRates key.

## 34.3 SSRF protection

- Provider endpoints must be configured at startup.
- Runtime requests cannot supply arbitrary URLs.
- Optional custom provider URLs must pass an allowlist policy.
- Block loopback, link-local, and private ranges unless explicitly enabled for self-hosting.

## 34.4 Rate limiting

Hosted deployments should support:

- Requests per minute by API key.
- Requests per minute by IP.
- Separate limits for expensive comparison and time-series endpoints.
- Standard rate-limit response headers.

Local deployments may disable rate limiting.

## 34.5 Dependency security

CI must run:

- Dependency audit.
- Secret scanning.
- Static analysis.
- License checks.
- Container vulnerability scanning.

---

# 35. Privacy Requirements

The core product should process minimal data.

Do not store:

- User conversations.
- Financial documents.
- Personal identity.
- Bank information.
- Raw MCP message history.

Logs may include:

- Request ID.
- Tool or endpoint name.
- Currency pair.
- Provider.
- Latency.
- Status code.
- Cache hit.
- Error code.

Amount logging must be disabled by default.

Provide:

```env
OPENRATES_LOG_AMOUNTS=false
OPENRATES_TELEMETRY=false
```

Telemetry must be opt-in for self-hosted installations.

---

# 36. Observability

## 36.1 Metrics

Expose Prometheus-compatible metrics optionally.

Required metrics:

- Request count.
- Request latency.
- Provider latency.
- Provider error count.
- Cache hit rate.
- Rate freshness.
- Fallback count.
- MCP tool usage.
- REST endpoint usage.
- Currency-pair usage without amounts.
- Provider disagreement count.

## 36.2 Tracing

Support OpenTelemetry.

Trace stages:

- Request validation.
- Currency resolution.
- Router selection.
- Cache lookup.
- Provider call.
- Normalization.
- Conversion.
- Response serialization.

## 36.3 Logging

Use structured Pino logs.

Log levels:

- `debug`
- `info`
- `warn`
- `error`

Every log should include request ID when relevant.

## 36.4 Health endpoints

`/v1/health`:

- Process is running.

`/v1/ready`:

- Required provider is reachable or cached official data is available.
- Optional dependencies are reported separately.

---

# 37. Agent Discoverability

The project must be discoverable by both MCP-aware agents and web/coding agents.

## 37.1 MCP discovery

Provide:

- Accurate server name.
- Detailed server instructions.
- High-quality tool descriptions.
- JSON schemas with descriptions for every field.
- MCP resources.
- Examples in tool descriptions.
- Clear errors and recovery suggestions.

## 37.2 Repository discovery

The root README must immediately explain:

1. What the project does.
2. Why agents need it.
3. One-command local installation.
4. Claude Code configuration.
5. Remote MCP configuration.
6. REST example.
7. Main safety promise.
8. Provider and freshness behavior.

## 37.3 Machine-readable documentation

Publish:

- `/openapi.json`
- `/llms.txt`
- `/llms-full.txt`
- `/v1/capabilities`
- `/v1/providers`
- MCP resources
- Package metadata with useful keywords

`llms.txt` is an optional discoverability aid, not a replacement for MCP or OpenAPI.

## 37.4 Registry publication

After version 1.0 stability:

- Publish npm packages.
- Publish Docker image.
- Publish MCP server metadata.
- Submit to the official MCP Registry.
- Add example integrations to popular agent clients.

---

# 38. Documentation Requirements

Documentation must be simple enough for a junior developer.

## 38.1 Required documents

- `README.md`
- `docs/quickstart.md`
- `docs/mcp.md`
- `docs/rest-api.md`
- `docs/providers.md`
- `docs/self-hosting.md`
- `docs/freshness.md`
- `docs/rate-types.md`
- `docs/precision-and-rounding.md`
- `docs/security.md`
- `docs/troubleshooting.md`
- `docs/adding-a-provider.md`
- `docs/architecture.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`

## 38.2 Documentation style

- Short sentences.
- Explain technical words.
- Use examples before deep explanations.
- Show copy-paste commands.
- Do not assume finance knowledge.
- Do not call all rates live.
- Clearly separate official and market data.
- Include expected output.
- Include common errors.
- Include Claude Code and OpenAI examples.

## 38.3 Provider documentation

Each provider page must explain:

- Data type.
- Update frequency.
- Historical support.
- API-key requirement.
- License or terms considerations.
- Supported currencies.
- Known limitations.
- Whether OpenRates can call it live.

---

# 39. Web Playground

The playground is a lightweight testing interface, not a full dashboard.

## 39.1 Features

- Select base currency.
- Select quote currency.
- Enter amount.
- Select mode.
- Select provider.
- Select date.
- Convert.
- View full normalized response.
- View freshness and provider.
- Copy REST request.
- Copy MCP tool input.
- Test time series.
- Compare providers.
- Display warnings prominently.

## 39.2 Design

- Minimal.
- Fast.
- Responsive.
- Accessible.
- No account required.
- No unnecessary animations.
- Clear distinction between official and market rates.

---

# 40. CLI

Package name:

```text
@openrates/cli
```

Commands:

```bash
openrates rate USD EUR
openrates convert 1000 USD EUR
openrates convert 1000 USD EUR --date 2026-01-15
openrates series USD TRY --from 2026-01-01 --to 2026-06-01
openrates currencies --search riyal
openrates providers
openrates doctor
openrates mcp --stdio
```

Requirements:

- Human-readable output by default.
- `--json` for machine-readable output.
- Non-zero exit codes for failures.
- No secrets in output.
- `doctor` validates provider and environment configuration.

---

# 41. TypeScript SDK

Package name:

```text
@openrates/sdk
```

Example:

```ts
import { OpenRatesClient } from "@openrates/sdk";

const client = new OpenRatesClient({
  baseUrl: "http://localhost:3000",
});

const result = await client.convert({
  amount: "1000.00",
  from: "USD",
  to: "EUR",
  mode: "official",
});
```

SDK requirements:

- Fully typed.
- Supports AbortSignal.
- Supports retries for safe requests.
- Preserves decimal strings.
- Exposes error classes.
- Works in Node and modern browsers.
- Generated partly from OpenAPI where practical.
- Includes examples.

---

# 42. Configuration

Required `.env.example`:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

OPENRATES_DEFAULT_PROVIDER=frankfurter
OPENRATES_PROVIDER_ORDER=frankfurter
OPENRATES_ALLOW_FALLBACK=true

FRANKFURTER_BASE_URL=https://api.frankfurter.dev
FRANKFURTER_TIMEOUT_MS=5000

OPENRATES_CACHE_DRIVER=memory
OPENRATES_MEMORY_CACHE_MAX_ITEMS=10000
REDIS_URL=

OPENRATES_LIVE_THRESHOLD_SECONDS=300
OPENRATES_RECENT_THRESHOLD_SECONDS=3600
OPENRATES_PROVIDER_DISAGREEMENT_PERCENT=1.0

OPENRATES_LOG_LEVEL=info
OPENRATES_LOG_AMOUNTS=false
OPENRATES_TELEMETRY=false

OPENRATES_API_AUTH_ENABLED=false
OPENRATES_API_KEYS=

OPENRATES_RATE_LIMIT_ENABLED=false
OPENRATES_RATE_LIMIT_PER_MINUTE=120

OPENRATES_MAX_SERIES_POINTS=2000
OPENRATES_MAX_DAILY_RANGE_YEARS=5
```

Provider-specific market keys should follow a consistent convention:

```env
OPENRATES_PROVIDER_<NAME>_API_KEY=
OPENRATES_PROVIDER_<NAME>_BASE_URL=
OPENRATES_PROVIDER_<NAME>_ENABLED=false
```

---

# 43. Performance Requirements

## 43.1 Latency targets

For cached requests:

- p50 under 50 ms.
- p95 under 150 ms.

For uncached official-provider requests:

- p50 under 500 ms.
- p95 under 1,500 ms, excluding provider outage.

For provider comparison:

- p95 under 3,000 ms with parallel calls.

## 43.2 Availability

Self-hosted availability depends on the deployment.

A future public hosted service should target:

- 99.9% monthly API availability.
- Health and status page.
- Graceful degradation when optional providers fail.

## 43.3 Resource targets

Base Docker container:

- Under 300 MB compressed where practical.
- Idle memory under 256 MB.
- Runs on one small CPU instance for moderate usage.

---

# 44. Testing Strategy

## 44.1 Unit tests

Test:

- Currency alias resolution.
- Currency validation.
- Decimal conversion.
- Rounding.
- Fee calculations.
- Spread calculations.
- Freshness classification.
- Confidence scoring.
- Router selection.
- Fallback policy.
- Error normalization.
- Cross-rate calculations.
- Inverse-rate calculations.

## 44.2 Provider contract tests

Every provider adapter must pass the same contract suite:

- Latest rate.
- Historical rate.
- Unsupported currency.
- Timeout.
- Rate limit.
- Invalid credentials.
- Missing date.
- Provider malformed response.
- Currency list.
- Health check.

Use fixtures for deterministic CI.

Optional live integration tests should run separately.

## 44.3 MCP tests

Test:

- Tool discovery.
- Tool schema correctness.
- Tool descriptions.
- Compact, standard, and full responses.
- MCP error responses.
- stdio transport.
- Streamable HTTP transport.
- Resource discovery.
- Agent tool-selection evaluation.

## 44.4 REST tests

Test:

- OpenAPI schema validation.
- Endpoint success.
- Invalid query.
- Invalid body.
- Rate limiting.
- API authentication.
- Error envelope.
- Request IDs.
- CORS configuration.
- Security headers.

## 44.5 End-to-end tests

Required scenarios:

1. Convert USD to EUR with latest official rate.
2. Convert EUR to SAR.
3. Convert USD to TRY.
4. Convert USD to AFN.
5. Request the same currency pair.
6. Request zero amount.
7. Request historical weekend date.
8. Request strict missing date.
9. Request unsupported currency.
10. Request ambiguous `dollar`.
11. Provider timeout with fallback.
12. Provider timeout without fallback.
13. Stale market rate.
14. Compare two providers.
15. Calculate fees and spread.
16. Return a monthly time series.
17. Run through Claude Code MCP client.
18. Call from OpenAI-compatible remote MCP client.
19. Run Docker Compose from a clean machine.
20. Use the CLI.

## 44.6 Property tests

Use generated inputs for:

- Amount precision.
- Currency combinations.
- Inverse-rate consistency.
- Cross-rate consistency.
- Rounding boundaries.
- Large amounts.
- Very small amounts.

## 44.7 Snapshot tests

Use snapshots for:

- MCP tool definitions.
- OpenAPI document.
- Standard error objects.
- Full normalized responses.

---

# 45. Agent Evaluation Suite

Normal software tests are not enough. The product must test whether agents use it correctly.

## 45.1 Evaluation goals

Measure whether an agent:

- Selects OpenRates for current-rate questions.
- Chooses the correct tool.
- Selects official mode for accounting.
- Selects market mode only when appropriate.
- Mentions effective date.
- Mentions rate type.
- Does not say live when the result is daily.
- Handles ambiguity.
- Handles fallback warning.
- Explains fees and spread.

## 45.2 Evaluation prompts

Examples:

- “How much is 500 USD in Turkish lira right now?”
- “Convert this invoice from EUR to SAR using the invoice date.”
- “What was 1,000 GBP worth in USD last Sunday?”
- “Use the exact date and fail if no rate was published.”
- “How much will I receive after a 2% fee and 1% spread?”
- “Why is my bank's exchange rate different?”
- “Compare available providers for USD/TRY.”
- “Convert 1,000 dollars to riyals.”  
  Expected: detect ambiguity for dollar or infer USD only when context strongly supports it.

## 45.3 Pass criteria

Before version 1.0:

- Correct tool selection in at least 95% of standard cases.
- No official daily response described as live in the evaluation set.
- Effective date included in at least 95% of user-facing answers.
- Correct ambiguity handling in at least 90% of ambiguous cases.
- No hallucinated provider names.
- No silent fallback.

---

# 46. CI/CD

## 46.1 Pull request workflow

Run:

1. Install dependencies.
2. Type check.
3. Lint.
4. Format check.
5. Unit tests.
6. Contract tests with fixtures.
7. REST tests.
8. MCP tests.
9. Build packages.
10. Validate OpenAPI.
11. Dependency audit.
12. Secret scan.
13. License scan.
14. Docker build.

## 46.2 Main branch workflow

- Run all pull-request checks.
- Run optional live provider tests using protected secrets.
- Build Docker image.
- Generate documentation.
- Publish preview artifacts.

## 46.3 Release workflow

Use Changesets or an equivalent system.

On release:

- Update changelog.
- Tag GitHub release.
- Publish npm packages.
- Publish Docker images.
- Publish documentation.
- Attach checksums.
- Generate software bill of materials.
- Sign release artifacts where practical.

---

# 47. Docker and Self-Hosting

## 47.1 Docker command

```bash
docker run --rm -p 3000:3000 ghcr.io/openrates/openrates-agent:latest
```

## 47.2 Docker Compose

Services:

- `openrates`
- Optional `redis`
- Optional self-hosted `frankfurter`

## 47.3 Required self-hosting documentation

Explain:

- Basic deployment.
- Redis deployment.
- Private Frankfurter deployment.
- Reverse proxy.
- HTTPS.
- API-key authentication.
- Rate limiting.
- Logging.
- Backups, if Redis persistence is enabled.
- Upgrades.
- Health checks.

---

# 48. Open-Source Governance

## 48.1 License

Use Apache-2.0 for code.

Do not claim that upstream provider data has the same license.

## 48.2 Contribution model

- Public issues.
- Feature request template.
- Bug report template.
- Provider adapter proposal template.
- Pull request template.
- Contributor guide.
- Code of conduct.

## 48.3 Provider acceptance requirements

A new provider adapter must document:

- Official provider name.
- Terms of use.
- Authentication.
- Update frequency.
- Rate type.
- Supported currencies.
- Attribution requirements.
- Commercial restrictions.
- Historical availability.
- Test fixtures.
- Maintainer.

## 48.4 Security reports

Publish a `SECURITY.md` with private reporting instructions.

---

# 49. Legal and Data Considerations

The software is open-source, but data providers have their own terms.

The project must:

- Keep provider adapters separate.
- Document provider terms.
- Avoid redistributing data when terms do not allow it.
- Allow users to bring their own API key.
- Include attribution required by providers.
- Avoid implying that all rates are executable.
- Include a general informational disclaimer.
- Avoid calling the product a bank or financial institution.
- Avoid promising financial accuracy beyond the source.

Recommended disclaimer:

> OpenRates provides informational exchange-rate data. Actual rates offered by banks, card networks, payment processors, exchanges, or money-transfer services may differ because of spreads, fees, timing, location, liquidity, and provider policies.

---

# 50. User Stories and Acceptance Criteria

## 50.1 Agent converts a current amount

**As an AI agent**, I need to convert money using a current rate.

Acceptance criteria:

- Tool returns a decimal-string rate.
- Tool returns converted amount.
- Tool returns rate type.
- Tool returns effective date.
- Tool returns provider.
- Tool returns freshness.
- Tool warns about fees and spread.
- Official rate is not labeled live.

## 50.2 Agent converts an invoice by date

Acceptance criteria:

- Agent can pass a date.
- Exact published date is used when available.
- Previous available date is used by default when unavailable.
- Requested and actual dates are both returned.
- Strict mode fails clearly.

## 50.3 Agent needs a truly recent market rate

Acceptance criteria:

- Market provider must be configured.
- Rate includes observation or publication time when available.
- Rate has freshness seconds.
- Rate is marked live only within threshold.
- Missing market provider returns clear guidance.

## 50.4 Agent handles provider outage

Acceptance criteria:

- Router detects failure.
- Fallback follows policy.
- Response identifies fallback provider.
- Warning explains quality or mode change.
- No fallback occurs when disabled.

## 50.5 Developer adds a provider

Acceptance criteria:

- Provider interface is documented.
- Example adapter exists.
- Contract test suite is reusable.
- Adapter can be enabled by configuration.
- Provider appears in capabilities endpoint.

## 50.6 Agent discovers the server without prior knowledge

Acceptance criteria:

- MCP server instructions explain usage.
- Tools have complete descriptions.
- Tool schemas describe every field.
- Resources explain rate types and freshness.
- Agent evaluation shows correct tool selection.

---

# 51. MVP Definition

The MVP is complete when all of the following exist:

## Core

- Monorepo initialized.
- Shared schemas.
- Currency metadata.
- Decimal conversion engine.
- Freshness engine.
- Confidence engine.
- Rate router.
- In-memory cache.

## Provider

- Frankfurter adapter.
- Provider contract tests.
- Health check.
- Configurable Frankfurter base URL.

## MCP

- stdio server.
- Streamable HTTP server.
- Six tools.
- Required resources.
- Agent-friendly instructions.

## REST

- Main endpoints.
- OpenAPI 3.1 document.
- Interactive docs.
- Standard errors.
- Request IDs.

## Developer experience

- README quick start.
- `.env.example`.
- Docker image.
- Docker Compose.
- TypeScript SDK.
- CLI.
- Examples for Claude Code and OpenAI remote MCP.

## Quality

- Unit tests.
- Integration tests.
- End-to-end tests.
- Agent evaluations.
- CI workflow.
- Security documentation.
- License.

---

# 52. Version 1.0 Definition of Done

Version 1.0 is complete only when:

1. All MVP requirements are complete.
2. Public APIs are documented.
3. MCP schemas are stable.
4. Test coverage is at least 85% for core packages.
5. Critical money and routing modules have at least 95% coverage.
6. All required end-to-end scenarios pass.
7. Agent evaluation pass criteria are met.
8. Docker setup works from a clean environment.
9. npm packages install correctly.
10. No critical or high-severity known security issue remains.
11. Provider terms and attribution are documented.
12. A versioned changelog exists.
13. A migration policy exists for breaking API changes.
14. Examples run successfully.
15. The repository can be understood by a junior developer from the README.

---

# 53. Implementation Phases

## Phase 0: Project foundation

Build:

- Monorepo.
- TypeScript configuration.
- Biome.
- Vitest.
- CI.
- Shared error model.
- Shared schema package.
- Logging.
- Configuration validation.

Exit criteria:

- All packages build.
- Tests run.
- CI passes.

## Phase 1: Currency core

Build:

- Currency metadata.
- Alias resolver.
- Decimal money engine.
- Rounding.
- Rate model.
- Freshness classifier.
- Confidence score.
- Fee and spread calculator.

Exit criteria:

- Unit tests cover all core calculations.
- No native number arithmetic in monetary paths.

## Phase 2: Frankfurter provider

Build:

- Adapter.
- Latest rate.
- Historical rate.
- Time series.
- Currency list.
- Health check.
- Error normalization.
- Fixtures and contract tests.

Exit criteria:

- Official conversion works end to end.
- Weekend and strict-date behavior work.

## Phase 3: Router and cache

Build:

- Provider registry.
- Router.
- Fallback policies.
- In-memory cache.
- Optional Redis abstraction.
- Provider health state.

Exit criteria:

- Fallback behavior is observable.
- Cache tests pass.
- Stale data cannot be mislabeled.

## Phase 4: REST API

Build:

- Fastify server.
- Endpoints.
- OpenAPI.
- Docs.
- Errors.
- Request IDs.
- Security headers.
- Optional authentication and rate limiting.

Exit criteria:

- REST end-to-end suite passes.
- OpenAPI validates.

## Phase 5: MCP server

Build:

- stdio transport.
- Streamable HTTP.
- Six tools.
- Resources.
- Instructions.
- Tool tests.

Exit criteria:

- Claude Code can connect.
- Remote MCP client can connect.
- Tool discovery is correct.

## Phase 6: SDK and CLI

Build:

- TypeScript SDK.
- CLI.
- Examples.
- `doctor` command.

Exit criteria:

- SDK and CLI pass integration tests.
- Copy-paste examples work.

## Phase 7: Documentation and playground

Build:

- Documentation site.
- Full guides.
- Web playground.
- `llms.txt`.
- `llms-full.txt`.

Exit criteria:

- A new user can run a conversion without reading source code.

## Phase 8: Market provider framework

Build:

- Generic provider template.
- One sample BYOK market adapter.
- Market freshness rules.
- Provider comparison.
- Parallel calls.

Exit criteria:

- Official and market modes are visibly different.
- Live classification is tested.

## Phase 9: Release hardening

Build:

- Docker optimization.
- Security scanning.
- Release automation.
- MCP Registry metadata.
- Performance tests.
- Final agent evaluation.

Exit criteria:

- Version 1.0 definition of done is satisfied.

---

# 54. Suggested Package Responsibilities

## `@openrates/core`

- Conversion.
- Rounding.
- Fees.
- Rate calculations.
- Freshness.
- Confidence.

## `@openrates/schemas`

- Zod schemas.
- Public TypeScript types.
- Error codes.
- API envelopes.

## `@openrates/currency-metadata`

- Currency catalogue.
- Aliases.
- Minor units.
- Search.

## `@openrates/provider-interface`

- Provider contract.
- Capability model.
- Health model.
- Test contract helpers.

## `@openrates/provider-frankfurter`

- Frankfurter API integration.
- Response normalization.
- Fixtures.

## `@openrates/router`

- Provider registry.
- Selection.
- Fallback.
- Provider comparison.

## `@openrates/cache`

- Cache interface.
- Memory implementation.
- Redis implementation.

## `@openrates/sdk`

- TypeScript client.
- Error classes.

## `@openrates/cli`

- Terminal commands.
- MCP stdio launcher.

---

# 55. API Versioning

Use `/v1` for REST.

MCP tool names should remain stable.

Breaking changes require:

- Major semantic version.
- Changelog.
- Migration guide.
- Deprecation period where practical.

Additive response fields are allowed.

Do not change the meaning of existing fields without a major version.

---

# 56. Response Detail Modes

## Compact

For agents that need a short answer.

Includes:

- Rate.
- Converted amount when applicable.
- Rate type.
- Effective date.
- Provider.
- Main warning.

## Standard

Default.

Includes:

- All compact fields.
- Freshness.
- Confidence.
- Calculation method.
- Rounding.
- Fallback information.
- Warnings.

## Full

Includes:

- All timestamps.
- Full precision.
- Cache metadata.
- Provider metadata.
- Original source IDs.
- Route decision.
- Inverse rate.
- Detailed confidence factors.
- Detailed fee calculation.

---

# 57. Example Agent Flow

User:

> Convert a €12,500 supplier invoice into Saudi riyals using the invoice date, June 10, 2026.

Agent action:

```json
{
  "tool": "convert_currency",
  "arguments": {
    "amount": "12500",
    "from": "EUR",
    "to": "SAR",
    "date": "2026-06-10",
    "mode": "official",
    "useCase": "invoice",
    "datePolicy": "previous_available",
    "responseDetail": "standard"
  }
}
```

Expected response characteristics:

- Uses official reference data.
- Returns actual effective date.
- Returns converted amount.
- Returns minor-unit rounding.
- States that actual settlement may differ.
- Does not call the rate live.

---

# 58. Example Claude Code Configuration

The final documentation should include an example equivalent to:

```json
{
  "mcpServers": {
    "openrates": {
      "command": "npx",
      "args": ["-y", "@openrates/mcp", "--stdio"]
    }
  }
}
```

The exact configuration format should be verified against the current client documentation before release.

Remote example:

```json
{
  "mcpServers": {
    "openrates": {
      "url": "https://your-openrates.example.com/mcp"
    }
  }
}
```

---

# 59. Example OpenAI Remote MCP Usage

The repository should include a maintained example showing:

- Remote MCP server URL.
- Tool allowlist.
- User request.
- Handling tool output.
- Effective-date citation in the final assistant answer.

The exact API syntax should be verified against current official OpenAI documentation before release.

---

# 60. README Opening Copy

The README should begin with language similar to:

> OpenRates Agent Gateway gives AI agents trustworthy current and historical currency exchange rates through MCP and REST. Every result includes its source, effective date, freshness, rate type, confidence, and rounding details. Official daily reference rates are never mislabeled as live.

Then show:

```bash
npx -y @openrates/mcp --stdio
```

And:

```bash
docker run --rm -p 3000:3000 ghcr.io/openrates/openrates-agent:latest
```

---

# 61. Claude Code Build Instructions

Claude Code should follow these rules while building the project:

1. Read this PRD fully before writing code.
2. Create an implementation checklist from every requirement.
3. Build phase by phase.
4. Do not skip tests.
5. Do not replace decimal strings with JavaScript numbers.
6. Do not call official reference data live.
7. Keep provider code isolated behind the provider interface.
8. Keep MCP, REST, and CLI behavior consistent.
9. Generate OpenAPI from the same schemas used for validation where possible.
10. Keep the first implementation simple.
11. Do not add user accounts, billing, or unnecessary dashboards.
12. Use clear names and comments.
13. Add documentation with every major feature.
14. Run type checking, linting, tests, and builds after each phase.
15. Update the implementation checklist as work is completed.
16. Record important architectural decisions in `docs/decisions/`.
17. Do not mark a phase complete until its exit criteria pass.
18. Keep all secrets in environment variables.
19. Add fixture-based tests before live provider tests.
20. Produce a final completion report listing:
    - What was built.
    - What tests passed.
    - What remains.
    - Any deliberate deviation from this PRD.
    - Exact commands to run the project.

---

# 62. Claude Code Starting Task

Use the following as the first implementation task:

```text
Read the entire OpenRates Agent Gateway PRD.

Create the monorepo foundation and a requirements checklist.

Do not implement the full product in one uncontrolled pass.

Start with Phase 0 and Phase 1:

1. Initialize pnpm workspaces and Turborepo.
2. Configure TypeScript, Biome, Vitest, and GitHub Actions.
3. Create shared schemas and the standard error model.
4. Create the currency metadata package and alias resolver.
5. Create the Decimal.js money conversion and rounding engine.
6. Create the normalized rate model.
7. Create the freshness classifier.
8. Create the confidence calculator.
9. Create the fee and spread calculator.
10. Add comprehensive tests.
11. Add simple documentation.
12. Run all checks and provide a completion report.

Do not begin the Frankfurter integration until Phase 0 and Phase 1 tests pass.
```

---

# 63. Final Acceptance Checklist

## Product behavior

- [ ] Converts current rates.
- [ ] Converts historical rates.
- [ ] Handles weekends.
- [ ] Supports strict dates.
- [ ] Supports time series.
- [ ] Supports fees and spread.
- [ ] Distinguishes official and market rates.
- [ ] Never mislabels daily data as live.
- [ ] Returns provider provenance.
- [ ] Returns freshness.
- [ ] Returns confidence.
- [ ] Returns warnings.
- [ ] Uses decimal arithmetic.
- [ ] Uses target-currency minor units.

## Agent experience

- [ ] MCP stdio works.
- [ ] Remote MCP works.
- [ ] Six tools are discoverable.
- [ ] Tool descriptions are complete.
- [ ] MCP resources work.
- [ ] Agent chooses the correct tool.
- [ ] Agent mentions effective date.
- [ ] Agent handles ambiguity.
- [ ] Agent sees fallback warnings.

## Developer experience

- [ ] One-command local run.
- [ ] Docker run works.
- [ ] Docker Compose works.
- [ ] REST API works.
- [ ] OpenAPI is available.
- [ ] TypeScript SDK works.
- [ ] CLI works.
- [ ] Examples work.
- [ ] Documentation is understandable.

## Quality

- [ ] Tests pass.
- [ ] Coverage targets pass.
- [ ] CI passes.
- [ ] Security scans pass.
- [ ] No secrets are logged.
- [ ] Provider contract tests pass.
- [ ] Agent evaluations pass.
- [ ] Performance targets are tested.

## Open source

- [ ] Apache-2.0 license.
- [ ] Contributing guide.
- [ ] Security policy.
- [ ] Code of conduct.
- [ ] Issue templates.
- [ ] Provider contribution template.
- [ ] Changelog.
- [ ] Release automation.
- [ ] Docker image.
- [ ] npm packages.
- [ ] MCP Registry submission prepared.

---

# 64. Future Roadmap

These features are intentionally deferred until after version 1.0:

- Python SDK.
- Go SDK.
- Cryptocurrency provider plugins.
- Precious-metal pricing.
- Bank-specific buy and sell rates.
- Card-network indicative rates.
- Official and parallel-market modules for specific countries.
- Webhooks for rate thresholds.
- Scheduled rate snapshots.
- Signed provider responses.
- Enterprise provider policies.
- Regional provider routing.
- Multi-tenant hosted accounts.
- Usage dashboard.
- Provider marketplace.
- Natural-language country-to-currency resolver.
- Offline currency dataset bundles.
- Rate anomaly alerts.
- Historical redenomination conversion helpers.
- Agent-to-agent capability advertisement.

---

# 65. Success Metrics

## Technical

- Tool-call success rate above 99% excluding upstream outages.
- Cached p95 latency below 150 ms.
- Uncached official p95 latency below 1,500 ms.
- No known critical calculation defects.
- No official rate incorrectly marked live.
- At least 85% core package test coverage.

## Agent quality

- Correct tool selection at least 95%.
- Effective date included at least 95%.
- Correct rate-type description at least 95%.
- Ambiguous currency handling at least 90%.
- Silent fallback rate: 0%.

## Adoption

Initial open-source targets:

- 100 GitHub stars.
- 20 external installations.
- 5 external contributors.
- 3 agent-platform integrations.
- 1,000 successful MCP tool calls in public examples or hosted testing.
- Inclusion in the MCP Registry.

These are directional goals, not product requirements.

---

# 66. Final Product Summary

OpenRates Agent Gateway is not merely another exchange-rate API.

It is an agent-native trust and normalization layer that makes exchange-rate data:

- Discoverable.
- Structured.
- Explainable.
- Source-aware.
- Freshness-aware.
- Provider-neutral.
- Accurate in monetary calculations.
- Safe for autonomous agents.
- Free and self-hostable.

The core differentiator is not access to a number. The differentiator is that an AI agent can understand what the number means and use it responsibly.

The first version should stay focused:

1. Official rates through Frankfurter.
2. Correct decimal conversion.
3. Honest freshness.
4. Strong MCP discovery.
5. Clear REST and SDK access.
6. Provider extensibility.
7. Excellent documentation.
8. Reliable tests.

Everything else should build on that foundation.
