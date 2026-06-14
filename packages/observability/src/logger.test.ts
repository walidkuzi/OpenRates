import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";

function captureLogs() {
  const lines: string[] = [];
  const stream = {
    write(chunk: string) {
      lines.push(chunk);
    },
  };
  return { lines, stream };
}

describe("createLogger redaction", () => {
  it("redacts known secret fields at the top level", () => {
    const { lines, stream } = captureLogs();
    const logger = createLogger({ level: "info" }, stream);
    logger.info({ apiKey: "super-secret", user: "alice" }, "request");
    const entry = JSON.parse(lines[0] ?? "{}");
    expect(entry.apiKey).toBe("[redacted]");
    expect(entry.user).toBe("alice");
    expect(entry.msg).toBe("request");
  });

  it("redacts nested authorization headers", () => {
    const { lines, stream } = captureLogs();
    const logger = createLogger({ level: "info" }, stream);
    logger.info({ headers: { authorization: "Bearer token" } }, "incoming");
    const entry = JSON.parse(lines[0] ?? "{}");
    expect(entry.headers.authorization).toBe("[redacted]");
  });

  it("respects the configured level", () => {
    const { lines, stream } = captureLogs();
    const logger = createLogger({ level: "warn" }, stream);
    logger.info({}, "below threshold");
    logger.warn({}, "at threshold");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0] ?? "{}");
    expect(entry.msg).toBe("at threshold");
  });
});
