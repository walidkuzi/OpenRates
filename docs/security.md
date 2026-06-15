# Security

OpenRates is designed to be safe in production environments. This page covers the security
practices built into the system and how to deploy it securely.

## Input validation

All request inputs are validated against a Zod schema before processing. Invalid requests
are rejected with HTTP 400 and a typed error code.

- Currency codes must be ISO 4217 format (three uppercase letters).
- Amounts must be non-negative decimal strings.
- Dates must be ISO 8601 format (`YYYY-MM-DD`) or the literal `latest`.
- Query strings and path parameters are length-limited.

## Request limits

- Request body size is capped at 1 MB.
- Time series queries are limited to 2,000 points.
- Historical date range queries are limited to 5 years.

Requests exceeding these limits are rejected with HTTP 400.

## Outbound security (SSRF protection)

Provider URLs are never derived from client input. Endpoints are configured at deployment
time through environment variables only.

- Base URLs for providers come from environment variables such as `FRANKFURTER_BASE_URL`.
- No query parameter or request body field can change the provider endpoint.
- All outbound requests from provider adapters use configurable timeouts (default 5 s).

This prevents server-side request forgery. The system can only contact configured
services.

## API key security

- Keys are stored in `OPENRATES_API_KEYS` as a comma-separated list.
- Keys are compared in constant time.
- The key header is `X-API-Key`.
- Keys are never logged or included in responses.
- Rotate keys by updating the environment variable and restarting.

## Rate limiting

Optional per-minute rate limiting:

```env
OPENRATES_RATE_LIMIT_ENABLED=true
OPENRATES_RATE_LIMIT_PER_MINUTE=120
```

Requests over the limit return HTTP 429.

## Security headers

The API sets these headers on every response:

- `Strict-Transport-Security` — enforces HTTPS.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## Error handling in production

When `NODE_ENV=production`, error responses do not include stack traces. A request ID is
included on every error for tracing:

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "The request timed out.",
    "retryable": true
  },
  "requestId": "req_abc123"
}
```

## Dependency security

CI runs `pnpm audit` on every push and blocks on high or critical findings. Review the
audit output and pin security updates quickly.

## Provider credentials

Store provider API keys in environment variables using the convention
`OPENRATES_PROVIDER_<NAME>_API_KEY`. Never commit keys to version control. Use a secrets
manager or CI secrets to inject them at deployment.

## Reporting vulnerabilities

Do not open a public issue for security vulnerabilities. Report privately using the
instructions in `SECURITY.md`. The team acknowledges reports within 48 hours.
