import { z } from "zod";
import { roundingModeSchema } from "./enums";
import { normalizedRateSchema } from "./rate";

export const feesSchema = z.object({
  fixedFee: z.string().optional(),
  percentageFee: z.string().optional(),
  spreadPercentage: z.string().optional(),
  totalEstimatedCost: z.string().optional(),
  estimatedReceivedAmount: z.string().optional(),
});
export type Fees = z.infer<typeof feesSchema>;

export const moneyConversionResultSchema = z.object({
  input: z.object({
    amount: z.string(),
    from: z.string(),
    to: z.string(),
  }),
  rate: normalizedRateSchema,
  result: z.object({
    unroundedAmount: z.string(),
    roundedAmount: z.string(),
    minorUnits: z.number(),
    roundingMode: roundingModeSchema,
  }),
  fees: feesSchema.optional(),
  disclaimer: z.string(),
});
export type MoneyConversionResult = z.infer<typeof moneyConversionResultSchema>;
