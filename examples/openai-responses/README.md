# OpenAI Responses API with OpenRates

Use OpenRates as a remote MCP server with the OpenAI Responses API.

## Configuration

Point the Responses API at your hosted OpenRates instance and allow the six OpenRates
tools:

```json
{
  "tools": [
    { "type": "mcp", "server_label": "openrates", "server_url": "https://your-openrates.example.com/mcp",
      "allowed_tools": [
        "convert_currency",
        "get_exchange_rate",
        "get_exchange_rate_series",
        "list_currencies",
        "compare_exchange_rate_providers",
        "explain_exchange_rate"
      ]
    }
  ]
}
```

The exact configuration format depends on the OpenAI SDK version. Refer to the current
OpenAI Responses API documentation for the latest syntax.

## Example tools

The tools OpenRates exposes:

| Tool | When to use |
|---|---|
| `convert_currency` | Convert an amount from one currency to another |
| `get_exchange_rate` | Get the rate for a pair without converting |
| `get_exchange_rate_series` | Fetch historical rates for a date range |
| `list_currencies` | Discover supported currencies or resolve ambiguous names |
| `compare_exchange_rate_providers` | Compare rates across multiple providers |
| `explain_exchange_rate` | Explain concepts like official vs market rates |

## What agents receive

Every OpenRates response includes:

- The rate as a decimal string (never a native number).
- The rate type (`official_reference` for Frankfurter).
- The effective date the rate applies to.
- The provider that supplied the rate.
- The freshness class (`latest_available`, `latest_business_day`, etc.).
- `isLive: false` for official daily rates — never mislabeled as live.
- Confidence score and any warnings about fees or fallback.

## Self-hosting

Start a local instance:

```bash
pnpm --filter @openrates/mcp exec tsx src/cli.ts --http
# or via Docker
docker run -p 3000:3000 ghcr.io/openrates/openrates-agent:latest
```

Then point the Responses API at `http://localhost:3000/mcp`.

See `examples/docker/` for a production-ready Docker Compose setup.
