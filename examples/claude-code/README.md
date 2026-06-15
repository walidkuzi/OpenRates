# Claude Code

Add OpenRates to Claude Code as an MCP server.

## Published package

Once `@openrates/mcp` is published, use the configuration in `mcp.json`:

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

## From this repository

Before publishing, build the workspace and point Claude Code at the built CLI:

```bash
pnpm build
```

```json
{
  "mcpServers": {
    "openrates": {
      "command": "node",
      "args": ["/absolute/path/to/apps/mcp/dist/cli.js", "--stdio"]
    }
  }
}
```

Then ask Claude to "convert 1000 USD to EUR" or "what was 1000 GBP in USD on 2026-01-15?".
OpenRates returns the rate with its effective date, provider, and freshness, and never
labels an official daily rate as live.

## Remote (Streamable HTTP)

```json
{
  "mcpServers": {
    "openrates": {
      "url": "https://your-openrates.example.com/mcp"
    }
  }
}
```
