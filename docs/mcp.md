# MCP server

The MCP server is the primary interface for agents. It exposes the rate engine as Model
Context Protocol tools and resources, so any MCP-aware client can discover and use it.

## Transports

- **stdio** for local clients such as Claude Code and Claude Desktop.
- **Streamable HTTP** at `/mcp` for remote clients.

Start stdio locally:

```bash
pnpm --filter @openrates/mcp dev
```

Start the HTTP transport:

```bash
pnpm --filter @openrates/mcp exec tsx src/cli.ts --http
```

## Tools

Version 1 exposes exactly six tools:

| Tool | Purpose |
|---|---|
| `convert_currency` | Convert an amount between two currencies |
| `get_exchange_rate` | Get the rate for a pair |
| `get_exchange_rate_series` | Historical time series |
| `list_currencies` | Discover currencies and resolve ambiguous names |
| `compare_exchange_rate_providers` | Compare a pair across providers |
| `explain_exchange_rate` | Explain a concept in plain language |

Each tool returns JSON text. Errors come back as a structured `{ "error": { code, message,
retryable } }` object with `isError` set, so the agent can recover.

## Resources

Read-only resources help an agent understand the server:

```text
openrates://docs/quickstart
openrates://docs/tool-selection
openrates://docs/rate-types
openrates://docs/freshness
openrates://docs/errors
openrates://providers
openrates://currencies
openrates://capabilities
openrates://license
```

## Server instructions

The server ships instructions that tell agents to use official mode for accounting and
reporting, to always mention the effective date and rate type, to mention fees and spread
when relevant, and to never describe an official daily rate as live.

## Claude Code configuration

Local (stdio):

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

Remote (Streamable HTTP):

```json
{
  "mcpServers": {
    "openrates": {
      "url": "https://your-openrates.example.com/mcp"
    }
  }
}
```

Verify the exact client configuration format against your client's current documentation
before relying on it.
