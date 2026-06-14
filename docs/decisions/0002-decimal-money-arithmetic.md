# 0002 — Decimal arithmetic for all monetary calculations

## Status

Accepted.

## Context

Currency conversion must be exact. Binary floating-point math introduces rounding errors
(for example, `0.1 + 0.2 !== 0.3`), which are unacceptable for money.

## Decision

Represent every amount and rate as a decimal string at the system boundary, and perform all
arithmetic with a configured Decimal.js constructor:

- 50 significant digits of precision, which exceeds the 18 digits required for inverse and
  cross rates.
- Half-even (banker's) rounding as the default mode.
- Converted amounts are rounded to the target currency's minor units.

Native JavaScript numbers are never used in a monetary path.

## Consequences

- Results are reproducible and free of floating-point drift, which the property tests
  verify across generated inputs.
- Values stay as strings end to end, so no precision is lost in transport or storage.
- Callers that need full precision receive the unrounded amount alongside the rounded one.
