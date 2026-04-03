// src/server/tools/intelligence.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  routeEvent,
  formatBriefingForConsole,
} from "../../services/outreach/intelligence.js";
import { conversationStore } from "../../services/outreach/conversation.js";
import { loadSessionContext } from "../../services/memory/session-log.js";
import { scanOutreachReplies } from "../../services/platform/gmail.js";
import { db } from "../../db/client.js";
import { sql } from "drizzle-orm";

export function registerIntelligenceTools(server: McpServer) {
  const tenantId = process.env.DEFAULT_TENANT || "flutur";

  // ── Intelligence Briefing ─────────────────────────────────

  server.tool(
    "intelligence_briefing",
    {
      event_type: z
        .enum([
          "morning_check",
          "session_start",
          "reply_received",
          "email_sent",
          "gig_confirmed",
        ])
        .default("session_start"),
      venue: z.string().optional(),
      venue_email: z.string().optional(),
      country: z.string().optional(),
      reply_type: z
        .enum(["human_reply", "auto_reply", "bounce"])
        .optional(),
      reply_preview: z.string().optional(),
    },
    async ({
      event_type,
      venue,
      venue_email,
      country,
      reply_type,
      reply_preview,
    }) => {
      const briefing = await routeEvent(
        {
          type: event_type,
          venue,
          venueEmail: venue_email,
          country,
          replyType: reply_type,
          replyPreview: reply_preview,
        },
        tenantId,
      );

      const formatted = formatBriefingForConsole(briefing);
      return {
        content: [{ type: "text" as const, text: formatted }],
      };
    },
  );

  // ── Inbox Scan ────────────────────────────────────────────

  server.tool(
    "inbox_scan",
    {
      days: z.number().optional().default(7).describe("How many days back to scan"),
      domain_to_venue: z
        .record(z.string(), z.string())
        .optional()
        .default({})
        .describe("Map of email domain to venue name, e.g. {villaportarelais.com: 'Villa Porta'}"),
    },
    async ({ days, domain_to_venue }) => {
      try {
        const inboxResult = await scanOutreachReplies(domain_to_venue, days);

        const messages = inboxResult.messages.map((msg) => ({
          messageId: msg.messageId,
          from: msg.from,
          fromEmail: msg.fromEmail,
          subject: msg.subject,
          date: msg.date,
          snippet: msg.snippet,
          threadId: msg.threadId,
        }));

        const summary = {
          totalCount: inboxResult.totalCount,
          found: messages.length,
          days,
          errors: inboxResult.errors,
          messages,
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Inbox scan failed: ${err.message}. Check Gmail credentials.`,
            },
          ],
        };
      }
    },
  );

  // ── Flutur Dashboard ──────────────────────────────────────

  server.tool(
    "flutur_dashboard",
    {
      include_memory: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include recent session memory"),
      include_conversations: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include conversation dashboard"),
    },
    async ({ include_memory, include_conversations }) => {
      const parts: Record<string, any> = {};

      // System status counts
      try {
        const tables = ["venue", "email", "outreach_reply", "gig", "post"];
        const counts: Record<string, number> = {};
        for (const table of tables) {
          try {
            const r = await db.execute(
              sql.raw(`SELECT count(*) as c FROM "${table}" WHERE tenant_id = 'flutur'`),
            );
            counts[table] = Number((r.rows[0] as any)?.c ?? 0);
          } catch {
            counts[table] = -1;
          }
        }
        parts.dbCounts = counts;
      } catch {
        parts.dbCounts = null;
      }

      // Memory context
      if (include_memory) {
        try {
          const ctx = await loadSessionContext(tenantId, 3);
          parts.memory = {
            recentSessions: ctx.recentSessions.map((s: any) => ({
              title: s.title,
              trigger: s.trigger,
              createdAt: s.createdAt,
              actions: s.actions?.slice(0, 3),
              nextSteps: s.nextSteps?.slice(0, 2),
            })),
            activeDecisions: ctx.activeDecisions.slice(0, 10).map((d: any) => ({
              content: d.content,
              toEntity: d.toEntity,
              createdAt: d.createdAt,
            })),
            convergencePoints: ctx.convergencePoints.slice(0, 5),
          };
        } catch {
          parts.memory = null;
        }
      }

      // Conversation dashboard
      if (include_conversations) {
        try {
          const dashboard = await conversationStore.dashboard(tenantId);
          parts.outreach = {
            totalVenues: dashboard.totalVenues,
            byStatus: dashboard.byStatus,
            actionNeeded: dashboard.actionNeeded.slice(0, 5).map((c) => ({
              venue: c.venue,
              status: c.status,
              daysSince: c.daysSinceLastActivity,
              followUps: c.followUpsSent,
            })),
          };
        } catch {
          parts.outreach = null;
        }
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(parts, null, 2) }],
      };
    },
  );

  // ── SurrealQL Proxy (Postgres-backed SELECT only) ─────────

  server.tool(
    "surql_query",
    {
      query: z
        .string()
        .describe("SQL SELECT query to execute against Postgres (SurrealQL migrated to SQL)"),
    },
    async ({ query }) => {
      // Safety: only allow SELECT / WITH statements
      const trimmed = query.trim().toUpperCase();
      if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("WITH")) {
        return {
          content: [
            {
              type: "text" as const,
              text: "BLOCKED: surql_query only allows SELECT/WITH queries for safety.",
            },
          ],
        };
      }

      try {
        const result = await db.execute(sql.raw(query));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { rows: result.rows, rowCount: result.rowCount },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Query failed: ${err.message}`,
            },
          ],
        };
      }
    },
  );
}
