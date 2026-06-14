import {
  datePolicySchema,
  isoDateSchema,
  rateModeSchema,
  responseDetailSchema,
  useCaseSchema,
} from "@openrates/schemas";
import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

export const ratesQuerySchema = z.object({
  base: z.string().min(1),
  quote: z.string().min(1),
  date: z.string().min(1).optional(),
  mode: rateModeSchema.optional(),
  provider: z.string().min(1).optional(),
  useCase: useCaseSchema.optional(),
  datePolicy: datePolicySchema.optional(),
  allowFallback: booleanString.optional(),
  maxAgeSeconds: z.coerce.number().int().positive().optional(),
  responseDetail: responseDetailSchema.optional(),
});
export type RatesQuery = z.infer<typeof ratesQuerySchema>;

export const seriesQuerySchema = z.object({
  base: z.string().min(1),
  quote: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  interval: z.enum(["day", "week", "month"]).optional(),
  mode: z.enum(["official", "market"]).optional(),
  provider: z.string().min(1).optional(),
  fillPolicy: z.enum(["none", "previous"]).optional(),
  responseDetail: responseDetailSchema.optional(),
});
export type SeriesQuery = z.infer<typeof seriesQuerySchema>;

export const convertBodySchema = z.object({
  amount: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().min(1).optional(),
  mode: rateModeSchema.optional(),
  provider: z.string().min(1).optional(),
  useCase: useCaseSchema.optional(),
  datePolicy: datePolicySchema.optional(),
  allowFallback: z.boolean().optional(),
  maxAgeSeconds: z.number().int().positive().optional(),
  fixedFee: z.string().optional(),
  percentageFee: z.string().optional(),
  spreadPercentage: z.string().optional(),
  responseDetail: responseDetailSchema.optional(),
});
export type ConvertBody = z.infer<typeof convertBodySchema>;

export const currenciesQuerySchema = z.object({
  query: z.string().optional(),
  status: z.enum(["active", "retired", "all"]).optional(),
  provider: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
});
export type CurrenciesQuery = z.infer<typeof currenciesQuerySchema>;

export const currencyParamSchema = z.object({ code: z.string().min(1) });
export const providerParamSchema = z.object({ providerId: z.string().min(1) });
