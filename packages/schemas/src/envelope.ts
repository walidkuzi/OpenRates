import { z } from "zod";
import { type SerializedError, serializedErrorSchema } from "./errors";

export const failureEnvelopeSchema = z.object({
  success: z.literal(false),
  error: serializedErrorSchema,
  requestId: z.string(),
});
export type FailureEnvelope = z.infer<typeof failureEnvelopeSchema>;

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  requestId: string;
  generatedAt: string;
}

export function successEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    requestId: z.string(),
    generatedAt: z.string(),
  });
}

export function toSuccessEnvelope<T>(
  data: T,
  requestId: string,
  generatedAt: string,
): SuccessEnvelope<T> {
  return { success: true, data, requestId, generatedAt };
}

export function toFailureEnvelope(error: SerializedError, requestId: string): FailureEnvelope {
  return { success: false, error, requestId };
}
