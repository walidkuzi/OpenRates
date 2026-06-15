import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { FetchLike, HttpResponse } from "@openrates/provider-interface";
import { loadConfig } from "@openrates/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMcpEngine } from "./engine";
import { createHttpServer } from "./http";

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
    if (path === "latest" && base === "USD" && quote === "EUR") {
      return json({ amount: 1, base, date: "2026-06-12", rates: { EUR: 0.865421 } });
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

describe("MCP streamable HTTP transport", () => {
  let server: Server;
  let client: Client;

  beforeAll(async () => {
    const config = loadConfig({});
    const engine = createMcpEngine(config, { fetch: fakeFetch() });
    server = createHttpServer({ engine, config });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const port = (server.address() as AddressInfo).port;
    client = new Client({ name: "remote-test", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)),
    );
  });

  afterAll(async () => {
    await client.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("connects and discovers tools remotely", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toContain("convert_currency");
  });

  it("calls a tool remotely", async () => {
    const result = await client.callTool({
      name: "get_exchange_rate",
      arguments: { base: "USD", quote: "EUR" },
    });
    expect(JSON.parse(textOf(result)).rateType).toBe("official_reference");
  });
});
