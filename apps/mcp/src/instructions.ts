export const SERVER_INSTRUCTIONS = `OpenRates gives you trustworthy currency exchange rates. Use it whenever a task needs a current or historical exchange rate, instead of relying on your own memory.

When to use which tool:
- convert_currency: convert a specific amount from one currency to another.
- get_exchange_rate: get the rate for a pair without converting an amount.
- get_exchange_rate_series: get a historical time series for a pair.
- list_currencies: discover supported currencies or resolve an ambiguous currency name.
- compare_exchange_rate_providers: compare the same pair across configured providers.
- explain_exchange_rate: explain an exchange-rate concept in plain language.

Rules:
- Use official mode (the default) for accounting, invoices, reporting, and general questions.
- Use market mode only when the user needs a more current indicative rate AND a market provider is configured.
- Always state the effective date and the rate type in your answer to the user.
- Mention that banks and payment providers may add fees and spread when it is relevant.
- Never describe an official daily reference rate as live or real-time. Official rates are daily.
- Ask the user for clarification only when the currency itself is ambiguous (for example, "dollar"). Use list_currencies to surface the candidates.
- Every response includes the source provider, effective date, freshness, and confidence. Pass these on so the user understands the result.`;
