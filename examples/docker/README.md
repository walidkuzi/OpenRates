# Docker

Run OpenRates as a containerized service.

## Quick start

```bash
docker run --rm -p 3000:3000 ghcr.io/openrates/openrates-agent:latest
```

The API is available at `http://localhost:3000`. Check liveness at `/v1/health` and
readiness at `/v1/ready`.

## Docker Compose

```bash
docker compose up
```

See `docker-compose.yml` for the full configuration. Redis is included but commented out
by default — uncomment the `cache` service and the `REDIS_URL` env var to enable it.

## Custom Frankfurter instance

Point OpenRates at a self-hosted Frankfurter deployment:

```bash
docker run --rm -p 3000:3000 \
  -e FRANKFURTER_BASE_URL=https://your-frankfurter.example.com \
  ghcr.io/openrates/openrates-agent:latest
```

## API key authentication

```bash
docker run --rm -p 3000:3000 \
  -e OPENRATES_API_AUTH_ENABLED=true \
  -e OPENRATES_API_KEYS=sk_prod_abc123 \
  ghcr.io/openrates/openrates-agent:latest
```

Clients must then pass `X-API-Key: sk_prod_abc123` on every request.

## Health checks

```bash
curl http://localhost:3000/v1/health   # liveness
curl http://localhost:3000/v1/ready    # readiness
```

Both return HTTP 200 on success. `/v1/ready` also verifies the configured provider is
reachable.

## Upgrading

```bash
docker compose pull
docker compose up --no-deps -d openrates
```
