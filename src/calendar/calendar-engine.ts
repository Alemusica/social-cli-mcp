/**
 * Calendar Engine — FLUTUR Availability System
 *
 * Principle: only committed/hold/blackout dates stored in DB.
 * Everything else = free (implicit availability).
 *
 * Relationships:
 *   availability table (schema.surql) ← reads/writes
 *   tour-planner.ts IMPORTS getOpenSlots, checkConflicts
 *   outreach-scheduler.ts IMPORTS getOpenSlots (send-by timing)
 *   content-orchestrator.ts IMPORTS getAvailability (gig-driven content)
 *   mcp-server.ts IMPORTS via barrel (MCP tools)
 */

import { getDb } from '../db/client.js';

// ── Types ────────────────────────────────────────────────────

export type AvailabilityStatus = 'free' | 'committed' | 'hold' | 'pending' | 'blackout';
export type CommitmentType = 'residency' | 'gig' | 'travel' | 'personal' | 'none';

export interface AvailabilityRecord {
  id?: string;
  date: string;            // YYYY-MM-DD
  day_of_week: string;
  status: AvailabilityStatus;
  venue?: string;
  venue_entity?: string;
  market?: string;
  commitment_type: CommitmentType;
  notes?: string;
  fee?: number;
  currency: string;
  sigma: string;
}

export interface DateSlot {
  date: string;
  day_of_week: string;
  status: AvailabilityStatus;
  venue?: string;
  venue_entity?: string;
  market?: string;
  commitment_type?: CommitmentType;
  notes?: string;
  fee?: number;
}

export interface BookGigInput {
  date: string;
  venue: string;
  venueEntity?: string;
  market: string;
  fee?: number;
  currency?: string;
  notes?: string;
  commitmentType?: CommitmentType;
}

export interface ConflictResult {
  date: string;
  hasConflict: boolean;
  existing?: DateSlot;
}

