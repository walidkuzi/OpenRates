import { listCurrencies, searchCurrencies } from "@openrates/currency-metadata";
import { type RateEngine, shapeConversion, shapeRate, shapeSeries } from "@openrates/router";
import { type OpenRatesConfig, OpenRatesError, type RateMode } from "@openrates/schemas";
import { formatConversionHuman, formatRateHuman, formatSeriesHuman } from "./format";

export interface RunDeps {
  engine: RateEngine;
  config: OpenRatesConfig;
  out: (line: string) => void;
  err: (line: string) => void;
}

type Flags = Record<string, string | boolean>;

const HELP = `OpenRates CLI

Usage:
  openrates rate <base> <quote> [--date <YYYY-MM-DD>] [--mode <m>] [--provider <id>] [--json]
  openrates convert <amount> <from> <to> [--date <d>] [--mode <m>] [--fixed-fee <n>] [--percentage-fee <n>] [--spread <n>] [--json]
  openrates series <base> <quote> --from <d> --to <d> [--fill none|previous] [--json]
  openrates currencies [--search <q>] [--status active|retired|all] [--limit <n>] [--json]
  openrates providers [--json]
  openrates doctor [--json]
  openrates mcp --stdio

Official daily reference rates are never reported as live.`;

function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        index += 1;
      }
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}

