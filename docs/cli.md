# CLI

The `@openrates/cli` package runs currency operations from the terminal. It embeds the rate
engine, so it talks to providers directly without a separate server.

## Commands

```bash
openrates rate USD EUR
openrates convert 1000 USD EUR
openrates convert 1000 USD EUR --date 2026-01-15
openrates convert 1000 USD EUR --percentage-fee 2 --spread 1
openrates series USD TRY --from 2026-01-01 --to 2026-06-01
openrates currencies --search riyal
openrates providers
openrates doctor
openrates mcp --stdio
```

## Options

- `--json` prints machine-readable JSON instead of human text.
- `--date <YYYY-MM-DD>` selects a historical date; the default is the latest rate.
- `--mode official|market|auto` selects the rate mode (default auto, which resolves to
  official unless a market provider is configured).
- `--provider <id>` pins a specific provider.
- `--fixed-fee`, `--percentage-fee`, `--spread` add fees to a conversion estimate.

## Behavior

- Human-readable output by default; `--json` for scripts.
- A non-zero exit code on any failure.
- No secrets are ever printed.
- `doctor` validates the configuration and checks that the default provider is reachable.
- `mcp --stdio` launches the MCP server for local agent clients.
