import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  noExternal: [/^@openrates\//],
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  sourcemap: true,
  dts: false,
});
