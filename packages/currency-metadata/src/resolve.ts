import type { CurrencyMetadata } from "@openrates/schemas";
import { CURRENCIES } from "./data";
import { getCurrency, normalizeCode } from "./registry";

const nameToCode = new Map<string, string>();
const aliasToCodes = new Map<string, string[]>();

for (const currency of CURRENCIES) {
  nameToCode.set(currency.name.toLowerCase(), currency.code);
  for (const alias of currency.aliases) {
    const key = alias.toLowerCase();
    const existing = aliasToCodes.get(key) ?? [];
    if (!existing.includes(currency.code)) {
      existing.push(currency.code);
    }
    aliasToCodes.set(key, existing);
  }
}

const AMBIGUOUS_TERMS: Record<string, string[]> = {
  dollar: ["USD", "AUD", "CAD", "NZD", "HKD", "SGD", "TWD"],
  peso: ["MXN", "ARS", "CLP", "COP", "PHP", "UYU", "DOP", "CUP"],
  franc: ["CHF", "XOF", "XAF", "XPF"],
  rupee: ["INR", "PKR", "LKR", "NPR", "MUR"],
  dinar: ["KWD", "BHD", "IQD", "JOD", "DZD", "TND", "LYD", "RSD"],
  riyal: ["SAR", "QAR"],
  rial: ["OMR", "IRR", "YER"],
  krona: ["SEK", "ISK"],
  krone: ["NOK", "DKK"],
  pound: ["GBP", "EGP", "LBP", "SDG", "SYP"],
  shilling: ["KES", "TZS", "UGX"],
};

export interface CurrencyResolution {
  query: string;
  resolved?: CurrencyMetadata;
  ambiguous: boolean;
  candidates: CurrencyMetadata[];
  note?: string;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function toCandidates(codes: string[]): CurrencyMetadata[] {
  const currencies: CurrencyMetadata[] = [];
  for (const code of codes) {
    const currency = getCurrency(code);
    if (currency) {
      currencies.push(currency);
    }
  }
  return currencies;
}

function resolutionNote(currency: CurrencyMetadata): string | undefined {
  if (currency.code === "CNY") {
    return "CNY is the onshore Chinese yuan. Market providers often quote the offshore yuan as CNH, which can trade at a different rate.";
  }
  if (currency.status === "retired") {
    const replacement = currency.replacedBy ? ` It was replaced by ${currency.replacedBy}.` : "";
    return `${currency.name} is a retired currency.${replacement}`;
  }
  return undefined;
}

function finalize(query: string, currency: CurrencyMetadata): CurrencyResolution {
  const note = resolutionNote(currency);
  return {
    query,
    resolved: currency,
    ambiguous: false,
    candidates: [currency],
    ...(note !== undefined ? { note } : {}),
  };
}

export function resolveCurrency(query: string): CurrencyResolution {
  const normalized = normalizeQuery(query);

  if (normalized.length === 0) {
    return { query, ambiguous: false, candidates: [] };
  }

  if (/^[a-z]{3}$/.test(normalized)) {
    const byExactCode = getCurrency(normalizeCode(normalized));
    if (byExactCode) {
      return finalize(query, byExactCode);
    }
  }

  const ambiguous = AMBIGUOUS_TERMS[normalized];
  if (ambiguous) {
    return { query, ambiguous: true, candidates: toCandidates(ambiguous) };
  }

  const nameCode = nameToCode.get(normalized);
  if (nameCode) {
    const currency = getCurrency(nameCode);
    if (currency) {
      return finalize(query, currency);
    }
  }

  const aliasCodes = aliasToCodes.get(normalized);
  if (aliasCodes && aliasCodes.length > 0) {
    if (aliasCodes.length === 1) {
      const [only] = aliasCodes;
      const currency = only ? getCurrency(only) : undefined;
      if (currency) {
        return finalize(query, currency);
      }
    }
    return { query, ambiguous: true, candidates: toCandidates(aliasCodes) };
  }

  return { query, ambiguous: false, candidates: [] };
}
