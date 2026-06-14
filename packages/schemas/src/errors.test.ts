import { describe, expect, it } from "vitest";
import { OpenRatesError, isOpenRatesError, isRetryableCode } from "./errors";

describe("isRetryableCode", () => {
  it("marks transient provider failures as retryable", () => {
    expect(isRetryableCode("PROVIDER_TIMEOUT")).toBe(true);
    expect(isRetryableCode("PROVIDER_RATE_LIMITED")).toBe(true);
    expect(isRetryableCode("PROVIDER_UNAVAILABLE")).toBe(true);
  });

  it("marks deterministic request failures as non-retryable", () => {
    expect(isRetryableCode("UNSUPPORTED_CURRENCY")).toBe(false);
    expect(isRetryableCode("AMBIGUOUS_CURRENCY")).toBe(false);
    expect(isRetryableCode("STRICT_DATE_NOT_AVAILABLE")).toBe(false);
  });
});

describe("OpenRatesError", () => {
  it("defaults retryable from the error code", () => {
    const error = new OpenRatesError({ code: "PROVIDER_TIMEOUT", message: "timed out" });
    expect(error.retryable).toBe(true);
    expect(error.code).toBe("PROVIDER_TIMEOUT");
    expect(error.name).toBe("OpenRatesError");
    expect(isOpenRatesError(error)).toBe(true);
  });

  it("allows an explicit retryable override", () => {
    const error = new OpenRatesError({
      code: "INTERNAL_ERROR",
      message: "boom",
      retryable: false,
    });
    expect(error.retryable).toBe(false);
  });

  it("serializes to a stable shape and omits absent optional fields", () => {
    const error = new OpenRatesError({ code: "UNSUPPORTED_CURRENCY", message: "nope" });
    expect(error.toJSON()).toEqual({
      code: "UNSUPPORTED_CURRENCY",
      message: "nope",
      retryable: false,
    });
  });

  it("includes details and suggestion when provided", () => {
    const error = new OpenRatesError({
      code: "AMBIGUOUS_CURRENCY",
      message: "which dollar?",
      details: { candidates: ["USD", "AUD"] },
      suggestion: "Specify the ISO code.",
    });
    expect(error.toJSON()).toEqual({
      code: "AMBIGUOUS_CURRENCY",
      message: "which dollar?",
      retryable: false,
      details: { candidates: ["USD", "AUD"] },
      suggestion: "Specify the ISO code.",
    });
  });

  it("preserves the underlying cause", () => {
    const cause = new Error("root");
    const error = new OpenRatesError({ code: "INTERNAL_ERROR", message: "wrap", cause });
    expect(error.cause).toBe(cause);
  });
});
