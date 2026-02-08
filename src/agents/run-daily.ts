#!/usr/bin/env npx tsx
/**
 * DAILY ORCHESTRATOR
 *
 * Script semplice che esegue il workflow giornaliero.
 * Può essere invocato da Claude Code o manualmente.
 *
 * Usage:
 *   npx tsx src/agents/run-daily.ts
 *
 * Oppure Claude Code può eseguirlo automaticamente
 * quando chiedi "cosa posto oggi?"
 */

import { EditorialPlanner } from "./editorial-planner.js";

async function runDaily() {
  console.log("\n" + "═".repeat(60));
  console.log("🚀 FLUTUR DAILY ORCHESTRATOR");
  console.log("═".repeat(60));

  const planner = new EditorialPlanner();

  // 1. Mostra piano del giorno
  console.log("\n📅 STEP 1: Piano del giorno\n");
  await planner.showTodayPlan();

  // 2. Mostra prossimo post
  console.log("\n⏰ STEP 2: Prossimo post\n");
  await planner.showNextPost();

  console.log("═".repeat(60));
  console.log("✅ Daily orchestration complete");
  console.log("═".repeat(60));
  console.log("\nComandi disponibili:");
  console.log("  • npx tsx src/agents/interviewer.ts feedback  → dopo aver postato");
  console.log("  • npx tsx src/agents/interviewer.ts tweets    → genera altri tweet");
  console.log();
}

runDaily().catch(console.error);
