# Providers

OpenRates talks to exchange-rate sources through provider adapters. Every adapter
implements the same contract, so the rest of the system never depends on one provider's
response format.

## Provider contract

Each adapter implements `ExchangeRateProvider`:

- `capabilities()` — what the provider can do (modes, rate types, historical, intraday, key).
- `healthCheck()` — current reachability and latency.
- `getLatestRate(input)` — the most recent rate for a pair.
- `getHistoricalRate(input)` — the rate for a date, with a date policy.
- `getTimeSeries(input)` — a range of dates.
- `listCurrencies()` — the currencies the provider supports.
- `normalizeError(error)` — convert any failure into a typed `OpenRatesError`.

Adapters use request timeouts, retry only safe GET requests with bounded exponential
backoff, never log secrets, and return provider attribution on every rate.

Every adapter passes the same reusable contract test suite, exported from
`@openrates/provider-interface/testing`, with fixtures so the tests are deterministic.

## Frankfurter (default)

| Property | Value |
|---|---|
| Data type | Official reference rates (`official_reference`) |
| Update frequency | Once per business day |
| Historical support | Yes, including date ranges |
| Intraday / live | No — never classified as `live` |
| API key | Not required |
| Provider timestamp | Not provided (date only) |
| Base URL | Configurable (`FRANKFURTER_BASE_URL`) |

Frankfurter publishes the European Central Bank's reference rates. Results are always
labeled `official_reference` and are never marked live.

### Weekend and holiday behavior

When a requested date has no published rate (a weekend or holiday), Frankfurter returns the
most recent prior business day. OpenRates uses the returned effective date:

- `datePolicy: "previous_available"` (default) accepts the prior business day and reports the
  actual effective date.
- `datePolicy: "strict"` returns a `STRICT_DATE_NOT_AVAILABLE` error when the exact requested
  date had no published rate, and suggests retrying with `previous_available`.

### Configuration

```env
OPENRATES_DEFAULT_PROVIDER=frankfurter
FRANKFURTER_BASE_URL=https://api.frankfurter.dev
FRANKFURTER_TIMEOUT_MS=5000
```

The base URL is configurable so you can point OpenRates at your own Frankfurter deployment.

### Known limitations

- No intraday or live rates.
- No bid/ask spread; rates are reference midpoints.
- Coverage is limited to the currencies Frankfurter lists.

## Terms and attribution

Frankfurter is free to use and based on European Central Bank data. The adapter software is
Apache-2.0, but upstream data carries its own terms; OpenRates does not relicense it.
