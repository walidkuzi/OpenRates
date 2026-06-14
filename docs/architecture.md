# Architecture

OpenRates is a layered system. Each layer has one job and depends only on the layers below
it, so providers, interfaces, and storage can change independently.

```text
Interfaces (REST, MCP, SDK, CLI)      planned
        |
Rate engine (router package)          orchestration
        |
Providers (Frankfurter, future)       data sources
        |
Core + currency metadata + cache      calculations, catalogue, storage
        |
Schemas                               shared types and error model
```

## Rate engine

The engine in `@openrates/router` ties everything together. For a single request it:

1. Resolves the base and quote currencies, including aliases, and reports ambiguity.
2. Short-circuits an identical pair to a rate of `1` without calling a provider.
3. Resolves the effective mode (official, market, or auto) and selects provider candidates.
4. Checks the cache, then calls the selected provider for the latest, historical, or series
   data.
5. Normalizes the raw provider rate into a `NormalizedRate` by running the freshness
   classifier and the confidence calculator.
6. Protects against stale data: a rate older than the allowed maximum age is never returned
   as if it were current.
7. Falls back to the next provider when allowed, and records the fallback visibly in the
   response and as a warning.

Every result carries route information (selected provider, mode, whether fallback was used,
and which providers were attempted) and cache information (hit, stored time, age).

## Provider selection and fallback

Selection prefers an explicitly requested provider, then providers that support the
requested mode and, when needed, historical data, ordered by configured priority and trust.
Fallback is never silent: if the primary provider fails and another is used, the response
says so. If fallback is disabled, the original error is returned.

## Caching

The engine uses a `CacheStore`. The default is an in-memory LRU with per-entry TTLs; a
Redis-backed store is available through a small pluggable client interface. Cache keys
include the provider, mode, currency pair, and date, so different requests never collide.

## Determinism

The engine accepts an injected clock and an optional `now` per request, so freshness and
cache age are deterministic and fully testable.
