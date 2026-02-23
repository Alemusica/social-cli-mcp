/**
 * Content Orchestrator -- Gig-Driven Content Pipeline
 *
 * Relationships:
 *   calendar-engine.ts PROVIDES gig dates (getAvailability, getUpcomingCommitments)
 *   editorial-planner.ts CONSUMES weekly plans (WeeklyContentPlan)
 *   mcp-server.ts IMPORTS via barrel (core/index.ts)
 *
 * Principle: every confirmed gig auto-generates content tasks.
 * No gig = no auto-tasks (manual editorial fills the gap).
 *
 * Storage: editorial_slot table in SurrealDB (schema.surql).
 * Content tasks map to editorial_slot records with task-specific fields.
 */

import { getDb } from '../db/client.js';
import {
  getAvailability,
  getUpcomingCommitments,
  type DateSlot,
} from '../calendar/calendar-engine.js';

// -- Types ---------------------------------------------------------------

export type ContentTaskStatus = 'pending' | 'captured' | 'editing' | 'published';

export interface ContentTask {
  id?: string;
  gigDate: string;
  venue: string;
  taskType: 'reel_soundcheck' | 'photo_venue' | 'snippet_performance' | 'caption_postgig';
  description: string;
  dueDate: string;
  status: ContentTaskStatus;
  platform: 'instagram' | 'twitter' | 'youtube';
  notes?: string;
}

export interface WeeklyContentPlan {
  weekStart: string;
  weekEnd: string;
  gigs: { date: string; venue: string; market: string }[];
  tasks: ContentTask[];
  pillarBalance: Record<string, number>;
  suggestions: string[];
}

// -- Helpers -------------------------------------------------------------

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

function getMondayOfWeek(refDate?: string): string {
  const d = refDate ? new Date(refDate + 'T12:00:00Z') : new Date();
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toISODate(d);
}

// -- Core: per-gig task generation ---------------------------------------

/**
 * Generate 4 content tasks for a single gig.
 *
 * 1. reel_soundcheck  -- due day before gig
 * 2. photo_venue      -- due gig day
 * 3. snippet_performance -- due gig day
 * 4. caption_postgig  -- due day after gig
 */
export function generateGigContentTasks(gigDate: string, venue: string): ContentTask[] {
  return [
    {
      gigDate,
      venue,
      taskType: 'reel_soundcheck',
      description: `Record soundcheck setup reel at ${venue}`,
      dueDate: addDays(gigDate, -1),
      status: 'pending',
      platform: 'instagram',
    },
    {
      gigDate,
      venue,
      taskType: 'photo_venue',
      description: `Capture venue atmosphere/crowd photos at ${venue}`,
      dueDate: gigDate,
      status: 'pending',
      platform: 'instagram',
    },
    {
      gigDate,
      venue,
      taskType: 'snippet_performance',
      description: `Record 30-60s performance snippet at ${venue}`,
      dueDate: gigDate,
      status: 'pending',
      platform: 'instagram',
    },
    {
      gigDate,
      venue,
      taskType: 'caption_postgig',
      description: `Write and post gig recap for ${venue}`,
      dueDate: addDays(gigDate, 1),
      status: 'pending',
      platform: 'instagram',
    },
  ];
}

// -- Weekly plan generation ----------------------------------------------

/**
 * Build a content plan for the week starting at `weekStart`.
 *
 * 1. Pull committed gigs from the availability table for the 7-day window.
 * 2. Auto-generate content tasks per gig via generateGigContentTasks.
 * 3. Check pillar balance from platform_content (published this week).
 * 4. Produce suggestions for gaps.
 */
export async function generateWeeklyPlan(weekStart?: string): Promise<WeeklyContentPlan> {
  const start = weekStart ?? getMondayOfWeek();
  const end = addDays(start, 6); // Monday -> Sunday

  // 1. Gigs this week (committed slots with a venue)
  const slots: DateSlot[] = await getAvailability(start, end);
  const gigSlots = slots.filter(
    s => s.status === 'committed' && s.venue && s.commitment_type !== 'personal',
  );

  const gigs = gigSlots.map(s => ({
    date: s.date,
    venue: s.venue!,
    market: s.market ?? 'unknown',
  }));

  // 2. Content tasks
  const tasks: ContentTask[] = gigs.flatMap(g => generateGigContentTasks(g.date, g.venue));

  // 3. Pillar balance (what was published this week already)
  const pillarBalance = await getWeekPillarBalance(start, end);

  // 4. Suggestions
  const suggestions = deriveSuggestions(gigs, pillarBalance);

  return { weekStart: start, weekEnd: end, gigs, tasks, pillarBalance, suggestions };
}

