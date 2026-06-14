import { z } from "zod";
import { datePolicySchema, rateModeSchema, useCaseSchema } from "./enums";

export const rateRequestPolicySchema = z.object({
  mode: rateModeSchema,
  provider: z.string().optional(),
  maxAgeSeconds: z.number().int().positive().optional(),
  allowFallback: z.boolean(),
  datePolicy: datePolicySchema,
  useCase: useCaseSchema.optional(),
});
export type RateRequestPolicy = z.infer<typeof rateRequestPolicySchema>;