function flagString(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function flagNumber(flags: Flags, key: string): number | undefined {
  const value = flagString(flags, key);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function flagBool(flags: Flags, key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}

function flagMode(flags: Flags): RateMode | undefined {
  const value = flagString(flags, "mode");
  if (value === "official" || value === "market" || value === "auto") {
    return value;
  }
  return undefined;
}

function emitJson(deps: RunDeps, value: unknown): void {
  deps.out(JSON.stringify(value, null, 2));
}

async function cmdRate(deps: RunDeps, args: string[], flags: Flags): Promise<number> {
  const [base, quote] = args;
  if (base === undefined || quote === undefined) {
    deps.err("Usage: openrates rate <base> <quote>");
    return 1;
  }
  const result = await deps.engine.getRate({
    base,
    quote,
    date: flagString(flags, "date"),
    mode: flagMode(flags),
    provider: flagString(flags, "provider"),
  });
  if (flagBool(flags, "json")) {
    emitJson(deps, shapeRate(result, "standard"));
  } else {
    deps.out(formatRateHuman(result));
  }
  return 0;
}

async function cmdConvert(deps: RunDeps, args: string[], flags: Flags): Promise<number> {
  const [amount, from, to] = args;
  if (amount === undefined || from === undefined || to === undefined) {
    deps.err("Usage: openrates convert <amount> <from> <to>");
    return 1;
  }
  const result = await deps.engine.convert({
    amount,
    base: from,
    quote: to,
    date: flagString(flags, "date"),
    mode: flagMode(flags),
    provider: flagString(flags, "provider"),
    fixedFee: flagString(flags, "fixed-fee"),
    percentageFee: flagString(flags, "percentage-fee"),
    spreadPercentage: flagString(flags, "spread"),
  });
  if (flagBool(flags, "json")) {
    emitJson(deps, shapeConversion(result, "standard"));
  } else {
    deps.out(formatConversionHuman(result));
  }
  return 0;
}

async function cmdSeries(deps: RunDeps, args: string[], flags: Flags): Promise<number> {
  const [base, quote] = args;
  const from = flagString(flags, "from");
  const to = flagString(flags, "to");
  if (base === undefined || quote === undefined || from === undefined || to === undefined) {
    deps.err("Usage: openrates series <base> <quote> --from <YYYY-MM-DD> --to <YYYY-MM-DD>");
    return 1;
  }
  const fill = flagString(flags, "fill");
  const result = await deps.engine.getSeries({
    base,
    quote,
    startDate: from,
    endDate: to,
    fillPolicy: fill === "previous" ? "previous" : "none",
  });
  if (flagBool(flags, "json")) {
    emitJson(deps, shapeSeries(result, "standard"));
  } else {
    deps.out(formatSeriesHuman(result));
  }
  return 0;
}

function cmdCurrencies(deps: RunDeps, flags: Flags): number {
  const statusFlag = flagString(flags, "status");
  const status = statusFlag === "retired" || statusFlag === "all" ? statusFlag : "active";
  const limit = flagNumber(flags, "limit");
  const query = flagString(flags, "search");
  const currencies =
    query !== undefined
      ? searchCurrencies(query, { status, limit })
      : listCurrencies({ status, limit });
  if (flagBool(flags, "json")) {
    emitJson(deps, { count: currencies.length, currencies });
  } else {
    for (const currency of currencies) {
      deps.out(`${currency.code}  ${currency.name}  (minor units: ${currency.minorUnits ?? "?"})`);
    }
  }
  return 0;
}

async function cmdProviders(deps: RunDeps, flags: Flags): Promise<number> {
  const providers = [];
  for (const entry of deps.engine.registry.ordered()) {
    const capabilities = await deps.engine.registry.capabilities(entry.provider.id);
    providers.push({ id: entry.provider.id, name: entry.provider.name, capabilities });
  }
  if (flagBool(flags, "json")) {
    emitJson(deps, { providers });
  } else {
    for (const provider of providers) {
      const capabilities = provider.capabilities;
      deps.out(
        `${provider.id}  ${provider.name}  modes: ${capabilities?.supportedModes.join(",")}  historical: ${capabilities?.supportsHistorical}  live: ${capabilities?.supportsIntraday}`,
      );
    }
  }
  return 0;
}

async function cmdDoctor(deps: RunDeps, flags: Flags): Promise<number> {
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];
  checks.push({ name: "Configuration loaded", ok: true });

  const entry = deps.engine.registry.get(deps.config.defaultProvider);
  checks.push({
    name: `Default provider '${deps.config.defaultProvider}' configured`,
    ok: entry !== undefined,
  });

  if (entry !== undefined) {
    try {
      const health = await deps.engine.health.check(entry.provider);
      checks.push({
        name: `Provider '${entry.provider.id}' reachable`,
        ok: health.status !== "unavailable",
        detail: health.status,
      });
    } catch (error) {
      checks.push({
        name: `Provider '${entry.provider.id}' reachable`,
        ok: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  if (flagBool(flags, "json")) {
    emitJson(deps, { checks });
  } else {
    for (const check of checks) {
      deps.out(`${check.ok ? "ok  " : "FAIL"} ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
    }
  }
  return checks.every((check) => check.ok) ? 0 : 1;
}

function handleError(deps: RunDeps, error: unknown, flags: Flags): number {
  if (error instanceof OpenRatesError) {
    if (flagBool(flags, "json")) {
      emitJson(deps, { error: error.toJSON() });
    } else {
      deps.err(`Error [${error.code}]: ${error.message}`);
      if (error.suggestion !== undefined) {
        deps.err(`Hint: ${error.suggestion}`);
      }
    }
    return 1;
  }
  deps.err(error instanceof Error ? error.message : "Unexpected error.");
  return 1;
}

export async function run(argv: string[], deps: RunDeps): Promise<number> {
  const { positional, flags } = parseArgs(argv);
  const command = positional[0];
  const args = positional.slice(1);

  try {
    switch (command) {
      case "rate":
        return await cmdRate(deps, args, flags);
      case "convert":
        return await cmdConvert(deps, args, flags);
      case "series":
        return await cmdSeries(deps, args, flags);
      case "currencies":
        return cmdCurrencies(deps, flags);
      case "providers":
        return await cmdProviders(deps, flags);
      case "doctor":
        return await cmdDoctor(deps, flags);
      case undefined:
      case "help":
        deps.out(HELP);
        return 0;
      default:
        deps.err(`Unknown command: ${command}`);
        deps.err(HELP);
        return 1;
    }
  } catch (error) {
    return handleError(deps, error, flags);
  }
}
