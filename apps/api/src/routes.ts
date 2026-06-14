import {
  getCurrency,
  listCurrencies,
  resolveCurrency,
  searchCurrencies,
} from "@openrates/currency-metadata";
import { type RateEngine, shapeConversion, shapeRate, shapeSeries } from "@openrates/router";
import { type OpenRatesConfig, OpenRatesError } from "@openrates/schemas";
import type { FastifyInstance } from "fastify";
import { sendSuccess } from "./http";
import {
  convertBodySchema,
  currenciesQuerySchema,
  currencyParamSchema,
  providerParamSchema,
  ratesQuerySchema,
  seriesQuerySchema,
} from "./schemas";
import { validate } from "./validation";

export interface RouteDeps {
  engine: RateEngine;
  config: OpenRatesConfig;
}

export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { engine, config } = deps;

  app.get("/v1/health", (request, reply) => {
    sendSuccess(request, reply, { status: "ok" });
  });

  app.get("/v1/ready", async (request, reply) => {
    const entry = engine.registry.get(config.defaultProvider);
    if (!entry) {
      sendSuccess(request, reply, { ready: false, reason: "default provider not configured" }, 503);
      return;
    }
    const health = await engine.health.check(entry.provider);
    const ready = health.status !== "unavailable";
    sendSuccess(
      request,
      reply,
      { ready, provider: entry.provider.id, status: health.status },
      ready ? 200 : 503,
    );
  });

  app.get("/v1/capabilities", async (request, reply) => {
    const providers = [];
    for (const entry of engine.registry.ordered()) {
      providers.push({
        id: entry.provider.id,
        name: entry.provider.name,
        capabilities: await engine.registry.capabilities(entry.provider.id),
      });
    }
    sendSuccess(request, reply, {
      service: { name: "openrates-agent", version: "1.0.0" },
      modes: ["official", "market", "auto"],
      defaultProvider: config.defaultProvider,
      providers,
    });
  });

  app.get("/v1/providers", async (request, reply) => {
    const providers = [];
    for (const entry of engine.registry.ordered()) {
      providers.push({
        id: entry.provider.id,
        name: entry.provider.name,
        trust: entry.trust,
        order: entry.order,
        capabilities: await engine.registry.capabilities(entry.provider.id),
      });
    }
    sendSuccess(request, reply, { providers });
  });

  app.get("/v1/providers/:providerId", async (request, reply) => {
    const { providerId } = validate(providerParamSchema, request.params);
    const entry = engine.registry.get(providerId);
    if (!entry) {
      throw new OpenRatesError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: `Provider "${providerId}" is not configured.`,
        details: { provider: providerId },
      });
    }
    sendSuccess(request, reply, {
      id: entry.provider.id,
      name: entry.provider.name,
      trust: entry.trust,
      order: entry.order,
      capabilities: await engine.registry.capabilities(providerId),
    });
  });

  app.get("/v1/currencies", (request, reply) => {
    const query = validate(currenciesQuerySchema, request.query);
    const status = query.status ?? "active";
    const currencies =
      query.query !== undefined
        ? searchCurrencies(query.query, { status, limit: query.limit })
        : listCurrencies({ status, limit: query.limit });
    sendSuccess(request, reply, { count: currencies.length, currencies });
  });

  app.get("/v1/currencies/:code", (request, reply) => {
    const { code } = validate(currencyParamSchema, request.params);
    const direct = getCurrency(code);
    if (direct) {
      sendSuccess(request, reply, direct);
      return;
    }
    const resolution = resolveCurrency(code);
    if (resolution.resolved) {
      sendSuccess(request, reply, resolution.resolved);
      return;
    }
    if (resolution.ambiguous) {
      throw new OpenRatesError({
        code: "AMBIGUOUS_CURRENCY",
        message: `The currency "${code}" is ambiguous.`,
        details: { candidates: resolution.candidates.map((currency) => currency.code) },
        suggestion: "Use the ISO 4217 currency code.",
      });
    }
    throw new OpenRatesError({
      code: "UNSUPPORTED_CURRENCY",
      message: `The currency "${code}" is not supported.`,
    });
  });

  app.get("/v1/rates", async (request, reply) => {
    const query = validate(ratesQuerySchema, request.query);
    const result = await engine.getRate({
      base: query.base,
      quote: query.quote,
      date: query.date,
      mode: query.mode,
      provider: query.provider,
      useCase: query.useCase,
      datePolicy: query.datePolicy,
      allowFallback: query.allowFallback,
      maxAgeSeconds: query.maxAgeSeconds,
    });
    sendSuccess(request, reply, shapeRate(result, query.responseDetail ?? "standard"));
  });

  app.get("/v1/rates/series", async (request, reply) => {
    const query = validate(seriesQuerySchema, request.query);
    const result = await engine.getSeries({
      base: query.base,
      quote: query.quote,
      startDate: query.startDate,
      endDate: query.endDate,
      mode: query.mode,
      provider: query.provider,
      fillPolicy: query.fillPolicy,
    });
    sendSuccess(request, reply, shapeSeries(result, query.responseDetail ?? "standard"));
  });

  app.post("/v1/convert", async (request, reply) => {
    const body = validate(convertBodySchema, request.body);
    const result = await engine.convert({
      amount: body.amount,
      base: body.from,
      quote: body.to,
      date: body.date,
      mode: body.mode,
      provider: body.provider,
      useCase: body.useCase,
      datePolicy: body.datePolicy,
      allowFallback: body.allowFallback,
      maxAgeSeconds: body.maxAgeSeconds,
      fixedFee: body.fixedFee,
      percentageFee: body.percentageFee,
      spreadPercentage: body.spreadPercentage,
    });
    sendSuccess(request, reply, shapeConversion(result, body.responseDetail ?? "standard"));
  });
}
