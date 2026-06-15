import { loadConfig } from "@openrates/schemas";
import { createCliEngine } from "./engine";
import { run } from "./run";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv[0] === "mcp") {
    const { createMcpEngine, runStdio } = await import("@openrates/mcp");
    const config = loadConfig();
    await runStdio({ engine: createMcpEngine(config), config });
    return;
  }

  const config = loadConfig();
  const engine = createCliEngine(config);
  const code = await run(argv, {
    engine,
    config,
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
  process.exitCode = code;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
