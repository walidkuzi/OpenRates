# REST API

The REST API is a thin layer over the rate engine. It validates input, calls the engine,
and wraps the result in a standard envelope. Every behavior matches the MCP tools, because
both call the same engine.

## Base path and start

All endpoints live under `/v1`. Start the server locally:

```bash
pnpm --filter @openrates/api dev
```

The server reads its configuration from environment variables (see `.env.example`).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/rates` | Exchange rate for a pair |
| GET | `/v1/rates/series` | Historical time series |
| POST | `/v1/convert` | Convert an amount |
| GET | `/v1/currencies` | List or search currencies |
| GET | `/v1/currencies/:code` | One currency's metadata |
| GET | `/v1/providers` | Configured providers |
| GET | `/v1/providers/:providerId` | One provider |
| GET | `/v1/capabilities` | Server and provider capabilities |
| GET | `/v1/health` | Liveness probe |
| GET | `/v1/ready` | Readiness probe |
| GET | `/openapi.json` | OpenAPI 3.1 document |
| GET | `/docs` | Interactive API reference |

## Examples

Rate:

```bash
curl "http://localhost:3000/v1/rates?base=USD&quote=EUR&date=latest"
```

Convert:

```bash
curl -X POST http://localhost:3000/v1/convert \
  -H "content-type: application/json" \
  -d '{"amount":"1000.00","from":"USD","to":"EUR","mode":"official"}'
```

## Response envelopes

Success:

```json
{
  "success": true,
  "data": { "from": "USD", "to": "EUR", "convertedAmount": "865.42" },
  "requestId": "req_...",
  "generatedAt": "2026-06-15T20:00:00.000Z"
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_CURRENCY",
    "message": "The currency \"XYZ\" is not supported.",
    "retryable": false
  },
  "requestId": "req_..."
}
```

Every error carries a stable machine-readable `code`, a human message, and a `retryable`
flag. Ambiguous currencies return candidate codes in `error.details`.

## Response detail

`responseDetail` selects how much each response includes:

- `compact` — the essentials and the main warning.
- `standard` (default) — adds confidence, freshness, calculation method, and warnings.
- `full` — adds timestamps, cache metadata, route decision, and the inverse rate.

## Security and operations

- Security headers are set on every response.
- A request id is attached to every response for tracing.
- Optional API-key authentication (`OPENRATES_API_AUTH_ENABLED`) protects all routes except
  `/v1/health`, `/v1/ready`, `/openapi.json`, and `/docs`.
- Optional rate limiting (`OPENRATES_RATE_LIMIT_ENABLED`) can be enabled for hosted
  deployments. Both are disabled by default for local use.
