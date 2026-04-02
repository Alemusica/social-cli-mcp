// src/server/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadCredentialsToEnv } from "../config/credentials.js";
import { createLogger } from "../lib/logger.js";

import { registerSystemTools } from "./tools/system.js";
import { registerPostingTools } from "./tools/posting.js";
import { registerOutreachTools } from "./tools/outreach.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerContentTools } from "./tools/content.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerIntelligenceTools } from "./tools/intelligence.js";

const log = createLogger("mcp-server");

async function main() {
  // Load credentials
  loadCredentialsToEnv();

  const server = new McpServer({
    name: "flutur-ops",
    version: "2.0.0",
  });

  // Register tools
  registerSystemTools(server);
  registerPostingTools(server);
  registerOutreachTools(server);
  registerAnalyticsTools(server);
  registerContentTools(server);
  registerCalendarTools(server);
  registerIntelligenceTools(server);

  // Transport selection
  if (process.env.MCP_TRANSPORT === "http") {
    log.info("Starting Streamable HTTP transport on port 3000");
    // HTTP transport will be added in a future task
    throw new Error("HTTP transport not yet implemented");
  } else {
    log.info("Starting stdio transport");
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((e) => {
  const log = createLogger("mcp-server");
  log.error("Fatal error", { error: String(e) });
  process.exit(1);
});
