import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  noExternal: [/^@openrates\//],
  clean: true,
  sourcemap: true,
  dts: false,
});
