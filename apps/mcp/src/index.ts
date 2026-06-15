import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { type McpServerDeps, createMcpServer } from "./server";

export { createMcpServer, type McpServerDeps } from "./server";
export { createMcpEngine, type McpEngineOptions } from "./engine";
export { createHttpServer } from "./http";
export { SERVER_INSTRUCTIONS } from "./instructions";

export async function runStdio(deps: McpServerDeps): Promise<void> {
  const server = createMcpServer(deps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
