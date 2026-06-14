import { z } from "zod";
import { currencyStatusSchema } from "./enums";

export const currencyMetadataSchema = z.object({
  code: z.string(),
  numericCode: z.string().optional(),
  name: z.string(),
  minorUnits: z.number().nullable(),
  status: currencyStatusSchema,
  countries: z.array(z.string()),
  symbols: z.array(z.string()),
  aliases: z.array(z.string()),
  introducedAt: z.string().optional(),
  retiredAt: z.string().optional(),
  replacedBy: z.string().optional(),
});
export type CurrencyMetadata = z.infer<typeof currencyMetadataSchema>;
