// src/server/tools/posting.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TwitterClient } from "../../services/platform/twitter.js";
import { InstagramClient } from "../../services/platform/instagram.js";

/** Build TwitterClient from env vars (loaded by loadCredentialsToEnv at startup). */
function buildTwitterClient(): TwitterClient {
  const e = process.env;
  if (e.TWITTER_API_KEY && e.TWITTER_API_SECRET && e.TWITTER_ACCESS_TOKEN && e.TWITTER_ACCESS_SECRET) {
    return new TwitterClient({
      apiKey: e.TWITTER_API_KEY,
      apiSecret: e.TWITTER_API_SECRET,
      accessToken: e.TWITTER_ACCESS_TOKEN,
      accessSecret: e.TWITTER_ACCESS_SECRET,
    });
  }
  return new TwitterClient();
}

/** Build InstagramClient from env vars. */
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

export function registerPostingTools(server: McpServer) {
  // ── Twitter ───────────────────────────────────────────────

  server.tool(
    "post_twitter",
    {
      text: z.string().describe("Tweet text (no link in body — add as reply)"),
      hashtags: z.array(z.string()).optional().describe("Hashtags to append"),
      link: z.string().optional().describe("Link to append (goes at end)"),
      topic: z.string().optional().describe("Topic for duplicate check"),
      skip_duplicate_check: z.boolean().optional().default(false),
    },
    async ({ text, hashtags, link, topic, skip_duplicate_check }) => {
      const client = buildTwitterClient();

      const result = await client.post({
        text,
        hashtags,
        link,
        topic,
        skipDuplicateCheck: skip_duplicate_check,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "post_twitter_thread",
    {
      tweets: z.array(z.string()).min(2).describe("Array of tweet texts for the thread"),
    },
    async ({ tweets }) => {
      const client = buildTwitterClient();
      const results = await client.postThread(tweets);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  // ── Instagram ─────────────────────────────────────────────

  server.tool(
    "post_instagram",
    {
      caption: z.string().describe("Post caption"),
      media_urls: z.array(z.string()).describe("Image or video URLs"),
      hashtags: z.array(z.string()).optional().describe("Hashtags to append"),
      post_type: z
        .enum(["feed", "reels", "stories"])
        .optional()
        .default("feed"),
      topic: z.string().optional().describe("Topic for duplicate check"),
      skip_duplicate_check: z.boolean().optional().default(false),
    },
    async ({ caption, media_urls, hashtags, post_type, topic, skip_duplicate_check }) => {
      const client = buildInstagramClient();

      const result = await client.post({
        text: caption,
        caption,
        mediaUrls: media_urls,
        hashtags,
        postType: post_type,
        topic,
        skipDuplicateCheck: skip_duplicate_check,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ── Cross-platform ─────────────────────────────────────────

  server.tool(
    "post_all",
    {
      text: z.string().describe("Post text (shared across platforms)"),
      hashtags: z.array(z.string()).optional(),
      media_urls: z.array(z.string()).optional().describe("Media for Instagram"),
      platforms: z
        .array(z.enum(["twitter", "instagram"]))
        .optional()
        .default(["twitter", "instagram"])
        .describe("Which platforms to post to"),
    },
    async ({ text, hashtags, media_urls, platforms }) => {
      const results: Record<string, any> = {};

      if (platforms.includes("twitter")) {
        const client = buildTwitterClient();
        results.twitter = await client.post({ text, hashtags });
      }

      if (platforms.includes("instagram") && media_urls?.length) {
        const client = buildInstagramClient();
        results.instagram = await client.post({
          text,
          caption: text,
          mediaUrls: media_urls,
          hashtags,
        });
      } else if (platforms.includes("instagram")) {
        results.instagram = { skipped: true, reason: "No media_urls provided for Instagram" };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
