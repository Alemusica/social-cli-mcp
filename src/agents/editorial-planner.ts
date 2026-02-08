/**
 * EDITORIAL PLANNER - Content Calendar & Daily Orchestration
 *
 * Ruolo: Gestisce il calendario editoriale, determina cosa postare oggi,
 * coordina con gli altri dipartimenti.
 *
 * Funzioni:
 * - Determina giorno corrente e contenuti da postare
 * - Bilancia i 4 pillars nella settimana
 * - Adatta contenuti a orari ottimali
 * - Coordina con Story Director, Interviewer, Analytics
 *
 * @see ARCHITECTURE.md per design completo
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, getActiveArc, getTodayContent, getContentByDay } from "../core/index.js";

// =====================================================
// TYPES
// =====================================================

interface DailyPlan {
  date: string;
  dayOfWeek: string;
  dayInItalian: string;
  posts: ScheduledPost[];
  narrative_context: string;
  pillar_focus: string;
}

interface ScheduledPost {
  time: string;
  platform: "twitter" | "instagram" | "youtube";
  type: string;
  title: string;
  content: string;
  hashtags: string[];
  path_type: "tech" | "music" | "hybrid";
  status: "ready" | "draft" | "needs_review";
  notes?: string;
}

interface WeekOverview {
  week_start: string;
  week_end: string;
  arc_name: string;
  arc_theme: string;
  days: DaySlot[];
  pillar_balance: Record<string, number>;
}

interface DaySlot {
  day: string;
  dayIt: string;
  posts_count: number;
  pillars: string[];
  highlights: string[];
}

// =====================================================
// DATE UTILITIES
// =====================================================

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

// =====================================================
// CONTENT LIBRARY
// =====================================================

// Fallback content when no DB data available
const CONTENT_LIBRARY: Record<string, ScheduledPost[]> = {
  monday: [
    {
      time: "09:00",
      platform: "twitter",
      type: "thread",
      title: "jsOM Introduction Thread",
      path_type: "tech",
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
      path_type: "tech",
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
      time: "12:00",
      platform: "twitter",
      type: "single",
      title: "Lanzarote Teaser",
      path_type: "music",
      hashtags: [],
      status: "ready",
      content: `Field recording isn't about pressing record.

It's about listening first.

Tomorrow: exactly what Lanzarote sounds like.

🎧 Bring headphones.`,
    },
    {
      time: "19:00",
      platform: "instagram",
      type: "reel",
      title: "Lanzarote Binaural",
      path_type: "music",
      hashtags: ["fieldrecording", "binaural", "ku100", "lanzarote", "sounddesign"],
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
      path_type: "tech",
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
      path_type: "music",
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
      path_type: "tech",
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
      path_type: "hybrid",
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
      path_type: "tech",
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
      path_type: "music",
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
      path_type: "music",
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
      path_type: "hybrid",
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
      path_type: "hybrid",
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
      path_type: "music",
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

// =====================================================
// EDITORIAL PLANNER
// =====================================================

export class EditorialPlanner {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Get today's content plan
   */
  async getTodayPlan(): Promise<DailyPlan> {
    const { date, dayEn, dayIt } = getTodayInfo();

    // Try to get from DB first
    const dbContent = await db.query<any>(`
      SELECT * FROM platform_content
      WHERE day_of_week = "${dayEn}" AND status != "published"
      ORDER BY scheduled_time ASC
    `);

    let posts: ScheduledPost[] = [];

    if (dbContent.length > 0) {
      // Use DB content
      posts = dbContent.map((c) => ({
        time: c.scheduled_time || "12:00",
        platform: c.platform,
        type: c.content_type,
        title: c.title || "Untitled",
        content: c.caption || "",
        hashtags: c.hashtags || [],
        path_type: "music" as const, // Default
        status: c.status === "ready" ? "ready" : "draft",
        notes: c.notes,
      }));
    } else {
      // Use fallback content library
      posts = CONTENT_LIBRARY[dayEn] || [];
    }

    // Determine pillar focus
    const techCount = posts.filter((p) => p.path_type === "tech").length;
    const musicCount = posts.filter((p) => p.path_type === "music").length;
    const pillarFocus =
      techCount > musicCount
        ? "Tech Innovation"
        : musicCount > techCount
          ? "Live Looping / Nature"
          : "Hybrid";

    // Get narrative context
    const arcData = await db.query<any>(
      `SELECT * FROM story_arc WHERE status = "active" LIMIT 1`
    );
    const narrativeContext =
      arcData[0]?.theme || "Layer su layer - dal busking al codice AI";

    return {
      date,
      dayOfWeek: dayEn,
      dayInItalian: dayIt,
      posts,
      narrative_context: narrativeContext,
      pillar_focus: pillarFocus,
    };
  }

  /**
   * Get week overview
   */
  async getWeekOverview(): Promise<WeekOverview> {
    const { monday, sunday } = getWeekBounds();

    const days: DaySlot[] = [];
    const pillarBalance: Record<string, number> = {
      tech: 0,
      music: 0,
      nature: 0,
      process: 0,
    };

    for (const [dayEn, dayIt] of Object.entries(DAYS_IT)) {
      const dayPosts = CONTENT_LIBRARY[dayEn] || [];
      const pillars = [...new Set(dayPosts.map((p) => p.path_type))];

      pillars.forEach((p) => {
        if (p === "tech") pillarBalance.tech++;
        else if (p === "music") pillarBalance.music++;
        else if (p === "hybrid") {
          pillarBalance.tech++;
          pillarBalance.music++;
        }
      });

      days.push({
        day: dayEn,
        dayIt,
        posts_count: dayPosts.length,
        pillars,
        highlights: dayPosts.map((p) => p.title),
      });
    }

    const arcData = await db.query<any>(
      `SELECT * FROM story_arc WHERE status IN ["active", "planned"] ORDER BY week_start DESC LIMIT 1`
    );

    return {
      week_start: monday.toISOString().split("T")[0],
      week_end: sunday.toISOString().split("T")[0],
      arc_name: arcData[0]?.name || "Origins - Layer su Layer",
      arc_theme: arcData[0]?.theme || "Dal busking alla tech, stesso principio",
      days,
      pillar_balance: pillarBalance,
    };
  }

  /**
   * Display today's plan
   */
  async showTodayPlan(): Promise<void> {
    const plan = await this.getTodayPlan();

    console.log();
    console.log("═".repeat(60));
    console.log(
      `📅 PIANO EDITORIALE - ${plan.dayInItalian.toUpperCase()} ${plan.date}`
    );
    console.log("═".repeat(60));
    console.log();
    console.log(`🎯 Focus: ${plan.pillar_focus}`);
    console.log(`📖 Narrativa: ${plan.narrative_context}`);
    console.log();

    if (plan.posts.length === 0) {
      console.log("⚠️  Nessun post pianificato per oggi.");
      console.log("    Usa 'editorial-planner.ts generate' per creare contenuti.");
      return;
    }

    console.log("─".repeat(60));
    console.log("POST DI OGGI:");
    console.log("─".repeat(60));

    for (const post of plan.posts) {
      const statusIcon =
        post.status === "ready" ? "✅" : post.status === "draft" ? "📝" : "⚠️";
      const platformIcon =
        post.platform === "twitter"
          ? "🐦"
          : post.platform === "instagram"
            ? "📸"
            : "▶️";

      console.log();
      console.log(
        `${statusIcon} ${post.time} | ${platformIcon} ${post.platform.toUpperCase()}`
      );
      console.log(`   📌 ${post.title} [${post.type}]`);
      console.log(`   🏷️  Path: ${post.path_type}`);

      if (post.hashtags.length > 0) {
        console.log(`   #️⃣  ${post.hashtags.map((h) => `#${h}`).join(" ")}`);
      }

      if (post.notes) {
        console.log(`   ⚠️  ${post.notes}`);
      }

      // Show preview of content
      const preview = post.content.split("\n")[0].substring(0, 60);
      console.log(`   💬 "${preview}..."`);
    }

    console.log();
    console.log("─".repeat(60));
    console.log("AZIONI:");
    console.log("─".repeat(60));
    console.log("  • Copia contenuto da content/twitter-posts/week-1-threads.md");
    console.log("  • Post Twitter: link sempre in REPLY");
    console.log("  • Post Instagram: 3-5 hashtag");
    console.log();
  }

  /**
   * Display week overview
   */
  async showWeekOverview(): Promise<void> {
    const overview = await this.getWeekOverview();

    console.log();
    console.log("═".repeat(60));
    console.log("📊 OVERVIEW SETTIMANALE");
    console.log("═".repeat(60));
    console.log();
    console.log(`📅 ${overview.week_start} → ${overview.week_end}`);
    console.log(`🎭 Arco: ${overview.arc_name}`);
    console.log(`📖 Tema: ${overview.arc_theme}`);
    console.log();

    console.log("─".repeat(60));
    console.log("CALENDARIO:");
    console.log("─".repeat(60));
    console.log();

    const { dayEn: todayEn } = getTodayInfo();

    for (const day of overview.days) {
      const isToday = day.day === todayEn;
      const marker = isToday ? "👉" : "  ";
      const pillarsStr = day.pillars.join("+") || "-";

      console.log(
        `${marker} ${day.dayIt.padEnd(10)} | ${day.posts_count} post | [${pillarsStr}]`
      );
      if (day.highlights.length > 0) {
        console.log(`     └─ ${day.highlights.join(", ")}`);
      }
    }

    console.log();
    console.log("─".repeat(60));
    console.log("BILANCIO PILLARS:");
    console.log("─".repeat(60));
    console.log(
      `   Tech: ${"█".repeat(overview.pillar_balance.tech)} (${overview.pillar_balance.tech})`
    );
    console.log(
      `   Music: ${"█".repeat(overview.pillar_balance.music)} (${overview.pillar_balance.music})`
    );
    console.log();
  }

  /**
   * Get next post to publish
   */
  async getNextPost(): Promise<ScheduledPost | null> {
    const plan = await this.getTodayPlan();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Find next scheduled post
    for (const post of plan.posts) {
      const [hour, minute] = post.time.split(":").map(Number);
      const postTime = hour * 60 + minute;

      if (postTime >= currentTime && post.status === "ready") {
        return post;
      }
    }

    return null;
  }

  /**
   * Show next post
   */
  async showNextPost(): Promise<void> {
    const nextPost = await this.getNextPost();

    if (!nextPost) {
      console.log("\n✅ Nessun altro post da pubblicare oggi.\n");
      return;
    }

    console.log();
    console.log("═".repeat(60));
    console.log("⏰ PROSSIMO POST");
    console.log("═".repeat(60));
    console.log();
    console.log(`🕐 Orario: ${nextPost.time}`);
    console.log(
      `📱 Platform: ${nextPost.platform.toUpperCase()} [${nextPost.type}]`
    );
    console.log(`📌 Titolo: ${nextPost.title}`);
    console.log();
    console.log("─".repeat(60));
    console.log("CONTENUTO (copia-incolla):");
    console.log("─".repeat(60));
    console.log();
    console.log(nextPost.content);
    console.log();

    if (nextPost.hashtags.length > 0) {
      console.log("─".repeat(60));
      console.log("HASHTAGS:");
      console.log("─".repeat(60));
      console.log(nextPost.hashtags.map((h) => `#${h}`).join(" "));
      console.log();
    }

    if (nextPost.notes) {
      console.log("⚠️  NOTE:", nextPost.notes);
      console.log();
    }

    if (nextPost.platform === "twitter") {
      console.log("💡 Ricorda: link in REPLY, non nel tweet principale!");
    }
  }
}

// =====================================================
// CLI
// =====================================================

async function main() {
  const planner = new EditorialPlanner();
  const args = process.argv.slice(2);
  const command = args[0] || "today";

  switch (command) {
    case "today":
      await planner.showTodayPlan();
      break;

    case "week":
      await planner.showWeekOverview();
      break;

    case "next":
      await planner.showNextPost();
      break;

    case "help":
    default:
      console.log(`
EDITORIAL PLANNER - Content Calendar Manager
============================================

Commands:
  today    Mostra piano di oggi (default)
  week     Overview settimanale
  next     Prossimo post da pubblicare

Examples:
  npx tsx src/agents/editorial-planner.ts today
  npx tsx src/agents/editorial-planner.ts week
  npx tsx src/agents/editorial-planner.ts next

Orchestration Flow:
  1. Story Director → decide narrativa settimanale
  2. Interviewer → raccoglie feedback e storie
  3. Editorial Planner → genera calendario da narrativa
  4. Platform Agents → adattano contenuto per piattaforma
  5. Analytics → monitora performance → feedback loop
`);
  }
}

main().catch(console.error);
