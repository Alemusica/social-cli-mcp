/**
 * Editorial Planner — Content Calendar & Daily Orchestration (Drizzle)
 *
 * Manages the editorial calendar, determines what to post today,
 * coordinates with other departments.
 *
 * Migrated from: src/agents/editorial-planner.ts
 * Changes:
 *   - SurrealDB raw queries → Drizzle ORM
 *   - console.log → createLogger()
 *   - tenantId param added throughout
 */

import { db } from "../../db/client.js";
import { post, postDraft, storyFragment } from "../../db/schema.js";
import {
  eq,
  and,
  gte,
  lte,
  desc,
  not,
  inArray,
  sql,
} from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("editorial-planner");

// ── Types ────────────────────────────────────────────────────

export interface DailyPlan {
  date: string;
  dayOfWeek: string;
  dayInItalian: string;
  posts: ScheduledPost[];
  narrativeContext: string;
  pillarFocus: string;
}

export interface ScheduledPost {
  time: string;
  platform: "twitter" | "instagram" | "youtube";
  type: string;
  title: string;
  content: string;
  hashtags: string[];
  pathType: "tech" | "music" | "hybrid";
  status: "ready" | "draft" | "needs_review";
  notes?: string;
}

export interface WeekOverview {
  weekStart: string;
  weekEnd: string;
  arcName: string;
  arcTheme: string;
  days: DaySlot[];
  pillarBalance: Record<string, number>;
}

export interface DaySlot {
  day: string;
  dayIt: string;
  postsCount: number;
  pillars: string[];
  highlights: string[];
}

// ── Date utilities ────────────────────────────────────────────

const DAYS_IT: Record<string, string> = {
  monday: "Lunedì",
  tuesday: "Martedì",
  wednesday: "Mercoledì",
  thursday: "Giovedì",
  friday: "Venerdì",
  saturday: "Sabato",
  sunday: "Domenica",
};

const DAYS_EN = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getTodayInfo(): { date: string; dayEn: string; dayIt: string } {
  const now = new Date();
  const dayEn = DAYS_EN[now.getDay()];
  return {
    date: now.toISOString().split("T")[0],
    dayEn,
    dayIt: DAYS_IT[dayEn],
  };
}

