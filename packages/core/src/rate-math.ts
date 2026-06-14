import { OpenRatesError } from "@openrates/schemas";
import { Decimal, HALF_EVEN } from "./decimal";

export const DEFAULT_RATE_DISPLAY_DP = 8;

export function inverseRate(rate: string): string {
  const value = new Decimal(rate);
  if (value.isZero()) {
    throw new OpenRatesError({
      code: "RATE_NOT_AVAILABLE",
      message: "Cannot compute the inverse of a zero rate.",
    });
  }
  return new Decimal(1).div(value).toString();
}

export function crossRate(baseToPivot: string, pivotToQuote: string): string {
  return new Decimal(baseToPivot).mul(new Decimal(pivotToQuote)).toString();
}

export function formatRate(rate: string, decimalPlaces: number = DEFAULT_RATE_DISPLAY_DP): string {
  return new Decimal(rate).toDecimalPlaces(decimalPlaces, HALF_EVEN).toString();
}

export function isPositiveRate(rate: string): boolean {
  return new Decimal(rate).greaterThan(0);
}
