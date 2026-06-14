import { type ErrorCode, OpenRatesError } from "@openrates/schemas";
import type { z } from "zod";

export function validate<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  code: ErrorCode = "INVALID_REQUEST",
): z.output<S> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new OpenRatesError({
      code,
      message: "Request validation failed.",
      details: { issues: parsed.error.issues },
    });
  }
  return parsed.data;
}
