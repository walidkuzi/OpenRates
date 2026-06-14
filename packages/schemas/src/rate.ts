import { z } from "zod";
import {
  calculationMethodSchema,
  confidenceLabelSchema,
  freshnessClassSchema,
  rateModeSchema,
  rateTypeSchema,
} from "./enums";

export const normalizedRateSchema = z.object({
  baseCurrency: z.string(),
  quoteCurrency: z.string(),
  rate: z.string(),

  rateType: rateTypeSchema,
  mode: rateModeSchema,

  effectiveDate: z.string(),
  observedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  retrievedAt: z.string(),

  freshnessClass: freshnessClassSchema,
  freshnessSeconds: z.number().optional(),
  isLive: z.boolean(),
  isStale: z.boolean(),

  providerId: z.string(),
  providerName: z.string(),
  originalSourceIds: z.array(z.string()).optional(),

  calculationMethod: calculationMethodSchema,
  crossCurrency: z.string().optional(),

  confidenceScore: z.number(),
  confidenceLabel: confidenceLabelSchema,

  warnings: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
});
export type NormalizedRate = z.infer<typeof normalizedRateSchema>;