function getWeekBounds(): { monday: Date; sunday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

// ── Static fallback content library ──────────────────────────
// Used when no DB drafts are found for the day.

const CONTENT_LIBRARY: Record<string, ScheduledPost[]> = {
  monday: [
    {
      time: "09:00",
      platform: "twitter",
      type: "thread",
      title: "jsOM Introduction Thread",
      pathType: "tech",
      hashtags: ["buildinpublic"],
      status: "ready",
      content: `What if designers could define UI for LLMs?

Not prompts. Not code. Just... draw components.

That's what jsOM does.

Thread 👇`,
    },
  ],
  tuesday: [
    {
      time: "09:00",
      platform: "twitter",
      type: "single",
      title: "Build Log Tuesday",
      pathType: "tech",
      hashtags: ["buildinpublic"],
      status: "ready",
      content: `Tuesday build log:

Working on the export pipeline.
The goal: Figma → JSON → Claude in under 10 seconds.

Current status: 47 seconds. 🫠

Progress > perfection.

#buildinpublic`,
    },
    {
      time: "19:00",
      platform: "instagram",
      type: "reel",
      title: "Lanzarote Binaural",
      pathType: "music",
      hashtags: [
        "fieldrecording",
        "binaural",
        "ku100",
        "lanzarote",
        "sounddesign",
      ],
      status: "ready",
      content: `Field recording isn't about pressing record.
It's about listening first.

Gear: Neumann KU100 binaural head
Location: Timanfaya, Lanzarote
What you hear: Exactly what I heard standing there.

🎧 Use headphones for the full binaural experience

Drop a location you want me to capture next.`,
    },
  ],
  wednesday: [
    {
      time: "09:00",
      platform: "twitter",
      type: "single",
      title: "BTS Development",
      pathType: "tech",
      hashtags: ["buildinpublic"],
      status: "ready",
      content: `Today's build log:

• Refactored the JSON export
• Broke 3 things
• Fixed 2
• Added feature no one asked for
• Deleted it

This is what "building in public" actually looks like.

#buildinpublic`,
    },
    {
      time: "12:00",
      platform: "instagram",
      type: "single",
      title: "Kids RAV Vast",
      pathType: "music",
      hashtags: ["ravvast", "streetmusic", "flutur", "busking", "musicismagic"],
      status: "ready",
      content: `This moment.

No followers. No algorithm. No strategy.
Just kids who'd never seen a RAV Vast,
gathered around to touch the sounds.

One asked: "Is it magic?"

I said: "Kind of, yeah."

These are the moments the metrics don't capture.

When did music last feel like magic for you?`,
      notes: "⚠️ Blur faces before posting (GDPR)",
    },
  ],
  thursday: [
    {
      time: "09:00",
      platform: "twitter",
      type: "single",
      title: "Industry Commentary",
      pathType: "tech",
      hashtags: [],
      status: "ready",
      content: `Hot take:

The AI tools winning right now?

They're not the most powerful.
They're the most understandable.

Complexity is the enemy of adoption.

(Building jsOM with this in mind)`,
    },
    {
      time: "18:00",
      platform: "twitter",
      type: "single",
      title: "Reflection",
      pathType: "hybrid",
      hashtags: [],
      status: "ready",
      content: `Thursday thought:

Music taught me patience.
5 months busking before anyone noticed.

Tech is the same.
Build, share, iterate. Repeat.

The timeline doesn't care about your timeline.`,
    },
  ],
  friday: [
    {
      time: "09:00",
      platform: "twitter",
      type: "single",
      title: "Demo Preview",
      pathType: "tech",
      hashtags: ["buildinpublic", "jsOM"],
      status: "ready",
      content: `jsOM demo dropping today.

30 seconds.
Zero code.
Designer → AI in one export.

Stay tuned 👀

#buildinpublic`,
    },
    {
      time: "19:00",
      platform: "instagram",
      type: "single",
      title: "Morocco Sunset",
      pathType: "music",
      hashtags: ["busker", "streetmusic", "ravvast", "fieldrecording", "morocco"],
      status: "ready",
      content: `Some sunsets you photograph.
Others photograph you.

Morocco, 2022

What place photographed you?`,
    },
  ],
  saturday: [
    {
      time: "11:00",
      platform: "instagram",
      type: "carousel",
      title: "Denver Journey",
      pathType: "music",
      hashtags: ["busker", "streetmusic", "ravvast", "flutur", "livemusic"],
      status: "ready",
      content: `January 2023. Denver tour.

Two years earlier I was busking for dinner money.
Now I was playing for people who flew in to hear the same sounds.

The music didn't change.
The story did.

→ Swipe for the backstage-to-stage journey

Where should the next tour stop?`,
    },
    {
      time: "18:00",
      platform: "twitter",
      type: "thread",
      title: "Layer su Layer Crossover",
      pathType: "hybrid",
      hashtags: [],
      status: "ready",
      content: `Music taught me to think in layers.

First the bass. Then the melody. Then texture.
Each one changes everything before it.

I code the same way now.

🧵`,
    },
  ],
  sunday: [
    {
      time: "12:00",
      platform: "twitter",
      type: "single",
      title: "Week Reflection",
      pathType: "hybrid",
      hashtags: [],
      status: "ready",
      content: `Week done.

Shipped jsOM updates.
Shared field recordings.
Connected the dots: music → code.

Layer su layer.

What are you building this week?`,
    },
    {
      time: "18:00",
      platform: "instagram",
      type: "single",
      title: "Sunday Sunset",
      pathType: "music",
      hashtags: ["flutur", "sundayvibes", "sunset", "reflection"],
      status: "ready",
      content: `Sunday ritual: watch the light change.

No content to create.
No algorithm to chase.
Just presence.

Back to building tomorrow.`,
    },
  ],
};

// ── EditorialPlanner class ────────────────────────────────────

export class EditorialPlanner {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Get today's content plan.
   * Tries DB post_draft table first, falls back to CONTENT_LIBRARY.
   */
  async getTodayPlan(): Promise<DailyPlan> {
    const { date, dayEn, dayIt } = getTodayInfo();

    // Query scheduled drafts for today that haven't been published yet
    const dbDrafts = await db
      .select()
      .from(postDraft)
      .where(
        and(
          eq(postDraft.tenantId, this.tenantId),
          not(inArray(postDraft.status, ["published", "cancelled"])),
          gte(
            postDraft.scheduledFor,
            new Date(`${date}T00:00:00Z`)
          ),
          lte(
            postDraft.scheduledFor,
            new Date(`${date}T23:59:59Z`)
          )
        )
      )
      .orderBy(postDraft.scheduledFor);

    let posts: ScheduledPost[] = [];

    if (dbDrafts.length > 0) {
      posts = dbDrafts.map((d) => {
        const data = (d.data as any) || {};
        return {
          time: d.scheduledFor
            ? d.scheduledFor
                .toISOString()
                .split("T")[1]
                .substring(0, 5)
            : "12:00",
          platform: (d.platform as "twitter" | "instagram" | "youtube") ||
            "instagram",
          type: data.type || "single",
          title: data.title || "Draft",
          content: d.content,
          hashtags: data.hashtags || [],
          pathType: (data.pathType as "tech" | "music" | "hybrid") || "music",
          status: (d.status as "ready" | "draft" | "needs_review") || "draft",
          notes: data.notes,
        };
      });
      log.debug("loaded posts from DB", { count: posts.length, date });
    } else {
      posts = CONTENT_LIBRARY[dayEn] || [];
      log.debug("using fallback content library", { dayEn });
    }

    const techCount = posts.filter((p) => p.pathType === "tech").length;
    const musicCount = posts.filter((p) => p.pathType === "music").length;
    const pillarFocus =
      techCount > musicCount
        ? "Tech Innovation"
        : musicCount > techCount
          ? "Live Looping / Nature"
          : "Hybrid";

    // Get active arc narrative from story fragments
    const recentFragments = await db
      .select({ title: storyFragment.title, theme: storyFragment.theme })
      .from(storyFragment)
      .where(
        and(
          eq(storyFragment.tenantId, this.tenantId),
          eq(storyFragment.published, false)
        )
      )
      .orderBy(desc(storyFragment.createdAt))
      .limit(1);

    const narrativeContext =
      recentFragments[0]?.theme ||
      "Layer su layer — dal busking al codice AI";

    return {
      date,
      dayOfWeek: dayEn,
      dayInItalian: dayIt,
      posts,
      narrativeContext,
      pillarFocus,
    };
  }

  /**
   * Get week overview.
   * Queries DB for the week's scheduled drafts; falls back to CONTENT_LIBRARY.
   */
  async getWeekOverview(): Promise<WeekOverview> {
    const { monday, sunday } = getWeekBounds();

    // Get all drafts for this week
    const weekDrafts = await db
      .select({
        scheduledFor: postDraft.scheduledFor,
        pillar: postDraft.pillar,
        data: postDraft.data,
        content: postDraft.content,
      })
      .from(postDraft)
      .where(
        and(
          eq(postDraft.tenantId, this.tenantId),
          not(inArray(postDraft.status, ["published", "cancelled"])),
          gte(postDraft.scheduledFor, monday),
          lte(postDraft.scheduledFor, sunday)
        )
      )
      .orderBy(postDraft.scheduledFor);

    const pillarBalance: Record<string, number> = {
      tech: 0,
      music: 0,
      nature: 0,
      process: 0,
    };

    const days: DaySlot[] = [];

    for (const [dayEn, dayIt] of Object.entries(DAYS_IT)) {
      let dayPosts: ScheduledPost[];

      if (weekDrafts.length > 0) {
        // Filter DB drafts for this day-of-week
        const dayDrafts = weekDrafts.filter((d) => {
          if (!d.scheduledFor) return false;
          const dDay = DAYS_EN[d.scheduledFor.getDay()];
          return dDay === dayEn;
        });

        dayPosts = dayDrafts.map((d) => {
          const data = (d.data as any) || {};
          return {
            time: d.scheduledFor
              ? d.scheduledFor.toISOString().split("T")[1].substring(0, 5)
              : "12:00",
            platform: "instagram" as const,
            type: data.type || "single",
            title: data.title || "Draft",
            content: d.content,
            hashtags: data.hashtags || [],
            pathType: (data.pathType as "tech" | "music" | "hybrid") || "music",
            status: "draft" as const,
          };
        });
      } else {
        dayPosts = CONTENT_LIBRARY[dayEn] || [];
      }

      const pillars = [...new Set(dayPosts.map((p) => p.pathType))];

      for (const p of pillars) {
        if (p === "tech") pillarBalance.tech++;
        else if (p === "music") pillarBalance.music++;
        else if (p === "hybrid") {
          pillarBalance.tech++;
          pillarBalance.music++;
        }
      }

      days.push({
        day: dayEn,
        dayIt,
        postsCount: dayPosts.length,
        pillars,
        highlights: dayPosts.map((p) => p.title),
      });
    }

    return {
      weekStart: monday.toISOString().split("T")[0],
      weekEnd: sunday.toISOString().split("T")[0],
      arcName: "Origins — Layer su Layer",
      arcTheme: "Dal busking alla tech, stesso principio",
      days,
      pillarBalance,
    };
  }

  /**
   * Get next post to publish today (first scheduled post after now).
   */
  async getNextPost(): Promise<ScheduledPost | null> {
    const plan = await this.getTodayPlan();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const p of plan.posts) {
      const [h, m] = p.time.split(":").map(Number);
      if (h * 60 + m >= currentMinutes && p.status === "ready") {
        return p;
      }
    }

    return null;
  }

  /**
   * Return a list of story fragments suitable for a given channel.
   */
  async getFragmentsForChannel(
    channel: string,
    limit: number = 5
  ): Promise<Array<{ id: string; title: string; theme: string | null; body: string }>> {
    const rows = await db
      .select({
        id: storyFragment.id,
        title: storyFragment.title,
        theme: storyFragment.theme,
        body: storyFragment.body,
      })
      .from(storyFragment)
      .where(
        and(
          eq(storyFragment.tenantId, this.tenantId),
          eq(storyFragment.published, false),
          sql`${storyFragment.channelsSuitable} @> ARRAY[${channel}]::text[]`
        )
      )
      .orderBy(desc(storyFragment.createdAt))
      .limit(limit);

    return rows;
  }

  /**
   * Get recent published posts for a platform (for gap analysis).
   */
  async getRecentPosts(
    platform: "twitter" | "instagram" | "youtube",
    days: number = 7
  ): Promise<Array<{ id: string; content: string; pillar: string | null; postedAt: Date }>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await db
      .select({
        id: post.id,
        content: post.content,
        pillar: post.pillar,
        postedAt: post.postedAt,
      })
      .from(post)
      .where(
        and(
          eq(post.tenantId, this.tenantId),
          eq(post.platform, platform),
          gte(post.postedAt, cutoff)
        )
      )
      .orderBy(desc(post.postedAt));

    return rows;
  }
}

// ── Factory ───────────────────────────────────────────────────

export function createEditorialPlanner(tenantId: string): EditorialPlanner {
  return new EditorialPlanner(tenantId);
}
