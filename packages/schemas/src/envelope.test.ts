import { describe, expect, it } from "vitest";
import { failureEnvelopeSchema, toFailureEnvelope, toSuccessEnvelope } from "./envelope";
import { OpenRatesError } from "./errors";

describe("envelopes", () => {
  it("builds a success envelope", () => {
    const envelope = toSuccessEnvelope({ rate: "0.86" }, "req_1", "2026-06-14T20:00:00Z");
    expect(envelope).toEqual({
      success: true,
      data: { rate: "0.86" },
      requestId: "req_1",
      generatedAt: "2026-06-14T20:00:00Z",
    });
  });

  it("builds a failure envelope from a serialized error", () => {
    const error = new OpenRatesError({
      code: "UNSUPPORTED_CURRENCY",
      message: "The currency code XYZ is not supported.",
    });
    const envelope = toFailureEnvelope(error.toJSON(), "req_2");
    expect(envelope.success).toBe(false);
    expect(envelope.requestId).toBe("req_2");
    expect(failureEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });
});
