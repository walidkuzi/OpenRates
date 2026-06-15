import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listCurrencies, resolveCurrency, searchCurrencies } from "@openrates/currency-metadata";
import { type RateEngine, shapeComparison, shapeConversion, shapeRate, shapeSeries } from "@openrates/router";
import {
  type OpenRatesConfig,
  OpenRatesError,
  datePolicySchema,
  rateModeSchema,
  responseDetailSchema,
  useCaseSchema,
} from "@openrates/schemas";
import { z } from "zod";
import { EXPLANATIONS, EXPLANATION_TOPICS } from "./explanations";
import { SERVER_INSTRUCTIONS } from "./instructions";
import { registerResources } from "./resources";

export interface McpServerDeps {
  engine: RateEngine;
  config: OpenRatesConfig;
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const serialized =
    error instanceof OpenRatesError
      ? error.toJSON()
      : {
          code: "INTERNAL_ERROR" as const,
          message: error instanceof Error ? error.message : "Unknown error.",
          retryable: false,
        };
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: serialized }, null, 2) }],
    isError: true,
  };
}

export function createMcpServer(deps: McpServerDeps): McpServer {
  const { engine, config } = deps;

  const server = new McpServer(
    { name: "openrates-agent", version: "1.0.0", title: "OpenRates Agent Gateway" },
    { instructions: SERVER_INSTRUCTIONS },
  );

  server.registerTool(
    "convert_currency",
    {
      title: "Convert currency",
      description:
        "Convert an amount from one currency to another. Returns the converted amount with its rate, rate type, effective date, provider, and freshness. Official daily rates are never live.",
      inputSchema: {
        amount: z.string().describe('Amount to convert, as a decimal string, e.g. "1000.00".'),
        from: z.string().describe("Source currency code or name."),
        to: z.string().describe("Target currency code or name."),
        date: z.string().optional().describe('YYYY-MM-DD or "latest". Defaults to latest.'),
        mode: rateModeSchema.optional().describe("official (default), market, or auto."),
        provider: z.string().optional(),
        useCase: useCaseSchema.optional(),
        datePolicy: datePolicySchema.optional(),
        allowFallback: z.boolean().optional(),
        maxAgeSeconds: z.number().int().positive().optional(),
        fixedFee: z.string().optional().describe("Fixed fee in the target currency."),
        percentageFee: z.string().optional().describe('Percentage fee, e.g. "2" for 2%.'),
        spreadPercentage: z.string().optional().describe('Spread percentage, e.g. "1" for 1%.'),
        responseDetail: responseDetailSchema.optional(),
      },
    },
    async (args) => {
      try {
        const result = await engine.convert({
          amount: args.amount,
          base: args.from,
          quote: args.to,
          date: args.date,
          mode: args.mode,
          provider: args.provider,
          useCase: args.useCase,
          datePolicy: args.datePolicy,
          allowFallback: args.allowFallback,
          maxAgeSeconds: args.maxAgeSeconds,
          fixedFee: args.fixedFee,
          percentageFee: args.percentageFee,
          spreadPercentage: args.spreadPercentage,
        });
        return ok(shapeConversion(result, args.responseDetail ?? "standard"));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_exchange_rate",
    {
      title: "Get exchange rate",
      description:
        "Get the exchange rate between two currencies without converting an amount. Returns the rate, calculation method, effective date, provider, freshness, and confidence.",
      inputSchema: {
        base: z.string().describe("Base currency code or name."),
        quote: z.string().describe("Quote currency code or name."),
        date: z.string().optional().describe('YYYY-MM-DD or "latest". Defaults to latest.'),
        mode: rateModeSchema.optional(),
        provider: z.string().optional(),
        useCase: useCaseSchema.optional(),
        datePolicy: datePolicySchema.optional(),
        allowFallback: z.boolean().optional(),
        maxAgeSeconds: z.number().int().positive().optional(),
        responseDetail: responseDetailSchema.optional(),
      },
    },
    async (args) => {
      try {
        const result = await engine.getRate({
          base: args.base,
          quote: args.quote,
          date: args.date,
          mode: args.mode,
          provider: args.provider,
          useCase: args.useCase,
          datePolicy: args.datePolicy,
          allowFallback: args.allowFallback,
          maxAgeSeconds: args.maxAgeSeconds,
        });
        return ok(shapeRate(result, args.responseDetail ?? "standard"));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_exchange_rate_series",
    {
      title: "Get exchange rate series",
      description:
        "Get a historical time series of rates for a currency pair between two dates. Filled days are marked so invented values are never hidden.",
      inputSchema: {
        base: z.string(),
        quote: z.string(),
        startDate: z.string().describe("Start date, YYYY-MM-DD."),
        endDate: z.string().describe("End date, YYYY-MM-DD."),
        interval: z.enum(["day", "week", "month"]).optional(),
        mode: z.enum(["official", "market"]).optional(),
        provider: z.string().optional(),
        fillPolicy: z.enum(["none", "previous"]).optional(),
        responseDetail: responseDetailSchema.optional(),
      },
    },
    async (args) => {
      try {
        const result = await engine.getSeries({
          base: args.base,
          quote: args.quote,
          startDate: args.startDate,
          endDate: args.endDate,
          mode: args.mode,
          provider: args.provider,
          fillPolicy: args.fillPolicy,
        });
        return ok(shapeSeries(result, args.responseDetail ?? "standard"));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_currencies",
    {
      title: "List currencies",
      description:
        "Discover supported currencies and resolve ambiguous names. With a query, searches code, name, country, symbol, and aliases, and returns candidate codes when a name is ambiguous.",
      inputSchema: {
        query: z.string().optional().describe('Search term, e.g. "riyal" or "dollar".'),
        status: z.enum(["active", "retired", "all"]).optional(),
        provider: z.string().optional(),
        limit: z.number().int().positive().max(1000).optional(),
      },
    },
    (args) => {
      try {
        const status = args.status ?? "active";
        const currencies =
          args.query !== undefined
            ? searchCurrencies(args.query, { status, limit: args.limit })
            : listCurrencies({ status, limit: args.limit });
        const data: Record<string, unknown> = { count: currencies.length, currencies };
        if (args.query !== undefined) {
          const resolution = resolveCurrency(args.query);
          if (resolution.ambiguous) {
            data.ambiguous = { candidates: resolution.candidates.map((currency) => currency.code) };
          } else if (resolution.resolved) {
            data.resolved = resolution.resolved.code;
          }
          if (resolution.note !== undefined) {
            data.note = resolution.note;
          }
        }
        return ok(data);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "compare_exchange_rate_providers",
    {
      title: "Compare exchange rate providers",
      description:
        "Compare the same currency pair across configured providers. Returns each provider's rate, the percentage difference from the median, and whether the providers disagree.",
      inputSchema: {
        base: z.string(),
        quote: z.string(),
        date: z.string().optional(),
        providers: z.array(z.string()).optional(),
        mode: rateModeSchema.optional(),
        maxProviders: z.number().int().positive().optional(),
      },
    },
    async (args) => {
      try {
        const result = await engine.compareProviders(
          {
            base: args.base,
            quote: args.quote,
            date: args.date,
            providers: args.providers,
            mode: args.mode,
            maxProviders: args.maxProviders,
          },
          config.providerDisagreementPercent,
        );
        return ok(shapeComparison(result, "standard"));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "explain_exchange_rate",
    {
      title: "Explain exchange rate",
      description:
        "Explain an exchange-rate concept in plain language, suitable for including in a user-facing answer. Uses local documentation and does not call a provider.",
      inputSchema: {
        topic: z.enum(EXPLANATION_TOPICS),
        context: z
          .object({
            base: z.string().optional(),
            quote: z.string().optional(),
            provider: z.string().optional(),
          })
          .optional(),
      },
    },
    (args) => {
      try {
        return ok({
          topic: args.topic,
          explanation: EXPLANATIONS[args.topic],
          ...(args.context ? { context: args.context } : {}),
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  registerResources(server, { engine, config });

  return server;
}
