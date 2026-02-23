#!/usr/bin/env npx tsx
/**
 * FLUTUR Dashboard — Unified System View
 *
 * Usage: npx tsx scripts/flutur-dashboard.ts
 *
 * Shows: calendar, outreach, content, tour, economics in one view.
 */

import { getDb } from '../src/db/client.js';
import { getAvailability, getUpcomingCommitments, getOpenSlots } from '../src/calendar/calendar-engine.js';
import { proposeSummerTours, compareRegions } from '../src/calendar/tour-planner.js';
import { getUncontactedByCountry } from '../src/outreach/outreach-scheduler.js';
import { generateWeeklyPlan } from '../src/content/content-orchestrator.js';

const SEP = '═'.repeat(60);
const LINE = '─'.repeat(60);

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function thisMonday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}

async function main() {
  await getDb();

  console.log(`\n${SEP}`);
  console.log('  FLUTUR OPERATING SYSTEM — DASHBOARD');
  console.log(`  ${today()}`);
  console.log(SEP);

  // ── 1. Calendar ──
  console.log(`\n${LINE}`);
  console.log('  CALENDAR — Upcoming Commitments');
  console.log(LINE);

  const commitments = await getUpcomingCommitments(15);
  if (commitments.length === 0) {
    console.log('  No upcoming commitments.');
  } else {
    for (const c of commitments) {
      const icon = c.status === 'committed' ? '●' : c.status === 'hold' ? '○' : '?';
      console.log(`  ${icon} ${c.date} (${c.day_of_week}) — ${c.venue || c.market || 'TBD'} [${c.commitment_type || c.status}]`);
    }
  }

  // ── 2. Open Slots (current + next month) ──
  const now = new Date();
  const currMonth = now.getMonth() + 1;
  const currYear = now.getFullYear();
  const nextMonth = currMonth === 12 ? 1 : currMonth + 1;
  const nextYear = currMonth === 12 ? currYear + 1 : currYear;

  const openCurr = await getOpenSlots(currMonth, currYear);
  const openNext = await getOpenSlots(nextMonth, nextYear);

  console.log(`\n  Open slots this month: ${openCurr.length} days`);
  console.log(`  Open slots next month: ${openNext.length} days`);

  // ── 3. Summer Tour Windows ──
  console.log(`\n${LINE}`);
  console.log('  SUMMER TOUR WINDOWS (Jul-Aug 2026)');
  console.log(LINE);

  try {
    const windows = await proposeSummerTours(2026);
    if (windows.length === 0) {
      console.log('  No VP Fridays seeded yet. Run: npx tsx scripts/seed-calendar.ts');
    } else {
      for (const w of windows) {
        console.log(`  ${w.startDate} → ${w.endDate} (${w.days}d) — ${w.context}`);
      }
    }
  } catch {
    console.log('  Run seed-calendar.ts first to generate windows.');
  }

  // ── 4. Region Comparison ──
  console.log(`\n${LINE}`);
  console.log('  REGION FEASIBILITY');
  console.log(LINE);

  try {
    const regions = await compareRegions(7, 2026);
    console.log('  Country'.padEnd(16) + 'Venues'.padEnd(10) + 'Uncontacted'.padEnd(14) + 'Cost Max'.padEnd(12) + 'Break-even'.padEnd(14) + 'Feasibility');
    console.log('  ' + '-'.repeat(70));
    for (const r of regions) {
      const costStr = r.noFlight ? `€${r.costs.accommodation[1] + r.costs.localTransport[1]}` : `€${r.totalCostMax}`;
      console.log(
        `  ${r.country.padEnd(14)}${String(r.venueCount).padEnd(10)}${String(r.uncontactedWithEmail).padEnd(14)}${costStr.padEnd(12)}${(r.breakEvenGigs + ' gigs').padEnd(14)}${r.feasibility}`
      );
    }
  } catch {
    console.log('  Could not load region data.');
  }

  // ── 5. Outreach Status ──
  console.log(`\n${LINE}`);
  console.log('  OUTREACH — Uncontacted Venues by Country');
  console.log(LINE);

  try {
    const uncontacted = await getUncontactedByCountry();
    const entries = Object.entries(uncontacted).sort((a, b) => b[1].withEmail - a[1].withEmail);
    let totalUncontacted = 0;
    for (const [country, stats] of entries) {
      if (stats.withEmail > 0) {
        console.log(`  ${country.padEnd(16)}${stats.withEmail} with email / ${stats.total} total`);
        totalUncontacted += stats.withEmail;
      }
    }
    console.log(`  ${'TOTAL'.padEnd(16)}${totalUncontacted} uncontacted with email`);
  } catch {
    console.log('  Could not load venue data.');
  }

  // ── 6. Outreach Economics ──
  console.log(`\n${LINE}`);
  console.log('  OUTREACH ECONOMICS');
  console.log(LINE);

  try {
    const db = await getDb();
    const [emailCount] = await db.query('SELECT count() FROM email GROUP ALL');
    const [replyCount] = await db.query('SELECT count() FROM email WHERE reply_received = true GROUP ALL');
    const [bounceCount] = await db.query('SELECT count() FROM email WHERE bounced = true GROUP ALL');
    const [venueCount] = await db.query('SELECT count() FROM venue GROUP ALL');

    const sent = (emailCount as any[])?.[0]?.count ?? 0;
    const replies = (replyCount as any[])?.[0]?.count ?? 0;
    const bounces = (bounceCount as any[])?.[0]?.count ?? 0;
    const venues = (venueCount as any[])?.[0]?.count ?? 0;

    console.log(`  Total venues researched:  ${venues}`);
    console.log(`  Emails sent:              ${sent}`);
    console.log(`  Replies received:         ${replies} (${sent > 0 ? ((replies / sent) * 100).toFixed(1) : 0}%)`);
    console.log(`  Bounced:                  ${bounces}`);
    console.log(`  Reply rate (excl bounce): ${sent - bounces > 0 ? ((replies / (sent - bounces)) * 100).toFixed(1) : 0}%`);
  } catch {
    console.log('  Could not load outreach stats.');
  }

  // ── 7. Content Tasks ──
  console.log(`\n${LINE}`);
  console.log('  CONTENT — This Week');
  console.log(LINE);

  try {
    const plan = await generateWeeklyPlan();
    if (plan.gigs.length === 0) {
      console.log('  No gigs this week.');
    } else {
      console.log(`  Gigs: ${plan.gigs.map(g => `${g.date} @ ${g.venue}`).join(', ')}`);
    }
    if (plan.tasks.length > 0) {
      console.log(`  Content tasks: ${plan.tasks.length}`);
      for (const t of plan.tasks.slice(0, 6)) {
        console.log(`    [${t.status}] ${t.dueDate} — ${t.description}`);
      }
    }
    if (plan.suggestions.length > 0) {
      console.log(`  Suggestions:`);
      for (const s of plan.suggestions) {
        console.log(`    - ${s}`);
      }
    }
  } catch {
    console.log('  Could not generate content plan.');
  }

  console.log(`\n${SEP}`);
  console.log('  End of dashboard');
  console.log(`${SEP}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Dashboard error:', err.message);
  process.exit(1);
});
