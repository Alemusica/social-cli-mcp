// src/server/tools/analytics.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { instagramAnalytics } from "../../services/analytics/instagram.js";
import { youtubeAnalytics } from "../../services/analytics/youtube.js";
import { correlator } from "../../services/analytics/correlator.js";
import { InstagramClient } from "../../services/platform/instagram.js";

/** Build InstagramClient from env vars (loaded by loadCredentialsToEnv at startup). */
function buildInstagramClient(): InstagramClient {
  const e = process.env;
  if (e.INSTAGRAM_ACCESS_TOKEN && e.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
    return new InstagramClient({
      accessToken: e.INSTAGRAM_ACCESS_TOKEN,
      businessAccountId: e.INSTAGRAM_BUSINESS_ACCOUNT_ID,
      facebookPageId: e.FACEBOOK_PAGE_ID || "",
    });
  }
  return new InstagramClient();
}

export function registerAnalyticsTools(server: McpServer) {
  const tenantId = process.env.DEFAULT_TENANT || "flutur";

  // ── Instagram Insights ────────────────────────────────────

  server.tool(
    "instagram_account_insights",
    {
      period: z
        .enum(["day", "week", "days_28"])
        .optional()
        .default("days_28")
        .describe("Insights period"),
      save_snapshot: z.boolean().optional().default(true),
    },
    async ({ period, save_snapshot }) => {
      const client = buildInstagramClient();
      const insights = await client.getAccountInsights(period);

      if (save_snapshot && insights) {
        await instagramAnalytics.saveSnapshot(tenantId, {
          followers: insights.followerCount ?? 0,
          reach: insights.reach,
        });
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(insights, null, 2) }],
      };
    },
  );

  server.tool(
    "instagram_media_insights",
    {
      media_id: z.string().describe("Instagram media ID"),
    },
    async ({ media_id }) => {
      const client = buildInstagramClient();
      const insights = await client.getMediaInsights(media_id);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(insights, null, 2) }],
      };
    },
  );

  server.tool(
    "instagram_recent_posts",
    {
      limit: z.number().optional().default(10).describe("Number of recent posts"),
    },
    async ({ limit }) => {
      const client = buildInstagramClient();
      const posts = await client.getRecentMediaInsights(limit);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(posts, null, 2) }],
      };
    },
  );

  server.tool(
    "instagram_audience",
    {
      days: z.number().optional().default(30).describe("History period in days"),
    },
    async ({ days }) => {
      const evolution = await instagramAnalytics.getEvolution(tenantId, days);
      const corridor = await instagramAnalytics.getCorridorAnalysis(tenantId);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ evolution, corridor }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "instagram_best_times",
    {},
    async () => {
      const client = buildInstagramClient();
      const times = await client.getBestPostingTimes();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(times, null, 2) }],
      };
    },
  );

  // ── YouTube Analytics ─────────────────────────────────────

  server.tool(
    "youtube_analytics",
    {
      limit: z.number().optional().default(5).describe("Subscriber history entries to return"),
    },
    async ({ limit }) => {
      const latest = await youtubeAnalytics.getLatestSnapshot(tenantId);
      const history = await youtubeAnalytics.getSubscriberHistory(tenantId, limit);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ latest, subscriberHistory: history }, null, 2),
          },
        ],
      };
    },
  );

  // ── Cross-platform Correlation ────────────────────────────

  server.tool(
    "correlate_signals",
    {
      days: z.number().optional().default(14).describe("Days to look back for correlations"),
    },
    async ({ days }) => {
      const events = await correlator.runCorrelationDetection(tenantId, days);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(events, null, 2) }],
      };
    },
  );

  server.tool(
    "run_analysis",
    {
      date: z.string().optional().describe("YYYY-MM-DD date for daily digest (defaults to today)"),
    },
    async ({ date }) => {
      const targetDate = date || new Date().toISOString().split("T")[0];
      const digest = await correlator.buildDailyDigest(tenantId, targetDate);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(digest, null, 2) }],
      };
    },
  );

  server.tool(
    "get_data_freshness",
    {},
    async () => {
      const igLatest = await instagramAnalytics.getLatest(tenantId);
      const ytLatest = await youtubeAnalytics.getLatestSnapshot(tenantId);
      const needsFresh = await instagramAnalytics.needsFresh(tenantId);

      const result = {
        instagram: {
          latestSnapshot: igLatest?.createdAt || null,
          needsRefresh: needsFresh,
        },
        youtube: {
          latestSnapshot: ytLatest?.createdAt || null,
        },
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "get_hashtag_analysis",
    {
      hashtag: z.string().describe("Hashtag to analyze (without #)"),
    },
    async ({ hashtag }) => {
      const client = buildInstagramClient();
      const analysis = await client.analyzeHashtag(hashtag);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(analysis, null, 2) }],
      };
    },
  );

  server.tool(
    "get_audience_snapshot",
    {},
    async () => {
      const latest = await instagramAnalytics.getLatest(tenantId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(latest, null, 2) }],
      };
    },
  );
}
