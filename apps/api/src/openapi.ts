import {
  currencyMetadataSchema,
  moneyConversionResultSchema,
  normalizedRateSchema,
  serializedErrorSchema,
} from "@openrates/schemas";
import type { ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { convertBodySchema } from "./schemas";

type JsonObject = Record<string, unknown>;

function jsonSchema(schema: ZodTypeAny): JsonObject {
  return zodToJsonSchema(schema, {
    target: "openApi3",
    $refStrategy: "none",
  }) as unknown as JsonObject;
}

function queryParam(name: string, schema: JsonObject, required = false): JsonObject {
  return { name, in: "query", required, schema };
}

function pathParam(name: string): JsonObject {
  return { name, in: "path", required: true, schema: { type: "string" } };
}

function failureResponse(description: string): JsonObject {
  return {
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/FailureEnvelope" } } },
  };
}

function successResponse(description: string, dataRef?: string): JsonObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { const: true },
            data: dataRef ? { $ref: dataRef } : { type: "object" },
            requestId: { type: "string" },
            generatedAt: { type: "string" },
          },
          required: ["success", "data", "requestId", "generatedAt"],
        },
      },
    },
  };
}

const STRING: JsonObject = { type: "string" };

export function buildOpenApiDocument(version = "1.0.0"): JsonObject {
  return {
    openapi: "3.1.0",
    info: {
      title: "OpenRates Agent Gateway",
      version,
      description:
        "Trustworthy currency exchange rates for AI agents. Official daily reference rates are never labeled live.",
    },
    servers: [{ url: "/" }],
    paths: {
      "/v1/convert": {
        post: {
          summary: "Convert an amount between two currencies.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: jsonSchema(convertBodySchema) } },
          },
          responses: {
            "200": successResponse("Conversion result."),
            "400": failureResponse("Validation or currency error."),
            default: failureResponse("Error."),
          },
        },
      },
      "/v1/rates": {
        get: {
          summary: "Get the exchange rate for a currency pair.",
          parameters: [
            queryParam("base", STRING, true),
            queryParam("quote", STRING, true),
            queryParam("date", STRING),
            queryParam("mode", { type: "string", enum: ["official", "market", "auto"] }),
            queryParam("provider", STRING),
            queryParam("useCase", STRING),
            queryParam("datePolicy", { type: "string", enum: ["previous_available", "strict"] }),
            queryParam("allowFallback", { type: "string", enum: ["true", "false"] }),
            queryParam("maxAgeSeconds", { type: "integer" }),
            queryParam("responseDetail", { type: "string", enum: ["compact", "standard", "full"] }),
          ],
          responses: {
            "200": successResponse("Rate result.", "#/components/schemas/NormalizedRate"),
            "400": failureResponse("Error."),
            default: failureResponse("Error."),
          },
        },
      },
      "/v1/rates/series": {
        get: {
          summary: "Get a historical rate time series.",
          parameters: [
            queryParam("base", STRING, true),
            queryParam("quote", STRING, true),
            queryParam("startDate", STRING, true),
            queryParam("endDate", STRING, true),
            queryParam("interval", { type: "string", enum: ["day", "week", "month"] }),
            queryParam("mode", { type: "string", enum: ["official", "market"] }),
            queryParam("provider", STRING),
            queryParam("fillPolicy", { type: "string", enum: ["none", "previous"] }),
            queryParam("responseDetail", { type: "string", enum: ["compact", "standard", "full"] }),
          ],
          responses: {
            "200": successResponse("Series result."),
            default: failureResponse("Error."),
          },
        },
      },
      "/v1/currencies": {
        get: {
          summary: "List or search supported currencies.",
          parameters: [
            queryParam("query", STRING),
            queryParam("status", { type: "string", enum: ["active", "retired", "all"] }),
            queryParam("limit", { type: "integer" }),
          ],
          responses: {
            "200": successResponse("Currency list."),
            default: failureResponse("Error."),
          },
        },
      },
      "/v1/currencies/{code}": {
        get: {
          summary: "Get metadata for one currency.",
          parameters: [pathParam("code")],
          responses: {
            "200": successResponse("Currency.", "#/components/schemas/CurrencyMetadata"),
            "404": failureResponse("Not found."),
            default: failureResponse("Error."),
          },
        },
      },
      "/v1/providers": {
        get: {
          summary: "List configured providers.",
          responses: {
            "200": successResponse("Providers."),
            default: failureResponse("Error."),
          },
        },
      },
      "/v1/providers/{providerId}": {
        get: {
          summary: "Get one provider.",
          parameters: [pathParam("providerId")],
          responses: {
            "200": successResponse("Provider."),
            "404": failureResponse("Not found."),
            default: failureResponse("Error."),
          },
        },
      },
      "/v1/capabilities": {
        get: {
          summary: "Server and provider capabilities.",
          responses: { "200": successResponse("Capabilities.") },
        },
      },
      "/v1/health": {
        get: {
          summary: "Liveness probe.",
          responses: { "200": successResponse("OK.") },
        },
      },
      "/v1/ready": {
        get: {
          summary: "Readiness probe.",
          responses: {
            "200": successResponse("Ready."),
            "503": failureResponse("Not ready."),
          },
        },
      },
    },
    components: {
      schemas: {
        Error: jsonSchema(serializedErrorSchema),
        FailureEnvelope: {
          type: "object",
          properties: {
            success: { const: false },
            error: { $ref: "#/components/schemas/Error" },
            requestId: { type: "string" },
          },
          required: ["success", "error", "requestId"],
        },
        NormalizedRate: jsonSchema(normalizedRateSchema),
        Conversion: jsonSchema(moneyConversionResultSchema),
        CurrencyMetadata: jsonSchema(currencyMetadataSchema),
      },
    },
  };
}
