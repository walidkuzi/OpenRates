import { randomUUID } from "node:crypto";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { type McpServerDeps, createMcpServer } from "./server";

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function rpcError(message: string): unknown {
  return { jsonrpc: "2.0", error: { code: -32000, message }, id: null };
}

async function handle(
  deps: McpServerDeps,
  sessions: Map<string, Session>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const url = request.url ?? "/";
    if (url === "/health" || url.startsWith("/health?")) {
      sendJson(response, 200, { status: "ok" });
      return;
    }
    if (!(url === "/mcp" || url.startsWith("/mcp?"))) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    const sessionId = headerValue(request.headers["mcp-session-id"]);
    if (sessionId !== undefined) {
      const session = sessions.get(sessionId);
      if (!session) {
        sendJson(response, 404, rpcError("Unknown session."));
        return;
      }
      const body = request.method === "POST" ? await readJsonBody(request) : undefined;
      await session.transport.handleRequest(request, response, body);
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 400, rpcError("Missing session id."));
      return;
    }

    const body = await readJsonBody(request);
    if (!isInitializeRequest(body)) {
      sendJson(response, 400, rpcError("No valid session; send an initialize request first."));
      return;
    }

    const server = createMcpServer(deps);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { server, transport });
      },
    });
    transport.onclose = () => {
      if (transport.sessionId !== undefined) {
        sessions.delete(transport.sessionId);
      }
      void server.close();
    };
    await server.connect(transport);
    await transport.handleRequest(request, response, body);
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 500, rpcError(error instanceof Error ? error.message : "Internal error."));
    }
  }
}

export function createHttpServer(deps: McpServerDeps): Server {
  const sessions = new Map<string, Session>();
  return createServer((request, response) => {
    void handle(deps, sessions, request, response);
  });
}
