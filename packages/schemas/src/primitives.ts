import { z } from "zod";

export const currencyCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, "Currency code must be three letters."));
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

export const amountStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a non-negative decimal string.");

export const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d+)?$/, "Value must be a decimal string.");

export const positiveDecimalStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Value must be a non-negative decimal string.");

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");

export const dateInputSchema = z.union([z.literal("latest"), isoDateSchema]);
export type DateInput = z.infer<typeof dateInputSchema>;
