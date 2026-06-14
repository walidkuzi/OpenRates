import { HttpError, HttpNetworkError, HttpTimeoutError } from "@openrates/provider-interface";
import { OpenRatesError } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { MalformedResponseError, normalizeFrankfurterError } from "./errors";

describe("normalizeFrankfurterError", () => {
  it("passes through an existing OpenRatesError", () => {
    const error = new OpenRatesError({ code: "RATE_NOT_AVAILABLE", message: "x" });
    expect(normalizeFrankfurterError(error)).toBe(error);
  });

  it("maps transport and HTTP failures to stable codes", () => {
    expect(normalizeFrankfurterError(new HttpTimeoutError()).code).toBe("PROVIDER_TIMEOUT");
    expect(normalizeFrankfurterError(new HttpNetworkError(new Error())).code).toBe(
      "PROVIDER_UNAVAILABLE",
    );
    expect(normalizeFrankfurterError(new HttpError(404, "")).code).toBe("UNSUPPORTED_PAIR");
    expect(normalizeFrankfurterError(new HttpError(429, "")).code).toBe("PROVIDER_RATE_LIMITED");
    expect(normalizeFrankfurterError(new HttpError(500, "")).code).toBe("PROVIDER_UNAVAILABLE");
    expect(normalizeFrankfurterError(new HttpError(400, "")).code).toBe("INVALID_REQUEST");
    expect(normalizeFrankfurterError(new HttpError(418, "")).code).toBe("PROVIDER_UNAVAILABLE");
    expect(normalizeFrankfurterError(new MalformedResponseError("bad")).code).toBe(
      "PROVIDER_UNAVAILABLE",
    );
    expect(normalizeFrankfurterError("unexpected").code).toBe("INTERNAL_ERROR");
  });

  it("marks transient failures as retryable", () => {
    expect(normalizeFrankfurterError(new HttpTimeoutError()).retryable).toBe(true);
    expect(normalizeFrankfurterError(new HttpError(429, "")).retryable).toBe(true);
    expect(normalizeFrankfurterError(new HttpError(503, "")).retryable).toBe(true);
  });
});
