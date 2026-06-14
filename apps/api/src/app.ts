import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { RateEngine } from "@openrates/router";
import type { OpenRatesConfig } from "@openrates/schemas";
import scalar from "@scalar/fastify-api-reference";
import Fastify, { type FastifyInstance } from "fastify";
import { registerErrorHandling, sendFailure } from "./http";
import { buildOpenApiDocument } from "./openapi";
import { registerRoutes } from "./routes";

export interface BuildAppOptions {
  engine: RateEngine;
  config: OpenRatesConfig;
}

const PUBLIC_PREFIXES = ["/v1/health", "/v1/ready", "/openapi.json", "/docs"];

function isPublic(url: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`),
  );
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { engine, config } = options;
  const app = Fastify({
    genReqId: () => `req_${randomUUID()}`,
    bodyLimit: 1_000_000,
    logger: false,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });

  if (config.rateLimitEnabled) {
    await app.register(rateLimit, {
      max: config.rateLimitPerMinute,
      timeWindow: "1 minute",
    });
  }

  if (config.apiAuthEnabled) {
    const keys = new Set(config.apiKeys);
    app.addHook("onRequest", async (request, reply) => {
      if (isPublic(request.url)) {
        return;
      }
      const header = request.headers["x-api-key"];
      const provided = typeof header === "string" ? header : undefined;
      if (provided === undefined || !keys.has(provided)) {
        sendFailure(
          request,
          reply,
          { code: "INVALID_REQUEST", message: "Missing or invalid API key.", retryable: false },
          401,
        );
        return reply;
      }
    });
  }

  registerErrorHandling(app, config.nodeEnv === "production");

  const openapi = buildOpenApiDocument();
  app.get("/openapi.json", () => openapi);
  await app.register(scalar, {
    routePrefix: "/docs",
    configuration: { url: "/openapi.json" },
  });

  registerRoutes(app, { engine, config });

  return app;
}
