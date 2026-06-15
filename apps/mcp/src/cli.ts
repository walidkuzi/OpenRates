import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "@openrates/schemas";
import { createMcpEngine } from "./engine";
import { createHttpServer } from "./http";
import { createMcpServer } from "./server";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = loadConfig();
  const engine = createMcpEngine(config);

  if (args.includes("--http")) {
    const httpServer = createHttpServer({ engine, config });
    httpServer.listen(config.port, config.host);
    process.stderr.write(
      `OpenRates MCP server listening on http://${config.host}:${config.port}/mcp\n`,
    );
    return;
  }

  const server = createMcpServer({ engine, config });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Failed to start OpenRates MCP server: ${String(error)}\n`);
  process.exitCode = 1;
});
