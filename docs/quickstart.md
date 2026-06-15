# Quickstart

OpenRates gives AI agents and applications trustworthy currency exchange rates. This page
gets you a first conversion through each interface. Official daily reference rates are never
reported as live.

## Requirements

Node.js 22 or newer and pnpm 10.

```bash
pnpm install
pnpm build
```

Frankfurter (the default provider) needs internet access but no API key.

## Command line

```bash
pnpm --filter @openrates/cli exec tsx src/cli.ts rate USD EUR
pnpm --filter @openrates/cli exec tsx src/cli.ts convert 1000 USD EUR
pnpm --filter @openrates/cli exec tsx src/cli.ts currencies --search riyal
pnpm --filter @openrates/cli exec tsx src/cli.ts doctor
```

After publishing, the same commands run as `openrates rate USD EUR`.

## REST API

```bash
pnpm --filter @openrates/api dev
curl "http://localhost:3000/v1/rates?base=USD&quote=EUR"
```

Open `http://localhost:3000/docs` for the interactive API reference.

## TypeScript SDK

```ts
import { OpenRatesClient } from "@openrates/sdk";

const client = new OpenRatesClient({ baseUrl: "http://localhost:3000" });
const result = await client.convert({ amount: "1000.00", from: "USD", to: "EUR" });
console.log(result.convertedAmount);
```

## MCP (agents)

Start the server over stdio:

```bash
pnpm --filter @openrates/mcp dev
```

Or connect it to Claude Code with the configuration in `examples/claude-code/`.

## What every result tells you

- the rate and the converted amount,
- the rate type (official reference by default),
- the effective date,
- the provider,
- the freshness, and whether the rate is live (official daily rates never are),
- the confidence, and any warnings about fees or fallback.
