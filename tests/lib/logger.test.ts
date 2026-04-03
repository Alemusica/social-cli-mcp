// tests/lib/logger.test.ts
import { describe, it, expect, vi } from "vitest";
import { createLogger } from "../../src/lib/logger.js";

describe("Logger", () => {
  it("writes structured JSON to stderr", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const logger = createLogger("test-module");

    logger.info("hello", { key: "value" });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("hello");
    expect(parsed.module).toBe("test-module");
    expect(parsed.key).toBe("value");
    expect(parsed.ts).toBeDefined();

    stderrSpy.mockRestore();
  });

  it("never writes to stdout", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const logger = createLogger("test");

    logger.info("test");
    logger.warn("test");
    logger.error("test");

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });
});
