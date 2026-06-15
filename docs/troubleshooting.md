# Troubleshooting

Common issues and how to resolve them.

## Provider timeout

Error code: `PROVIDER_TIMEOUT`.

Provider requests are timing out. Check network connectivity from the machine running
OpenRates.

**Test the provider directly:**

```bash
curl https://api.frankfurter.dev/latest?base=USD&symbols=EUR
```

If this fails, the network path to the provider is blocked. Check firewalls, proxies, and
DNS.

**Increase the timeout:**

```bash
FRANKFURTER_TIMEOUT_MS=10000
```

**For Docker:** ensure the container has outbound internet access.

---

## Strict date not available

Error code: `STRICT_DATE_NOT_AVAILABLE`.

You requested a rate for a specific date, but the provider has no published rate for that
exact date (weekend, holiday, or future date).

Use `datePolicy=previous_available` to accept the most recent prior business day:

```bash
curl "http://localhost:3000/v1/rates?base=USD&quote=EUR&date=2025-12-25&datePolicy=previous_available"
```

The response will include both the requested date and the actual effective date.

If you require the exact date to exist, use `datePolicy=strict`. The error response will
include a `suggestion` field.

---

## Ambiguous currency

Error code: `AMBIGUOUS_CURRENCY`.

The input matched more than one currency. For example, "dollar" matches USD, CAD, AUD,
and others.

Always use the three-letter ISO 4217 code:

```bash
# Use this
curl "http://localhost:3000/v1/rates?base=USD&quote=EUR"
```

The error response includes a `details.candidates` array listing the matches.

To find the right code:

```bash
openrates currencies --search dollar
# or
curl "http://localhost:3000/v1/currencies?query=dollar"
```

---

## Rate marked stale

Error code: `RATE_TOO_STALE`.

The rate in the cache is older than the allowed age. This usually means the provider has
not published a new rate yet, or a cache entry is too old.

Request with `responseDetail=full` to see freshness details:

```bash
curl "http://localhost:3000/v1/rates?base=USD&quote=EUR&responseDetail=full"
```

Look at `rate.freshnessClass` and `rate.isStale`. Most official daily rates are published
once per business day. A request before the daily update will return the previous business
day's rate with class `latest_business_day`, which is expected and not an error.

---

## Redis connection failure

The server logs show a Redis connection error.

The application falls back to in-memory caching when Redis is unavailable, so rates are
still served but without cross-instance cache sharing.

**Check Redis is reachable:**

```bash
redis-cli -u $REDIS_URL ping
```

Should return `PONG`.

**Check the connection string format:**

```env
REDIS_URL=redis://localhost:6379/0
```

In Docker Compose, the host must be the service name, not `localhost`:

```yaml
REDIS_URL: redis://cache:6379/0
```

---

## MCP server not connecting

**Check the stdio configuration** in Claude Code:

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

**Test the server manually:**

```bash
npx -y @openrates/mcp --stdio
```

If it starts without error, the server is working.

During local development, you can point directly at the built file:

```bash
pnpm --filter @openrates/mcp dev
```

---

## Wrong port

The server starts but is not reachable.

The default port is `3000`. Change it with the `PORT` environment variable:

```bash
PORT=8080 pnpm --filter @openrates/api dev
```

Inside Docker, bind to `HOST=0.0.0.0` and map the port:

```bash
docker run -p 3000:3000 -e HOST=0.0.0.0 ghcr.io/openrates/openrates-agent:latest
```

---

## Running the doctor

Use the built-in doctor command to validate configuration and provider health:

```bash
openrates doctor
# or during development
pnpm --filter @openrates/cli exec tsx src/cli.ts doctor
```

The output shows configuration, each provider's health status, and a sample rate request.
