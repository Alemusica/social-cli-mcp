// src/server/tools/system.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCredentialsStatus } from "../../config/credentials.js";
import { getTenantConfig } from "../../config/tenant.js";
import { db } from "../../db/client.js";
import { sql } from "drizzle-orm";

export function registerSystemTools(server: McpServer) {
  server.tool(
    "system_status",
    {
      include_credentials: z.boolean().optional().default(false),
      include_db_stats: z.boolean().optional().default(false),
    },
    async ({ include_credentials, include_db_stats }) => {
      const parts: string[] = [];

      // Tenant info
      const tenantId = process.env.DEFAULT_TENANT || "flutur";
      const tenantConfig = await getTenantConfig(tenantId);
      parts.push(`Tenant: ${tenantConfig?.name ?? tenantId}`);
      parts.push(`Platforms: ${tenantConfig?.platforms?.join(", ") ?? "none"}`);

      // Credentials
      if (include_credentials) {
        const creds = await getCredentialsStatus();
        parts.push(`\nCredentials: ${creds.summary.configured}/${creds.summary.total} configured`);
        for (const [platform, status] of Object.entries(creds.platforms)) {
          const icon = status.configured ? "OK" : "MISSING";
          parts.push(`  ${platform}: ${icon}${status.missing.length ? ` (need: ${status.missing.join(", ")})` : ""}`);
        }
      }

      // DB stats
      if (include_db_stats) {
        const tables = ["venue", "email", "post", "outreach_reply", "gig"];
        parts.push("\nDB Stats:");
        for (const table of tables) {
          try {
            const result = await db.execute(sql.raw(`SELECT count(*) as c FROM ${table}`));
            parts.push(`  ${table}: ${result.rows[0]?.c ?? 0} records`);
          } catch {
            parts.push(`  ${table}: unavailable`);
          }
        }
      }

      return { content: [{ type: "text" as const, text: parts.join("\n") }] };
    },
  );

  server.tool(
    "test_connections",
    {},
    async () => {
      const results: string[] = [];

      // Test DB
      try {
        await db.execute(sql`SELECT 1`);
        results.push("PostgreSQL: OK");
      } catch (e) {
        results.push(`PostgreSQL: FAIL (${e})`);
      }

      return { content: [{ type: "text" as const, text: results.join("\n") }] };
    },
  );

  server.tool(
    "preflight_check",
    {
      email: z.string().email(),
      action: z.enum(["initial", "followup", "reply"]),
      venue: z.string().optional(),
    },
    async ({ email: emailAddr, action }) => {
      const { wasEmailEverSent, isDailyLimitReached } = await import("../../lib/email-guard.js");
      const tenantId = process.env.DEFAULT_TENANT || "flutur";

      const checks: string[] = [];
      const dailyLimit = await isDailyLimitReached(tenantId);
      checks.push(`Daily limit: ${dailyLimit ? "REACHED" : "OK"}`);

      if (action === "initial") {
        const sent = await wasEmailEverSent(emailAddr, tenantId);
        checks.push(`Already contacted: ${sent ? "YES - BLOCKED" : "NO - OK"}`);
      }

      const blocked = dailyLimit || (action === "initial" && await wasEmailEverSent(emailAddr, tenantId));
      checks.push(`\nVerdict: ${blocked ? "BLOCKED" : "CLEAR TO SEND"}`);

      return { content: [{ type: "text" as const, text: checks.join("\n") }] };
    },
  );
}
