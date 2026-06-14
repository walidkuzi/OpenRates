# Freshness

Freshness tells an agent how current a rate is. It is one of the most important parts of
OpenRates, because an official daily rate must never be presented as a live market rate.

## Time fields

A rate can carry several timestamps:

- `effectiveDate` — the date the rate applies to.
- `observedAt` — when a market value was observed, if the provider supplies it.
- `publishedAt` — when the provider published the value, if available.
- `retrievedAt` — when OpenRates fetched it.

The reference instant for classification is "now", which is injected so results are
deterministic and testable.

## Freshness classes

| Class | Meaning |
|---|---|
| `live` | A market rate observed inside the live threshold. |
| `recent` | A market rate observed inside the recent threshold. |
| `latest_available` | The most current value the provider has, today. |
| `latest_business_day` | The latest published value from an earlier business day (weekend or holiday). |
| `historical_exact_date` | The published value for the exact requested date. |
| `historical_previous_available_date` | The previous published value when the exact date had none. |
| `stale` | Older than the allowed age and must not be treated as current. |
| `unknown` | The provider gave no timestamp, so liveness cannot be proven. |

## When a rate may be marked live

A result is `isLive: true` only when **all** of the following hold:

1. The provider supports intraday rates.
2. The provider supplies a reliable observation or publication timestamp.
3. The value's age is within the configured live threshold.
4. The adapter classifies the value as market data.

Official daily reference rates (such as Frankfurter) never satisfy these conditions. They
are classified as `latest_available`, `latest_business_day`, `historical_exact_date`, or
`historical_previous_available_date`, and `isLive` is always `false`.

## Default thresholds

```env
OPENRATES_LIVE_THRESHOLD_SECONDS=300
OPENRATES_RECENT_THRESHOLD_SECONDS=3600
```

## When a rate is stale

A rate is stale when:

- its age exceeds `maxAgeSeconds`, or
- its age exceeds the provider's expected update interval plus tolerance.

A stale rate is returned only when the request policy explicitly allows it, and it is never
labeled live.