// ── Helpers ──────────────────────────────────────────────────

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dayOfWeek(dateStr: string): string {
  return DAYS[new Date(dateStr + 'T12:00:00Z').getUTCDay()];
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T12:00:00Z');
  const last = new Date(end + 'T12:00:00Z');
  while (cur <= last) {
    dates.push(toISODate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function fridaysInRange(start: string, end: string): string[] {
  return datesInRange(start, end).filter(d => dayOfWeek(d) === 'friday');
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Seed Villa Porta Friday residency for July+August of a given year.
 * σ₂: VP every Friday Jul+Aug = committed.
 */
export async function seedVillaPortaFridays(year: number): Promise<{ seeded: number; skipped: number }> {
  const db = await getDb();

  const julStart = `${year}-07-01`;
  const augEnd = `${year}-08-31`;
  const fridays = fridaysInRange(julStart, augEnd);

  let seeded = 0;
  let skipped = 0;

  for (const date of fridays) {
    // Check if already exists
    const [existing] = await db.query(
      `SELECT * FROM availability WHERE date = d'${date}T00:00:00Z' LIMIT 1`
    );
    if ((existing as any[])?.length > 0) {
      skipped++;
      continue;
    }

    await db.create('availability', {
      date: new Date(date + 'T00:00:00Z').toISOString(),
      day_of_week: 'friday',
      status: 'committed',
      venue: 'Villa Porta Relais',
      venue_entity: 'venue:villa_porta',
      market: 'italy',
      commitment_type: 'residency',
      notes: `Villa Porta Friday residency ${year}`,
      fee: null,
      currency: 'EUR',
      sigma: 'σ₂',
    });
    seeded++;
  }

  return { seeded, skipped };
}

/**
 * Get all availability records in a date range.
 * Returns only dates that have records (committed/hold/blackout).
 */
export async function getAvailability(startDate: string, endDate: string): Promise<DateSlot[]> {
  const db = await getDb();

  const [rows] = await db.query(`
    SELECT * FROM availability
    WHERE date >= d'${startDate}T00:00:00Z' AND date <= d'${endDate}T23:59:59Z'
    ORDER BY date ASC
  `);

  return ((rows as any[]) || []).map(r => ({
    date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
    day_of_week: r.day_of_week,
    status: r.status,
    venue: r.venue,
    venue_entity: r.venue_entity,
    market: r.market,
    commitment_type: r.commitment_type,
    notes: r.notes,
    fee: r.fee,
  }));
}

/**
 * Get open (free) slots for a given month/year.
 * Logic: generate all dates in month, subtract committed/hold/blackout.
 */
export async function getOpenSlots(month: number, year: number): Promise<DateSlot[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const committed = await getAvailability(startDate, endDate);
  const committedDates = new Set(committed.map(c => c.date));

  const allDates = datesInRange(startDate, endDate);
  const openSlots: DateSlot[] = [];

  for (const date of allDates) {
    if (!committedDates.has(date)) {
      openSlots.push({
        date,
        day_of_week: dayOfWeek(date),
        status: 'free',
      });
    }
  }

  return openSlots;
}

/**
 * Book a gig — creates committed availability record + gig record.
 */
export async function bookGig(input: BookGigInput): Promise<{ availability: any; gig: any }> {
  const db = await getDb();

  // Check conflicts first
  const conflict = await checkConflicts([input.date]);
  if (conflict[0].hasConflict) {
    throw new Error(`Conflict on ${input.date}: already ${conflict[0].existing?.status} for ${conflict[0].existing?.venue || 'unknown'}`);
  }

  // Create availability record
  const availability = await db.create('availability', {
    date: new Date(input.date + 'T00:00:00Z').toISOString(),
    day_of_week: dayOfWeek(input.date),
    status: 'committed' as AvailabilityStatus,
    venue: input.venue,
    venue_entity: input.venueEntity,
    market: input.market,
    commitment_type: input.commitmentType || 'gig',
    notes: input.notes,
    fee: input.fee,
    currency: input.currency || 'EUR',
    sigma: 'σ₁',
  });

  // Create gig record
  const gig = await db.create('gig', {
    name: `${input.venue} gig`,
    date: new Date(input.date + 'T00:00:00Z').toISOString(),
    type: 'live_set',
    city: input.venue,
    country: input.market,
    venue_name: input.venue,
    earnings: input.fee,
    currency: input.currency || 'EUR',
    description: input.notes,
  });

  return { availability, gig };
}

/**
 * Hold dates for tour planning.
 */
export async function holdDates(
  dates: string[],
  market: string,
  notes?: string,
): Promise<{ held: number; conflicted: string[] }> {
  const db = await getDb();
  let held = 0;
  const conflicted: string[] = [];

  for (const date of dates) {
    const conflicts = await checkConflicts([date]);
    if (conflicts[0].hasConflict) {
      conflicted.push(date);
      continue;
    }

    await db.create('availability', {
      date: new Date(date + 'T00:00:00Z').toISOString(),
      day_of_week: dayOfWeek(date),
      status: 'hold' as AvailabilityStatus,
      market,
      commitment_type: 'travel' as CommitmentType,
      notes: notes || `Hold for ${market} tour planning`,
      currency: 'EUR',
      sigma: 'σ₁',
    });
    held++;
  }

  return { held, conflicted };
}

/**
 * Release held dates.
 */
export async function releaseDates(dates: string[]): Promise<{ released: number; notFound: string[] }> {
  const db = await getDb();
  let released = 0;
  const notFound: string[] = [];

  for (const date of dates) {
    const [rows] = await db.query(`
      SELECT * FROM availability
      WHERE date = d'${date}T00:00:00Z' AND status = 'hold'
      LIMIT 1
    `);

    const record = (rows as any[])?.[0];
    if (!record) {
      notFound.push(date);
      continue;
    }

    await db.query(`DELETE FROM availability WHERE id = $id`, { id: record.id });
    released++;
  }

  return { released, notFound };
}

/**
 * Check for conflicts on given dates.
 */
export async function checkConflicts(dates: string[]): Promise<ConflictResult[]> {
  const db = await getDb();
  const results: ConflictResult[] = [];

  for (const date of dates) {
    const [rows] = await db.query(`
      SELECT * FROM availability
      WHERE date = d'${date}T00:00:00Z' AND status IN ['committed', 'hold', 'blackout']
      LIMIT 1
    `);

    const existing = (rows as any[])?.[0];
    results.push({
      date,
      hasConflict: !!existing,
      existing: existing ? {
        date,
        day_of_week: existing.day_of_week,
        status: existing.status,
        venue: existing.venue,
        market: existing.market,
        commitment_type: existing.commitment_type,
        notes: existing.notes,
        fee: existing.fee,
      } : undefined,
    });
  }

  return results;
}

/**
 * Get upcoming committed gigs.
 */
export async function getUpcomingCommitments(limit: number = 10): Promise<DateSlot[]> {
  const db = await getDb();
  const today = toISODate(new Date());

  const [rows] = await db.query(`
    SELECT * FROM availability
    WHERE date >= d'${today}T00:00:00Z' AND status IN ['committed', 'hold']
    ORDER BY date ASC
    LIMIT ${limit}
  `);

  return ((rows as any[]) || []).map(r => ({
    date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
    day_of_week: r.day_of_week,
    status: r.status,
    venue: r.venue,
    market: r.market,
    commitment_type: r.commitment_type,
    notes: r.notes,
    fee: r.fee,
  }));
}

// ── Calendar Engine namespace ────────────────────────────────

export const calendarEngine = {
  seedVillaPortaFridays,
  getAvailability,
  getOpenSlots,
  bookGig,
  holdDates,
  releaseDates,
  checkConflicts,
  getUpcomingCommitments,
};
