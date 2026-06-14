# 0003 — Fixed fee is expressed in the target currency

## Status

Accepted.

## Context

The conversion engine applies an optional fixed fee. The product spec defines the order of
fee operations (spread, then percentage fee, then fixed fee, then round) but does not state
which currency the fixed fee is denominated in.

## Decision

The fixed fee is expressed in the **target** currency — the currency the recipient receives.
It is subtracted after the gross amount has been converted and after the spread and
percentage fee have been applied, then the result is rounded to the target minor units.

`estimatedReceivedAmount` is the amount after all fees. `totalEstimatedCost` is the gross
converted amount minus the received amount, also in the target currency, so the displayed
numbers reconcile.

## Consequences

- The fee order stays meaningful, because every step operates in a single currency.
- The displayed received amount and total cost always add up to the gross converted amount.
- If a future use case needs a source-currency fixed fee, it will be added as a separate,
  explicit option rather than changing this default.
