# OpenRates Agent Gateway

OpenRates Agent Gateway gives AI agents trustworthy current and historical currency
exchange rates through MCP and REST. Every result includes its source, effective date,
freshness, rate type, confidence, and rounding details. Official daily reference rates
are never mislabeled as live.

It is free, open-source infrastructure designed for AI agents first. Think of it as a
currency intelligence layer that any agent can discover and use safely in seconds.

## Why agents need it

Language models do not reliably know the current exchange rate. They guess from memory,
scrape unknown sources, confuse central-bank reference rates with market rates, ignore
weekends, and introduce floating-point rounding errors. OpenRates replaces guesswork with
a single agent-native interface that returns not just a number, but what the number means:
which rate was used, when it was effective, how fresh it is, who supplied it, and what it
excludes.

## Status

Active development. The product is being built phase by phase against the product
requirements document in [`OPENRATES_PRD.md`](./OPENRATES_PRD.md).

Implemented so far:

- Shared schemas, error model, and configuration validation (`@openrates/schemas`)
- Structured logging with secret redaction (`@openrates/observability`)
- Currency metadata, alias resolution, and search (`@openrates/currency-metadata`)
- Decimal money engine, rate math, freshness classifier, confidence calculator, and fee
  engine (`@openrates/core`)
- Provider contract with a reusable, fixture-based contract test suite
  (`@openrates/provider-interface`)
- Frankfurter adapter for official reference rates, with weekend and strict-date handling
  (`@openrates/provider-frankfurter`)
- Caching with an in-memory LRU and a pluggable Redis store (`@openrates/cache`)
- Rate engine that resolves currencies, selects providers, caches, normalizes, and falls
  back visibly, exposing end-to-end conversion (`@openrates/router`)
- REST API on Fastify with standard envelopes, request IDs, security headers, optional auth
  and rate limiting, OpenAPI 3.1, and interactive docs (`@openrates/api`)
- MCP server with six tools, nine resources, agent instructions, and both stdio and
  Streamable HTTP transports (`@openrates/mcp`)

Planned: TypeScript SDK, CLI, documentation site, and a web playground.

## Intended usage

Local MCP over stdio:

```bash
npx -y @openrates/mcp --stdio
```

Self-hosted REST and remote MCP:

```bash
docker run --rm -p 3000:3000 ghcr.io/openrates/openrates-agent:latest
```

These entry points arrive in later phases; see the PRD for the full roadmap.

## Local development

Requirements: Node.js 22 or newer and pnpm 10.

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

`pnpm run check` runs type checking, linting, format verification, tests, and the build in
one pass.

## Repository layout

```text
packages/
  schemas/             Shared Zod schemas, error model, API envelopes, config
  observability/       Pino logging with secret redaction
  currency-metadata/   Currency catalogue, aliases, and search
  core/                Money engine, rate math, freshness, confidence, fees
  provider-interface/  Provider contract, capabilities, health, contract tests
  provider-frankfurter/Frankfurter adapter for official reference rates
  cache/               In-memory LRU and pluggable Redis cache stores
  router/              Provider registry, selection, fallback, and the rate engine
apps/
  api/                 Fastify REST API with OpenAPI and interactive docs
  mcp/                 MCP server (stdio + Streamable HTTP) exposing six tools
```

Additional packages and applications are added as later phases land.

## Safety promise

OpenRates provides informational exchange-rate data. Official daily reference rates are
labeled `official_reference` and are never described as live. Actual rates offered by
banks, card networks, payment processors, exchanges, or money-transfer services may differ
because of spreads, fees, timing, location, liquidity, and provider policies.

## License

Apache-2.0. See [`LICENSE`](./LICENSE). Upstream data providers have their own terms; their
data is not relicensed by this project.
