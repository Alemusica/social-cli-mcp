// tests/server/tools/system.test.ts
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSystemTools } from "../../../src/server/tools/system.js";

describe("System Tools Registration", () => {
  it("registers tools without error", () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    expect(() => registerSystemTools(server)).not.toThrow();
  });
});
