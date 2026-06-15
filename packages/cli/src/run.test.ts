import type { FetchLike, HttpResponse } from "@openrates/provider-interface";
import { loadConfig } from "@openrates/schemas";
import { describe, expect, it } from "vitest";
import { createCliEngine } from "./engine";
import { type RunDeps, run } from "./run";

function json(body: unknown, status = 200): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function fakeFetch(): FetchLike {
  return async (url) => {
    const parsed = new URL(url);
    const base = (parsed.searchParams.get("base") ?? "").toUpperCase();
    const quote = (parsed.searchParams.get("symbols") ?? "").toUpperCase();
    const path = parsed.pathname.replace("/v1/", "");
    if (path === "currencies") {
      return json({ USD: "United States Dollar", EUR: "Euro" });
    }
    if (path.includes("..")) {
      return json({
        amount: 1,
        base,
        start_date: "2026-06-10",
        end_date: "2026-06-12",
        rates: { "2026-06-10": { [quote]: 0.864 }, "2026-06-12": { [quote]: 0.865421 } },
      });
    }
    if (path === "latest" && base === "USD" && quote === "EUR") {
      return json({ amount: 1, base, date: "2026-06-12", rates: { EUR: 0.865421 } });
    }
    return json({ message: "not found" }, 404);
  };
}

function harness(): { out: string[]; err: string[]; deps: RunDeps } {
  const out: string[] = [];
  const err: string[] = [];
  const config = loadConfig({});
  const engine = createCliEngine(config, fakeFetch());
  const deps: RunDeps = {
    engine,
    config,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  return { out, err, deps };
}

describe("CLI run", () => {
  it("prints a rate", async () => {
    const { out, deps } = harness();
    const code = await run(["rate", "USD", "EUR"], deps);
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("USD = ");
    expect(out.join("\n")).toContain("official_reference");
  });

  it("converts an amount", async () => {
    const { out, deps } = harness();
    const code = await run(["convert", "1000", "USD", "EUR"], deps);
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("865.42");
  });

  it("emits JSON with --json", async () => {
    const { out, deps } = harness();
    await run(["convert", "1000", "USD", "EUR", "--json"], deps);
    const data = JSON.parse(out.join("\n"));
    expect(data.convertedAmount).toBe("865.42");
  });

  it("prints a series", async () => {
    const { out, deps } = harness();
    const code = await run(
      ["series", "USD", "EUR", "--from", "2026-06-10", "--to", "2026-06-12"],
      deps,
    );
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("2026-06-10");
  });

  it("searches currencies", async () => {
    const { out, deps } = harness();
    await run(["currencies", "--search", "riyal"], deps);
    expect(out.join("\n")).toContain("SAR");
  });

  it("lists providers", async () => {
    const { out, deps } = harness();
    await run(["providers"], deps);
    expect(out.join("\n")).toContain("frankfurter");
  });

  it("runs doctor and reports the provider reachable", async () => {
    const { out, deps } = harness();
    const code = await run(["doctor"], deps);
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("reachable");
  });

  it("reports doctor results as JSON", async () => {
    const { out, deps } = harness();
    await run(["doctor", "--json"], deps);
    expect(Array.isArray(JSON.parse(out.join("\n")).checks)).toBe(true);
  });

  it("returns a non-zero exit code on an unsupported currency", async () => {
    const { err, deps } = harness();
    const code = await run(["rate", "USD", "ZZZ"], deps);
    expect(code).toBe(1);
    expect(err.join("\n")).toContain("UNSUPPORTED_CURRENCY");
  });

  it("shows usage on missing arguments", async () => {
    const { err, deps } = harness();
    const code = await run(["rate", "USD"], deps);
    expect(code).toBe(1);
    expect(err.join("\n")).toContain("Usage");
  });

  it("prints help with no command", async () => {
    const { out, deps } = harness();
    const code = await run([], deps);
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("OpenRates CLI");
  });
});
