import { createLogger } from "@openrates/observability";
import { loadConfig } from "@openrates/schemas";
import { buildApp } from "./app";
import { createApiEngine } from "./engine";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel, name: "openrates-api" });
  const engine = createApiEngine(config);
  const app = await buildApp({ engine, config });
  await app.listen({ port: config.port, host: config.host });
  logger.info({ port: config.port, host: config.host }, "OpenRates API listening");
}

main().catch((error) => {
  const logger = createLogger({ level: "error", name: "openrates-api" });
  logger.error({ err: error }, "Failed to start OpenRates API");
  process.exitCode = 1;
});