// -- Pillar balance check ------------------------------------------------

async function getWeekPillarBalance(
  start: string,
  end: string,
): Promise<Record<string, number>> {
  const db = await getDb();

  const [rows] = await db.query<[{ pillar: string; total: number }[]]>(`
    SELECT
      ->belongs_to_pillar->content_pillar.name AS pillar,
      count() AS total
    FROM post
    WHERE posted_at >= d'${start}T00:00:00Z'
      AND posted_at <= d'${end}T23:59:59Z'
    GROUP BY pillar
  `);

  const balance: Record<string, number> = {};
  for (const row of rows ?? []) {
    if (row.pillar) {
      balance[String(row.pillar)] = row.total;
    }
  }
  return balance;
}

// -- Suggestion engine ---------------------------------------------------

const PILLAR_TARGETS: Record<string, number> = {
  tech: 2,
  music_prod: 2,
  live_perf: 3,
  nature_auth: 2,
};

function deriveSuggestions(
  gigs: { date: string; venue: string; market: string }[],
  pillarBalance: Record<string, number>,
): string[] {
  const suggestions: string[] = [];

  // Gig count hints
  if (gigs.length === 0) {
    suggestions.push('No gigs this week -- lean into tech/nature_auth pillars for content.');
  } else if (gigs.length >= 3) {
    suggestions.push('Heavy gig week -- prioritise live_perf captures; reduce tech output.');
  }

  // Pillar gap detection
  for (const [pillar, target] of Object.entries(PILLAR_TARGETS)) {
    const current = pillarBalance[pillar] ?? 0;
    if (current < target) {
      const deficit = target - current;
      suggestions.push(`${pillar}: ${deficit} post(s) below target (${current}/${target}).`);
    }
  }

  return suggestions;
}

// -- Task persistence (editorial_slot) -----------------------------------

/**
 * Query content tasks stored as editorial_slot records.
 * Filters by status when provided.
 */
export async function getContentTasks(status?: ContentTaskStatus): Promise<ContentTask[]> {
  const db = await getDb();

  const statusClause = status ? `WHERE status = '${status}'` : '';
  const [rows] = await db.query<[Record<string, unknown>[]]>(
    `SELECT * FROM editorial_slot ${statusClause} ORDER BY scheduled_date ASC`,
  );

  return ((rows as Record<string, unknown>[]) ?? []).map(mapSlotToTask);
}

function mapSlotToTask(row: Record<string, unknown>): ContentTask {
  const rawDate = row.scheduled_date as string | undefined;
  const date = rawDate ? (typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate as string).toISOString().split('T')[0]) : '';

  return {
    id: row.id as string | undefined,
    gigDate: date,
    venue: (row.title as string) ?? '',
    taskType: (row.post_type as ContentTask['taskType']) ?? 'caption_postgig',
    description: (row.notes as string) ?? '',
    dueDate: date,
    status: mapSlotStatus(row.status as string),
    platform: (row.platform as ContentTask['platform']) ?? 'instagram',
    notes: row.notes as string | undefined,
  };
}

function mapSlotStatus(slotStatus: string): ContentTaskStatus {
  const mapping: Record<string, ContentTaskStatus> = {
    planned: 'pending',
    ready: 'captured',
    published: 'published',
    captured: 'captured',
    editing: 'editing',
    pending: 'pending',
  };
  return mapping[slotStatus] ?? 'pending';
}

/**
 * Mark a content task as captured (editorial_slot status -> 'ready').
 */
export async function markTaskCaptured(taskId: string): Promise<void> {
  const db = await getDb();
  await db.merge(taskId, { status: 'ready' });
}

// -- Namespace export ----------------------------------------------------

export const contentOrchestrator = {
  generateWeeklyPlan,
  generateGigContentTasks,
  getContentTasks,
  markTaskCaptured,
};
