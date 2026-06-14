# Precision and rounding

OpenRates treats money as exact decimal values, never as binary floating-point numbers.
This page explains how amounts and rates flow through the system.

## Amounts and rates are strings

Every amount and rate enters and leaves the system as a decimal string, for example
`"1000.00"` or `"0.865421"`. Strings avoid the rounding errors that happen when a value
like `0.1` is stored as a binary floating-point number.

Internally, calculations use [Decimal.js](https://mikemcl.github.io/decimal.js/) configured
with 50 significant digits and banker's rounding. This gives well above the 18 significant
digits the product requires for inverse and cross rates.

## Rate precision

- Direct provider rates keep the precision the provider supplied.
- Inverse and cross rates are computed at full internal precision.
- For display, rates are formatted to 8 decimal places by default (`formatRate`).
- Full-detail responses keep the full-precision rate string.

## Monetary rounding

A converted amount is rounded to the target currency's minor units:

| Currency | Minor units | Example |
|---|---|---|
| USD, EUR | 2 | `865.42` |
| JPY, KRW | 0 | `150500` |
| KWD, BHD, OMR | 3 | `30.542` |

Rounding uses the **half-even** mode, also called banker's rounding. When a value sits
exactly halfway, it rounds to the nearest even digit. This removes the upward bias of
always rounding halves up.

```text
2.345 rounded to 2 places -> 2.34   (4 is even)
2.355 rounded to 2 places -> 2.36   (rounds to even 6)
```

If a currency's minor units are unknown, OpenRates rounds to 2 places and adds a warning so
the caller knows the precision was assumed.

The full response always includes the unrounded amount so nothing is hidden.

## Fees and spread

When fee inputs are supplied, they are applied in a fixed, documented order:

1. Compute the gross converted amount (`amount * rate`).
2. Apply the spread percentage.
3. Apply the percentage fee.
4. Subtract the fixed fee.
5. Round the final received amount to the target minor units.

The fixed fee is expressed in the **target** currency, because it is applied after the
conversion. `estimatedReceivedAmount` is what the recipient gets, and `totalEstimatedCost`
is the gross converted amount minus that received amount.

Worked example: convert 1000 at rate 1 with a 1% spread, a 2% fee, and a fixed fee of 5.

```text
gross        = 1000.00
after spread = 1000.00 * 0.99 = 990.00
after % fee  =  990.00 * 0.98 = 970.20
after fixed  =  970.20 - 5    = 965.20  -> estimatedReceivedAmount
total cost   = 1000.00 - 965.20 = 34.80 -> totalEstimatedCost
```
