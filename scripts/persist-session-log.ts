#!/usr/bin/env npx tsx
/**
 * Persist the current conversation session log.
 * This captures Feb 7 afternoon session: YouTube analytics + memory corrections.
 */

import { saveSessionLog } from '../src/agents/memory/session-log.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  // Session 1: Deep Research Persistence (afternoon)
  const id1 = await saveSessionLog({
    title: 'Deep Research persistence + YouTube analytics correction',
    trigger: 'user request: persist Japan tech + Gulf research, then analyze YT stats',
    actions: [
      'Saved japan-tech-workshops-2026.md to content/outreach/deep-research/',
      'Saved gulf-market-2026.md to content/outreach/deep-research/',
      'Created and ran persist-japan-tech-research.ts (engineering dept, 15 entities)',
      'Created and ran persist-gulf-research.ts (marketing dept, 17 entities, triggered auto-fusion)',
      'Created verify-memory-state.ts — 7 sessions, 104 links, 42 entities',
      'Queried YouTube Analytics API: geographic views, temporal patterns, per-video breakdowns',
      'CRITICAL DISCOVERY: All Gulf views from Sept 2025 single spike, not gradual organic',
      'CRITICAL DISCOVERY: Japan 27 views June 2025, 260s avg = deepest engagement',
      'Created and ran persist-youtube-analytics.ts (reception dept, 5 entities, 5 decisions)',
      'Restructured MEMORY.md from 207→169 lines, created memory/youtube-analytics.md',
      'Created session-log.ts persistence module',
    ],
    decisions: [
      'Gulf YT signal DOWNGRADED: single Sept 2025 spike, 25s avg = Shorts-level, not gradual organic',
      'Japan YT signal UPGRADED: 260s avg = 71% retention = deepest engagement of any country',
      'Father Ocean FULL = Italy video (530 views, 123s). Use for Italian outreach instead of Efthymia.',
      'Budget constraint: user cannot afford €4-6K Japan trip NOW → zero-cost actions only',
      'September 2025 global spike needs investigation (what triggered 40%+ of all-time views?)',
    ],
    entities: [
      'market:japan', 'market:gulf', 'market:qatar', 'market:italy', 'market:greece',
      'channel:flutur_youtube', 'contact:shalestone_music', 'venue:banana_island_anantara',
    ],
    files: [
      { path: 'content/outreach/deep-research/japan-tech-workshops-2026.md', action: 'created' },
      { path: 'content/outreach/deep-research/gulf-market-2026.md', action: 'created' },
      { path: 'scripts/persist-japan-tech-research.ts', action: 'created' },
      { path: 'scripts/persist-gulf-research.ts', action: 'created' },
      { path: 'scripts/verify-memory-state.ts', action: 'created' },
      { path: 'scripts/persist-youtube-analytics.ts', action: 'created' },
      { path: 'scripts/persist-session-log.ts', action: 'created' },
      { path: 'src/agents/memory/session-log.ts', action: 'created' },
      { path: 'src/agents/memory/index.ts', action: 'modified' },
      { path: 'memory/MEMORY.md', action: 'modified' },
      { path: 'memory/youtube-analytics.md', action: 'created' },
    ],
    nextSteps: [
      'Build content analysis module (video-to-venue matching + production roadmap)',
      'Investigate September 2025 global YT spike — what caused it?',
      'Email drafts for Shalestone Music, IIC Tokyo, Banana Island Anantara (provided but not yet in JSON)',
      'Comporta Café reply still pending to SEND',
      'Pyramids of Chi reply pending Drishti reference decision',
    ],
    notes: 'Agent memory system now at 8 sessions across 3 departments. market:japan has convergence across all 3 (marketing + engineering + reception). First session_log entry — establishes conversation persistence.',
  });

  console.log('✅ Session log saved:', id1);

  // Verify
  const { getRecentSessionLogs } = await import('../src/agents/memory/session-log.js');
  const recent = await getRecentSessionLogs(1);
  console.log(`\n📋 Recent session logs: ${recent.length}`);
  for (const log of recent) {
    console.log(`  ${log.title} — ${log.actions?.length || 0} actions, ${log.decisions?.length || 0} decisions`);
  }

  await closeDb();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
