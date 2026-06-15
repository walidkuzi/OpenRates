# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Monorepo foundation with pnpm workspaces and Turborepo build orchestration
- Shared schemas, error model, and API envelopes (`@openrates/schemas`)
- Structured logging with secret redaction via Pino (`@openrates/observability`)
- Currency metadata catalogue with alias resolution and search (`@openrates/currency-metadata`)
- Decimal money engine, rate math, freshness classifier, confidence calculator, and fee engine (`@openrates/core`)
- Provider contract with a reusable, fixture-based contract test suite (`@openrates/provider-interface`)
- Frankfurter adapter for official reference rates with weekend and strict-date handling (`@openrates/provider-frankfurter`)
- Caching layer with in-memory LRU and pluggable Redis store (`@openrates/cache`)
- Rate router with provider registry, selection, fallback, and health tracking (`@openrates/router`)
- REST API on Fastify with standard envelopes, request IDs, security headers, OpenAPI 3.1, interactive docs, optional API-key auth, and optional rate limiting (`@openrates/api`)
- MCP server with six tools, nine resources, agent instructions, stdio transport, and Streamable HTTP transport (`@openrates/mcp`)
- TypeScript SDK with typed client, error classes, retries, and AbortSignal support (`@openrates/sdk`)
- CLI with `rate`, `convert`, `series`, `currencies`, `providers`, `doctor`, and `mcp` commands (`@openrates/cli`)
- VitePress documentation site with full guides
- Web playground for interactive testing
- Examples for Claude Code, OpenAI Responses API, Node.js, and Docker
