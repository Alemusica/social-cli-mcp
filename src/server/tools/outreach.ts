// src/server/tools/outreach.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { conversationStore } from "../../services/outreach/conversation.js";
import {
  runPipeline,
  getBatchPreview,
  approveBatch,
  sendApprovedBatch,
  getBatchStatus,
  getDailyLimits,
  getOrchestrationStats,
} from "../../services/outreach/pipeline.js";
import { generateOutreachPlan } from "../../services/outreach/scheduler.js";

export function registerOutreachTools(server: McpServer) {
  const tenantId = process.env.DEFAULT_TENANT || "flutur";

  // ── Plan ──────────────────────────────────────────────────

  server.tool(
    "outreach_plan",
    {
      proposals: z
        .array(
          z.object({
            country: z.string(),
            window: z.object({
              startDate: z.string().describe("YYYY-MM-DD"),
              endDate: z.string().describe("YYYY-MM-DD"),
            }),
            feasibility: z.enum(["high", "medium", "low"]),
          }),
        )
        .describe("Tour proposals from calendar planner"),
    },
    async ({ proposals }) => {
      const plan = await generateOutreachPlan(proposals, tenantId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(plan, null, 2) }],
      };
    },
  );

  // ── Pipeline ──────────────────────────────────────────────

  server.tool(
    "outreach_pipeline_run",
    {
      input_file: z.string().describe("Path to venue JSON file"),
      max_batch_size: z.number().optional().default(20),
      skip_audit: z.boolean().optional().default(false),
    },
    async ({ input_file, max_batch_size, skip_audit }) => {
      const batch = await runPipeline(input_file, tenantId, {
        maxBatchSize: max_batch_size,
        skipAudit: skip_audit,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(batch, null, 2) }],
      };
    },
  );

  server.tool(
    "outreach_pipeline_preview",
    {
      batch_id: z.string().describe("Batch ID from outreach_pipeline_run"),
    },
    async ({ batch_id }) => {
      const preview = await getBatchPreview(batch_id, tenantId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(preview, null, 2) }],
      };
    },
  );

  server.tool(
    "outreach_pipeline_stats",
    {
      batch_id: z.string().optional().describe("Specific batch ID, or omit for recent list"),
    },
    async ({ batch_id }) => {
      const result = await getBatchStatus(tenantId, batch_id);
      const limits = await getDailyLimits(tenantId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ batches: result, dailyLimits: limits }, null, 2),
          },
        ],
      };
    },
  );

  // ── Conversation Dashboard ────────────────────────────────

  server.tool(
    "outreach_conversation_dashboard",
    {
      venue: z.string().optional().describe("Venue name for single conversation view"),
    },
    async ({ venue }) => {
      if (venue) {
        const conv = await conversationStore.get(venue, tenantId);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(conv, null, 2) }],
        };
      }

      const dashboard = await conversationStore.dashboard(tenantId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(dashboard, null, 2) }],
      };
    },
  );

  // ── Batch Approve + Send ──────────────────────────────────

  server.tool(
    "outreach_batch_approve",
    {
      batch_id: z.string().describe("Batch ID to approve and send"),
      confirm: z
        .boolean()
        .describe("Must be true to proceed — safety gate (σ₂: never send without explicit approval)"),
    },
    async ({ batch_id, confirm }) => {
      if (!confirm) {
        return {
          content: [
            {
              type: "text" as const,
              text: "BLOCKED: confirm=false. Set confirm=true to approve and send.",
            },
          ],
        };
      }

      // Approve
      const approved = await approveBatch(batch_id, tenantId);

      // Send
      const sent = await sendApprovedBatch(batch_id, tenantId);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(sent, null, 2) }],
      };
    },
  );
}
