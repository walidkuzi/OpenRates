import type { CurrencyMetadata, CurrencyStatus } from "@openrates/schemas";
import { CURRENCIES } from "./data";
import { listCurrencies } from "./registry";

export interface SearchOptions {
  status?: CurrencyStatus | "all";
  limit?: number;
}

function scoreCurrency(currency: CurrencyMetadata, query: string): number {
  const code = currency.code.toLowerCase();
  const name = currency.name.toLowerCase();
  const aliases = currency.aliases.map((alias) => alias.toLowerCase());
  const symbols = currency.symbols.map((symbol) => symbol.toLowerCase());
  const countries = currency.countries.map((country) => country.toLowerCase());

  if (code === query) return 100;
  if (name === query) return 95;
  if (aliases.includes(query)) return 90;
  if (code.startsWith(query)) return 80;
  if (name.startsWith(query)) return 70;
  if (symbols.includes(query)) return 65;
  if (name.includes(query)) return 50;
  if (aliases.some((alias) => alias.includes(query))) return 40;
  if (countries.some((country) => country.includes(query))) return 30;
  if (symbols.some((symbol) => symbol.includes(query))) return 20;
  return 0;
}

export function searchCurrencies(query: string, options: SearchOptions = {}): CurrencyMetadata[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return listCurrencies(options);
  }

  const status = options.status ?? "active";
  const pool =
    status === "all" ? CURRENCIES : CURRENCIES.filter((currency) => currency.status === status);

  const scored = pool
    .map((currency) => ({ currency, score: scoreCurrency(currency, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.currency.code.localeCompare(b.currency.code))
    .map((entry) => entry.currency);

  if (options.limit !== undefined && options.limit >= 0) {
    return scored.slice(0, options.limit);
  }
  return scored;
}
