# 0004 — The orchestration engine lives in the router package

## Status

Accepted.

## Context

The REST API, MCP server, SDK, and CLI must all behave identically: the same conversion,
the same freshness rules, the same fallback warnings, and the same errors. Duplicating that
orchestration in each interface would let them drift apart.

## Decision

The high-level orchestration — currency resolution, provider selection, caching,
normalization, fallback, and stale protection — lives in `@openrates/router` as a single
`RateEngine`. The interface packages are thin: they translate transport-specific input into
an engine call and translate the engine result into a transport-specific response.

The engine exposes `getRate`, `convert`, and `getSeries`, each returning the normalized
result plus route and cache metadata.

## Consequences

- MCP, REST, SDK, and CLI share one implementation, so their behavior stays consistent.
- The engine is tested once, end to end, against a provider with injected HTTP responses.
- Interfaces remain small and focused on serialization and validation.
- Provider selection and fallback policy evolve in one place.
