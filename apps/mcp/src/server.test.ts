import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { FetchLike, HttpResponse } from "@openrates/provider-interface";
import { loadConfig } from "@openrates/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMcpEngine } from "./engine";
import { createMcpServer } from "./server";

function json(body: unknown, status = 200): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function fakeFetch(): FetchLike {
  const rates: Record<string, number> = { "USD:EUR": 0.865421, "EUR:SAR": 4.05 };
  return async (url) => {
    const parsed = new URL(url);
    const base = (parsed.searchParams.get("base") ?? "").toUpperCase();
    const quote = (parsed.searchParams.get("symbols") ?? "").toUpperCase();
    const path = parsed.pathname.replace("/v1/", "");
    if (path === "currencies") {
      return json({ USD: "United States Dollar", EUR: "Euro" });
    }
    if (path === "latest") {
      const rate = rates[`${base}:${quote}`];
      if (rate === undefined) {
        return json({ message: "not found" }, 404);
      }
      return json({ amount: 1, base, date: "2026-06-12", rates: { [quote]: rate } });
    }
    return json({ message: "not found" }, 404);
  };
}

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> }).content;
  const first = content?.[0];
  if (!first || first.text === undefined) {
    throw new Error("expected text content");
  }
  return first.text;
}

describe("MCP server", () => {
  let client: Client;

  beforeAll(async () => {
    const config = loadConfig({});
    const engine = createMcpEngine(config, { fetch: fakeFetch() });
    const server = createMcpServer({ engine, config });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "1.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  it("exposes exactly the six core tools with descriptions", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "compare_exchange_rate_providers",
      "convert_currency",
      "explain_exchange_rate",
      "get_exchange_rate",
      "get_exchange_rate_series",
      "list_currencies",
    ]);
    for (const tool of tools) {
      expect((tool.description ?? "").length).toBeGreaterThan(20);
    }
  });

  it("converts a currency amount", async () => {
    const result = await client.callTool({
      name: "convert_currency",
      arguments: { amount: "1000.00", from: "USD", to: "EUR" },
    });
    const data = JSON.parse(textOf(result));
    expect(data.convertedAmount).toBe("865.42");
    expect(data.rateType).toBe("official_reference");
    expect(data.isLive).toBe(false);
  });

  it("returns a rate with provider attribution", async () => {
    const result = await client.callTool({
      name: "get_exchange_rate",
      arguments: { base: "USD", quote: "EUR" },
    });
    expect(JSON.parse(textOf(result)).provider).toBe("frankfurter");
  });

  it("resolves an ambiguous currency name", async () => {
    const result = await client.callTool({
      name: "list_currencies",
      arguments: { query: "dollar" },
    });
    expect(JSON.parse(textOf(result)).ambiguous.candidates).toContain("USD");
  });

  it("explains a concept without a provider call", async () => {
    const result = await client.callTool({
      name: "explain_exchange_rate",
      arguments: { topic: "freshness" },
    });
    expect(JSON.parse(textOf(result)).explanation.toLowerCase()).toContain("live");
  });

  it("compares providers", async () => {
    const result = await client.callTool({
      name: "compare_exchange_rate_providers",
      arguments: { base: "USD", quote: "EUR" },
    });
    const data = JSON.parse(textOf(result));
    expect(data.providers[0].provider).toBe("frankfurter");
    expect(data.disagreement).toBe(false);
  });

  it("returns a structured error for ambiguous conversion input", async () => {
    const result = await client.callTool({
      name: "convert_currency",
      arguments: { amount: "100", from: "dollar", to: "EUR" },
    });
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(JSON.parse(textOf(result)).error.code).toBe("AMBIGUOUS_CURRENCY");
  });

  it("lists and reads resources", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((resource) => resource.uri);
    expect(uris).toContain("openrates://docs/quickstart");
    expect(uris).toContain("openrates://currencies");
    expect(uris).toContain("openrates://capabilities");

    const read = await client.readResource({ uri: "openrates://currencies" });
    const first = read.contents[0] as { text?: string };
    expect(JSON.parse(first.text ?? "{}").currencies.length).toBeGreaterThan(0);
  });
});
