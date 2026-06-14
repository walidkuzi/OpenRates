import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./openapi";

const EXPECTED_PATHS = [
  "/v1/convert",
  "/v1/rates",
  "/v1/rates/series",
  "/v1/currencies",
  "/v1/currencies/{code}",
  "/v1/providers",
  "/v1/providers/{providerId}",
  "/v1/capabilities",
  "/v1/health",
  "/v1/ready",
];

type Operation = { responses?: Record<string, unknown> };

describe("buildOpenApiDocument", () => {
  const doc = buildOpenApiDocument("1.2.3") as {
    openapi: string;
    info: { title: string; version: string };
    paths: Record<string, Record<string, Operation>>;
    components: { schemas: Record<string, unknown> };
  };

  it("declares OpenAPI 3.1 with info", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBe("OpenRates Agent Gateway");
    expect(doc.info.version).toBe("1.2.3");
  });

  it("documents every endpoint", () => {
    for (const path of EXPECTED_PATHS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
    }
  });

  it("gives every operation at least one response", () => {
    for (const [path, operations] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        expect(
          operation.responses && Object.keys(operation.responses).length > 0,
          `${method.toUpperCase()} ${path} has no responses`,
        ).toBe(true);
      }
    }
  });

  it("exposes component schemas generated from the validation schemas", () => {
    for (const name of [
      "Error",
      "FailureEnvelope",
      "NormalizedRate",
      "Conversion",
      "CurrencyMetadata",
    ]) {
      expect(doc.components.schemas[name], `missing schema ${name}`).toBeDefined();
    }
    const normalizedRate = doc.components.schemas.NormalizedRate as {
      properties?: Record<string, unknown>;
    };
    expect(normalizedRate.properties?.rateType).toBeDefined();
    expect(normalizedRate.properties?.isLive).toBeDefined();
  });
});
