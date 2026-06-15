export const EXPLANATION_TOPICS = [
  "official_vs_market",
  "buy_vs_sell",
  "mid_market",
  "fees_and_spread",
  "freshness",
  "cross_rate",
  "weekend_rate",
  "currency_alias",
  "provider_difference",
] as const;

export type ExplanationTopic = (typeof EXPLANATION_TOPICS)[number];

export const EXPLANATIONS: Record<ExplanationTopic, string> = {
  official_vs_market:
    "An official reference rate is published once per business day by a central bank or similar authority. It is stable and good for accounting, invoices, and reporting, but it is not a live trading price. A market rate comes from a trading feed and changes through the day; it is closer to what you might transact at, but it needs a market-data provider.",
  buy_vs_sell:
    "A buy rate is the price at which a bank or exchange buys a currency from you; a sell rate is the price at which it sells to you. The sell rate is usually higher than the buy rate. The difference is the spread, which is how the provider earns money on the exchange.",
  mid_market:
    "The mid-market (or mid) rate is the midpoint between the buy and sell rates. It is the fairest single number to describe a pair, and it is what most reference sources quote. Real transactions usually happen a little away from the mid because of the spread.",
  fees_and_spread:
    "The amount you actually receive is reduced by a spread (a worse rate than the mid) and by fees (a fixed charge, a percentage charge, or both). OpenRates applies spread first, then the percentage fee, then the fixed fee, so you can estimate the real received amount.",
  freshness:
    "Freshness describes how current a rate is. Official daily rates are labeled as the latest available or the latest business day, and are never live. Only market rates with a recent observation timestamp can be labeled live, and only within a short threshold.",
  cross_rate:
    "A cross rate is calculated by combining two pairs through a third pivot currency, for example converting through EUR or USD when a direct pair is not available. Cross rates are reported with a lower confidence because they are computed rather than quoted directly.",
  weekend_rate:
    "Official rates are published only on business days, so weekends and holidays have no new rate. By default OpenRates returns the most recent published business-day rate and tells you the actual effective date. You can request strict mode to fail instead when the exact date has no rate.",
  currency_alias:
    "Many currency names are ambiguous. 'Dollar' could mean US, Australian, Canadian, and others; 'riyal' could mean Saudi or Qatari. OpenRates resolves clear names and codes automatically, and returns candidate codes when a name is ambiguous so you can ask the user which one they mean.",
  provider_difference:
    "Two providers can quote different rates for the same pair because they use different data sources, update at different times, and classify rates differently (official versus market, mid versus buy or sell). A small difference is normal; a large difference is flagged so you can investigate.",
};
