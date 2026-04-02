// src/server/tools/content.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { contentDrafter } from "../../services/content/drafter.js";
import { createEditorialPlanner } from "../../services/content/editorial-planner.js";
import { storyStore } from "../../services/memory/story-store.js";
import { db } from "../../db/client.js";
import { content, postDraft, contentTask } from "../../db/schema.js";
import { eq, and, desc, ilike } from "drizzle-orm";

export function registerContentTools(server: McpServer) {
  const tenantId = process.env.DEFAULT_TENANT || "flutur";

  // ── Editorial Plan ────────────────────────────────────────

  server.tool(
    "get_editorial_plan",
    {
      view: z
        .enum(["today", "week"])
        .optional()
        .default("today")
        .describe("Today's plan or full week overview"),
    },
    async ({ view }) => {
      const planner = createEditorialPlanner(tenantId);

      let result;
      if (view === "week") {
        result = await planner.getWeekOverview();
      } else {
        result = await planner.getTodayPlan();
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "get_post_drafts",
    {
      platform: z
        .enum(["twitter", "instagram", "youtube", "tiktok", "facebook"])
        .optional()
        .describe("Filter by platform"),
      status: z
        .enum(["draft", "ready", "scheduled", "published", "cancelled"])
        .optional()
        .describe("Filter by status"),
      limit: z.number().optional().default(20),
    },
    async ({ platform, status, limit }) => {
      let query = db
        .select()
        .from(postDraft)
        .where(eq(postDraft.tenantId, tenantId))
        .orderBy(desc(postDraft.createdAt))
        .limit(limit);

      // Apply filters by re-building — Drizzle requires AND chaining
      const conditions: any[] = [eq(postDraft.tenantId, tenantId)];
      if (platform) conditions.push(eq(postDraft.platform, platform));
      if (status) conditions.push(eq(postDraft.status, status));

      const rows = await db
        .select()
        .from(postDraft)
        .where(and(...conditions))
        .orderBy(desc(postDraft.createdAt))
        .limit(limit);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    },
  );

  server.tool(
    "content_tasks",
    {
      status: z
        .enum(["pending", "in_progress", "done", "cancelled"])
        .optional()
        .describe("Filter by status"),
      limit: z.number().optional().default(20),
    },
    async ({ status, limit }) => {
      const conditions: any[] = [eq(contentTask.tenantId, tenantId)];
      if (status) conditions.push(eq(contentTask.status, status));

      const rows = await db
        .select()
        .from(contentTask)
        .where(and(...conditions))
        .orderBy(desc(contentTask.createdAt))
        .limit(limit);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    },
  );

  server.tool(
    "weekly_content_plan",
    {},
    async () => {
      const planner = createEditorialPlanner(tenantId);
      const week = await planner.getWeekOverview();
      const next = await planner.getNextPost();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ week, nextPost: next }, null, 2),
          },
        ],
      };
    },
  );

  // ── Story Store ───────────────────────────────────────────

  server.tool(
    "story_search",
    {
      theme: z
        .enum([
          "origin",
          "transformation",
          "credential",
          "struggle",
          "discovery",
          "craft",
          "connection",
          "philosophy",
        ])
        .optional()
        .describe("Filter by theme"),
      channel: z
        .string()
        .optional()
        .describe("Filter by channel suitability (instagram, book, website, interview)"),
      unpublished_only: z.boolean().optional().default(false),
    },
    async ({ theme, channel, unpublished_only }) => {
      let fragments;

      if (theme) {
        fragments = await storyStore.byTheme(tenantId, theme);
      } else if (channel) {
        fragments = await storyStore.forChannel(tenantId, channel);
      } else if (unpublished_only) {
        fragments = await storyStore.unpublished(tenantId);
      } else {
        fragments = await storyStore.all(tenantId);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(fragments, null, 2) }],
      };
    },
  );

  // ── Brand Review ──────────────────────────────────────────

  server.tool(
    "brand_review",
    {
      text: z.string().describe("Text to review against brand constraints"),
    },
    async ({ text }) => {
      // Brand review: check σ₂ hard rules from CLAUDE.md
      const issues: { check: string; found: string; rule: string }[] = [];
      const suggestions: string[] = [];

      const hardRules: Array<{ pattern: RegExp; check: string; rule: string }> = [
        {
          pattern: /one.?man.?band/i,
          check: "format_language",
          rule: "Use 'self-contained' or 'one-person show', never 'one-man band'",
        },
        {
          pattern: /solo.?artist/i,
          check: "format_language",
          rule: "Use 'self-contained performer', never 'solo artist'",
        },
        {
          pattern: /dj.?hybrid|hybrid.?dj/i,
          check: "positioning",
          rule: "FLUTUR is a PERFORMER, not a DJ hybrid",
        },
        {
          pattern: /can only do|i can only/i,
          check: "duration_framing",
          rule: "Never apologize for duration. 'My set IS 2 hours' — not 'I can only do'",
        },
        {
          pattern: /sarò in .+/i,
          check: "availability_language",
          rule: "Never 'Sarò in [luogo]'. Use 'Disponibile per booking 2026'",
        },
        {
          pattern: /sound healer|certified.*sound/i,
          check: "credentials",
          rule: "NOT certified sound healer. Self-taught, 4y luxury hotels only",
        },
      ];

      for (const rule of hardRules) {
        const match = text.match(rule.pattern);
        if (match) {
          issues.push({ check: rule.check, found: match[0], rule: rule.rule });
        }
      }

      // GGT link check
      if (/greece.*got.*talent/i.test(text) && /http|youtube|youtu\.be/i.test(text)) {
        issues.push({
          check: "ggt_video",
          found: "GGT link",
          rule: "σ₂ NEVER link GGT as video. Text mention only: 'Greece's Got Talent — 4 YES'",
        });
      }

      if (issues.length === 0) {
        suggestions.push("Brand check PASS — no σ₂ violations found.");
      }

      const result = { pass: issues.length === 0, issues, suggestions };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── Photo Library ─────────────────────────────────────────

  server.tool(
    "list_photos",
    {
      category: z.string().optional().describe("Filter by category (busking, sunset, etc.)"),
      type: z.enum(["photo", "video", "audio"]).optional().default("photo"),
      unused_only: z.boolean().optional().default(false),
      limit: z.number().optional().default(20),
    },
    async ({ category, type, unused_only, limit }) => {
      const conditions: any[] = [
        eq(content.tenantId, tenantId),
        eq(content.type, type),
      ];

      if (category) conditions.push(eq(content.category, category));
      if (unused_only) conditions.push(eq(content.usedCount, 0));

      const rows = await db
        .select()
        .from(content)
        .where(and(...conditions))
        .orderBy(desc(content.createdAt))
        .limit(limit);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
      };
    },
  );

  server.tool(
    "get_post_photos",
    {
      content_id: z.string().optional().describe("Specific content ID"),
      platform: z
        .enum(["instagram", "twitter", "youtube"])
        .optional()
        .default("instagram"),
      limit: z.number().optional().default(5),
    },
    async ({ content_id, platform, limit }) => {
      if (content_id) {
        const session = await contentDrafter.startSession(tenantId, content_id, platform);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }],
        };
      }

      const ready = await contentDrafter.getReady(tenantId, limit);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(ready, null, 2) }],
      };
    },
  );
}
