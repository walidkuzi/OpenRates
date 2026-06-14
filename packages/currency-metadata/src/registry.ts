import type { CurrencyMetadata, CurrencyStatus } from "@openrates/schemas";
import { CURRENCIES } from "./data";

const byCode = new Map<string, CurrencyMetadata>();
for (const currency of CURRENCIES) {
  byCode.set(currency.code, currency);
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function getCurrency(code: string): CurrencyMetadata | undefined {
  return byCode.get(normalizeCode(code));
}

export function hasCurrency(code: string): boolean {
  return byCode.has(normalizeCode(code));
}

export function isActiveCurrency(code: string): boolean {
  return getCurrency(code)?.status === "active";
}

export function getMinorUnits(code: string): number | null | undefined {
  const currency = getCurrency(code);
  return currency ? currency.minorUnits : undefined;
}

export interface ListCurrenciesOptions {
  status?: CurrencyStatus | "all";
  limit?: number;
}

export function listCurrencies(options: ListCurrenciesOptions = {}): CurrencyMetadata[] {
  const status = options.status ?? "active";
  const filtered =
    status === "all"
      ? [...CURRENCIES]
      : CURRENCIES.filter((currency) => currency.status === status);
  const sorted = filtered.sort((a, b) => a.code.localeCompare(b.code));
  if (options.limit !== undefined && options.limit >= 0) {
    return sorted.slice(0, options.limit);
  }
  return sorted;
}

export function allCurrencies(): readonly CurrencyMetadata[] {
  return CURRENCIES;
}
