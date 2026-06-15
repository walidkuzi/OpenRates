# Self-hosting

This guide covers running OpenRates in your own environment using Docker, configuring it
with environment variables, setting up HTTPS with a reverse proxy, and maintaining the
deployment.

## Docker

Run the latest image from the GitHub Container Registry:

```bash
docker run -p 3000:3000 ghcr.io/openrates/openrates-agent:latest
```

The API listens on port 3000 by default. Change it with the `PORT` environment variable:

```bash
docker run -p 8080:8080 -e PORT=8080 ghcr.io/openrates/openrates-agent:latest
```

## Docker Compose

For a complete stack with optional Redis caching:

```yaml
version: "3.9"

services:
  openrates:
    image: ghcr.io/openrates/openrates-agent:latest
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      NODE_ENV: production
      OPENRATES_DEFAULT_PROVIDER: frankfurter
      OPENRATES_CACHE_DRIVER: redis
      REDIS_URL: redis://cache:6379/0
      OPENRATES_LOG_LEVEL: info
      OPENRATES_API_AUTH_ENABLED: "true"
      OPENRATES_API_KEYS: "key_secret123,key_secret456"
      OPENRATES_RATE_LIMIT_ENABLED: "true"
      OPENRATES_RATE_LIMIT_PER_MINUTE: 120
    depends_on:
      - cache
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

Without Redis the server uses in-memory caching. The memory cache holds up to 10,000 items
by default. In production with multiple processes, use Redis to share cache across
instances.

## Environment variables

All configuration goes through environment variables. See `.env.example` in the repository
for the complete list.

Core settings:

- `PORT` — Server port (default `3000`).
- `HOST` — Bind address (default `0.0.0.0`).
- `NODE_ENV` — Set to `production` for stricter error handling.
- `OPENRATES_LOG_LEVEL` — `debug`, `info`, `warn`, or `error` (default `info`).

Provider settings:

- `OPENRATES_DEFAULT_PROVIDER` — Provider to use (default `frankfurter`).
- `FRANKFURTER_BASE_URL` — Frankfurter endpoint (default `https://api.frankfurter.dev`).
- `FRANKFURTER_TIMEOUT_MS` — Request timeout in ms (default `5000`).

Cache settings:

- `OPENRATES_CACHE_DRIVER` — `memory` or `redis` (default `memory`).
- `OPENRATES_MEMORY_CACHE_MAX_ITEMS` — In-memory cache size (default `10000`).
- `REDIS_URL` — Redis connection string, for example `redis://localhost:6379/0`.

Authentication and rate limiting:

- `OPENRATES_API_AUTH_ENABLED` — Enable API key auth (default `false`).
- `OPENRATES_API_KEYS` — Comma-separated API keys.
- `OPENRATES_RATE_LIMIT_ENABLED` — Enable per-minute rate limit (default `false`).
- `OPENRATES_RATE_LIMIT_PER_MINUTE` — Limit per key per minute (default `120`).

## Reverse proxy and HTTPS

Use nginx to handle HTTPS and proxy requests to the local server.

```nginx
upstream openrates {
  server 127.0.0.1:3000;
}

server {
  listen 443 ssl http2;
  server_name rates.example.com;

  ssl_certificate /etc/letsencrypt/live/rates.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/rates.example.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  location / {
    proxy_pass http://openrates;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
  }
}

server {
  listen 80;
  server_name rates.example.com;
  return 301 https://$server_name$request_uri;
}
```

## API key authentication

Set `OPENRATES_API_AUTH_ENABLED=true` and list keys in `OPENRATES_API_KEYS`:

```bash
OPENRATES_API_AUTH_ENABLED=true
OPENRATES_API_KEYS=sk_prod_abc123,sk_prod_def456
```

Clients pass the key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: sk_prod_abc123" \
  "http://localhost:3000/v1/rates?base=USD&quote=EUR"
```

The health and ready endpoints do not require authentication.

## Rate limiting

Enable per-minute rate limiting:

```bash
OPENRATES_RATE_LIMIT_ENABLED=true
OPENRATES_RATE_LIMIT_PER_MINUTE=120
```

Requests over the limit return HTTP 429. The limit applies per API key when auth is
enabled, or per IP address when auth is disabled.

## Health checks

Use these endpoints for monitoring and probes:

- `GET /v1/health` — Returns `200` if the process is running.
- `GET /v1/ready` — Returns `200` only when the configured provider is reachable.

```bash
curl http://localhost:3000/v1/health
curl http://localhost:3000/v1/ready
```

## Upgrading

Pull the latest image and restart:

```bash
docker pull ghcr.io/openrates/openrates-agent:latest
docker compose pull openrates
docker compose up --no-deps -d openrates
```

Check the release notes for breaking changes before upgrading. Backwards compatibility is
maintained within major versions.
