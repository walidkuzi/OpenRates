# Rate types

A rate type describes what kind of exchange rate a value represents. The type is separate
from freshness: an official rate can be today's rate, and a market rate can be old.

## Types

| Type | Meaning |
|---|---|
| `official_reference` | A central-bank or official reference rate, published once per business day. The default for Frankfurter. |
| `market_midpoint` | The midpoint between buy and sell in a market feed. |
| `market_indicative` | An indicative market rate that is not directly executable. |
| `bank_buy` | The rate a bank buys a currency at. |
| `bank_sell` | The rate a bank sells a currency at. |
| `cash_buy` | A cash purchase rate, often worse than the market midpoint. |
| `cash_sell` | A cash sale rate. |
| `parallel_market` | An unofficial parallel-market rate. Not enabled by default. |
| `computed_cross` | A rate calculated by combining two other pairs through a pivot currency. |

## Official versus market

- **Official reference** rates are stable, auditable, and ideal for accounting, invoices,
  and reporting. They are published once per business day and are never live.
- **Market** rates are more current but require a configured market provider and a
  bring-your-own-key setup. Only market rates can be classified as `live`.

## Direct, inverse, and cross

The `calculationMethod` field explains how a rate was produced:

- `direct` — the provider supplied the pair directly.
- `inverse` — the provider supplied the opposite pair and OpenRates inverted it.
- `cross` — OpenRates combined two pairs through a pivot currency (for example, converting
  through EUR). The pivot is reported in `crossCurrency`.

Inverse and cross rates carry a lower confidence score and an explanatory warning, because
they are computed rather than quoted directly.
