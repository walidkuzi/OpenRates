# Node SDK example

`convert.mjs` converts 1000 USD to EUR using the `@openrates/sdk` client.

```bash
# In one terminal, start the API:
pnpm --filter @openrates/api dev

# In another terminal, after installing @openrates/sdk:
node examples/node/convert.mjs
```

Expected output (the rate and date will vary):

```text
1000.00 USD = 865.42 EUR
rate 0.865421 (official_reference, effective 2026-06-12, frankfurter)
```

The SDK preserves decimal strings, exposes typed methods, supports `AbortSignal`, throws
`OpenRatesApiError` on failures, and retries safe requests.
