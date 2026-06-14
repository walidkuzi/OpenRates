import { z } from "zod";

export const rateTypeSchema = z.enum([
  "official_reference",
  "market_midpoint",
  "market_indicative",
  "bank_buy",
  "bank_sell",
  "cash_buy",
  "cash_sell",
  "parallel_market",
  "computed_cross",
]);
export type RateType = z.infer<typeof rateTypeSchema>;

export const freshnessClassSchema = z.enum([
  "live",
  "recent",
  "latest_available",
  "latest_business_day",
  "historical_exact_date",
  "historical_previous_available_date",
  "stale",
  "unknown",
]);
export type FreshnessClass = z.infer<typeof freshnessClassSchema>;

export const rateModeSchema = z.enum(["official", "market", "auto"]);
export type RateMode = z.infer<typeof rateModeSchema>;

export const calculationMethodSchema = z.enum(["direct", "inverse", "cross"]);
export type CalculationMethod = z.infer<typeof calculationMethodSchema>;

export const confidenceLabelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLabel = z.infer<typeof confidenceLabelSchema>;

export const useCaseSchema = z.enum([
  "general",
  "accounting",
  "invoice",
  "travel",
  "ecommerce",
  "treasury",
  "trading_reference",
  "reporting",
]);
export type UseCase = z.infer<typeof useCaseSchema>;

export const datePolicySchema = z.enum(["previous_available", "strict"]);
export type DatePolicy = z.infer<typeof datePolicySchema>;

export const responseDetailSchema = z.enum(["compact", "standard", "full"]);
export type ResponseDetail = z.infer<typeof responseDetailSchema>;

export const roundingModeSchema = z.enum(["half_even"]);
export type RoundingMode = z.infer<typeof roundingModeSchema>;

export const currencyStatusSchema = z.enum(["active", "retired", "fund", "metal", "special"]);
export type CurrencyStatus = z.infer<typeof currencyStatusSchema>;
