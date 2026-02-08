/**
 * ORCHESTRATOR - Main Entry Point
 *
 * Coordina tutti gli agenti del sistema:
 * - Story Director (Supervisor)
 * - Editorial Planner
 * - Platform Agents (Twitter, Instagram, YouTube, Stories)
 * - Analytics Agent
 *
 * @see ARCHITECTURE.md per design completo
 * @see CLAUDE.md per documentazione sistema
 */

import { StoryDirector } from "./story-director.js";
import { db, getActiveArc, getTopHashtags } from "../core/index.js";

// =====================================================
// ORCHESTRATOR
// =====================================================

export class Orchestrator {
  private storyDirector: StoryDirector;

  constructor() {
    this.storyDirector = new StoryDirector();
  }

  /**
   * Weekly orchestration flow
   */
  async runWeeklyOrchestration(userInput?: string): Promise<void> {
    console.log("=".repeat(60));
    console.log("FLUTUR - Weekly Orchestration");
    console.log("=".repeat(60));
    console.log();

    // Step 1: Story Director analyzes current state
    console.log("1. Story Director - Analyzing current state...");
    const analysis = await this.storyDirector.analyzeCurrentState();
    console.log(`   Analysis: ${analysis.analysis}`);

    // Step 2: Check if user input is needed
    if (analysis.needsUserInput && !userInput) {
      console.log();
      console.log("USER INPUT REQUIRED:");
      if (analysis.question) {
        console.log(`   Question: ${analysis.question.question}`);
        console.log(`   Context: ${analysis.question.context}`);
        if (analysis.question.options) {
          console.log(`   Options: ${analysis.question.options.join(", ")}`);
        }
      }
      console.log();
      console.log("Run again with user input:");
      console.log('   npx tsx src/agents/orchestrator.ts "your direction here"');
      return;
    }

    // Step 3: Generate weekly plan
    const brief = userInput || "Continue current narrative direction";
    console.log();
    console.log(`2. Generating weekly plan for: "${brief}"`);
    const plan = await this.storyDirector.generateWeeklyPlan(brief);
    console.log(`   Arc: ${plan.arc.name}`);
    console.log(`   Theme: ${plan.arc.theme}`);
    console.log(`   Paths: ${plan.paths.map((p) => p.path_type).join(", ")}`);
    console.log(`   Content slots: ${plan.content_calendar.length}`);

    // Step 4: Save to database
    console.log();
    console.log("3. Saving plan to SurrealDB...");
    const arcId = await this.storyDirector.savePlan(plan);
    console.log(`   Created arc: ${arcId}`);

    // Step 5: Display calendar
    console.log();
    console.log("4. Weekly Content Calendar:");
    console.log("-".repeat(60));

    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    for (const day of days) {
      const dayContent = plan.content_calendar.filter(
        (c) => c.day.toLowerCase() === day
      );
      if (dayContent.length > 0) {
        console.log(`\n${day.toUpperCase()}:`);
        for (const slot of dayContent) {
          console.log(
            `  ${slot.time} | ${slot.platform.padEnd(10)} | ${slot.content_type.padEnd(10)} | ${slot.title}`
          );
        }
      }
    }

    console.log();
    console.log("=".repeat(60));
    console.log("Orchestration complete. Run 'activate' to make arc active.");
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<void> {
    console.log("=".repeat(60));
    console.log("FLUTUR - System Status");
    console.log("=".repeat(60));
    console.log();

    // Active arc
    const activeArc = await db.query<any>(`
      SELECT * FROM story_arc WHERE status = "active" LIMIT 1
    `);

    if (activeArc.length > 0) {
      console.log("ACTIVE ARC:");
      console.log(`  Name: ${activeArc[0].name}`);
      console.log(`  Theme: ${activeArc[0].theme}`);
      console.log(`  Week: ${activeArc[0].week_start} - ${activeArc[0].week_end}`);
    } else {
      console.log("NO ACTIVE ARC");
    }

    // Pending content
    const pendingContent = await db.query<any>(`
      SELECT count() as total, platform
      FROM platform_content
      WHERE status = "draft"
      GROUP BY platform
    `);

    console.log();
    console.log("PENDING CONTENT:");
    for (const item of pendingContent) {
      console.log(`  ${item.platform}: ${item.total} drafts`);
    }

    // Recent performance
    const recentPosts = await db.query<any>(`
      SELECT platform, count() as total
      FROM platform_content
      WHERE published_at != NONE AND published_at > time::now() - 7d
      GROUP BY platform
    `);

    console.log();
    console.log("PUBLISHED THIS WEEK:");
    for (const item of recentPosts) {
      console.log(`  ${item.platform}: ${item.total} posts`);
    }

    // Hashtag intel
    const topHashtags = await db.query<any>(`
      SELECT hashtag_name, engagement_score
      FROM hashtag_analysis
      ORDER BY engagement_score DESC
      LIMIT 5
    `);

    console.log();
    console.log("TOP HASHTAGS:");
    for (const tag of topHashtags) {
      console.log(`  #${tag.hashtag_name}: ${tag.engagement_score}`);
    }
  }

  /**
   * Display help
   */
  showHelp(): void {
    console.log(`
FLUTUR - Multi-Agent Orchestrator
=================================

Commands:
  run [brief]     Run weekly orchestration with optional direction
  status          Show system status
  help            Show this help

Examples:
  npx tsx src/agents/orchestrator.ts run
  npx tsx src/agents/orchestrator.ts run "Focus on jsOM launch this week"
  npx tsx src/agents/orchestrator.ts status

Architecture:
  ┌─────────────────────────────────────────┐
  │         STORY DIRECTOR (Supervisor)     │
  │   Decides narrative, asks user input    │
  └────────────────────┬────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Editorial │  │ Platform │  │ Analytics │
  │ Planning  │  │ Publish  │  │ Learning  │
  └──────────┘  └──────────┘  └──────────┘
                       │
                       ▼
  ┌─────────────────────────────────────────┐
  │         KNOWLEDGE GRAPH (SurrealDB)     │
  └─────────────────────────────────────────┘

See CLAUDE.md for full documentation.
`);
  }
}

// =====================================================
// CLI INTERFACE
// =====================================================

async function main() {
  const orchestrator = new Orchestrator();
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "run": {
      const brief = args.slice(1).join(" ");
      await orchestrator.runWeeklyOrchestration(brief || undefined);
      break;
    }

    case "status":
      await orchestrator.getStatus();
      break;

    case "help":
    default:
      orchestrator.showHelp();
      break;
  }
}

main().catch(console.error);
