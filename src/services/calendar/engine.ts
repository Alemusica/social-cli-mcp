/**
 * Calendar Engine — FLUTUR Availability System (Drizzle)
 *
 * Principle: only committed/hold/blackout dates stored in DB.
 * Everything else = free (implicit availability).
 *
 * Relationships:
 *   calendarEntry table (schema.ts) ← reads/writes
 *   gig table ← reads/writes on bookGig
 *   tour-planner.ts IMPORTS getOpenSlots, checkConflicts
 *
 * Migrated from: src/calendar/calendar-engine.ts
 * Change: SurrealDB getDb() → Drizzle ORM
 */

import { db } from "../../db/client.js";
import { gig, calendarEntry } from "../../db/schema.js";
import { eq, and, gte, lte, inArray, or, ne } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("calendar-engine");

// ── Types ────────────────────────────────────────────────────

export type AvailabilityStatus = "free" | "committed" | "hold" | "pending" | "blackout";
export type CommitmentType = "residency" | "gig" | "travel" | "personal" | "none";

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

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function dayOfWeek(dateStr: string): string {
  return DAYS[new Date(dateStr + "T12:00:00Z").getUTCDay()];
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T12:00:00Z");
  const last = new Date(end + "T12:00:00Z");
  while (cur <= last) {
    dates.push(toISODate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function fridaysInRange(start: string, end: string): string[] {
  return datesInRange(start, end).filter(d => dayOfWeek(d) === "friday");
}

// Map calendarEntry.type to AvailabilityStatus
function entryTypeToStatus(type: string): AvailabilityStatus {
  if (type === "hold") return "hold";
  if (type === "gig") return "committed";
  if (type === "travel" || type === "personal") return "committed";
  return "committed";
}

function rowToDateSlot(r: typeof calendarEntry.$inferSelect): DateSlot {
  return {
    date: r.date,
    day_of_week: dayOfWeek(r.date),
    status: entryTypeToStatus(r.type),
    venue: r.venue ?? undefined,
    market: r.market ?? undefined,
    commitment_type: r.type as CommitmentType,
    notes: r.notes ?? undefined,
    fee: r.fee ?? undefined,
  };
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Seed Villa Porta Friday residency for July+August of a given year.
 * σ₂: VP every Friday Jul+Aug = committed.
 */
export async function seedVillaPortaFridays(
  tenantId: string,
  year: number,
): Promise<{ seeded: number; skipped: number }> {
  const julStart = `${year}-07-01`;
  const augEnd = `${year}-08-31`;
  const fridays = fridaysInRange(julStart, augEnd);

  let seeded = 0;
  let skipped = 0;

  for (const date of fridays) {
    // Check if already exists
    const existing = await db
      .select()
      .from(calendarEntry)
      .where(and(
        eq(calendarEntry.tenantId, tenantId),
        eq(calendarEntry.date, date),
        eq(calendarEntry.type, "gig"),
      ))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // Create gig first
    const [newGig] = await db.insert(gig).values({
      tenantId,
      date,
      venue: "Villa Porta Relais",
      market: "italy",
      country: "IT",
      notes: `Villa Porta Friday residency ${year}`,
      status: "confirmed",
    }).returning();

    // Create calendar entry
    await db.insert(calendarEntry).values({
      tenantId,
      date,
      type: "gig",
      venue: "Villa Porta Relais",
      market: "italy",
      notes: `Villa Porta Friday residency ${year}`,
      gigId: newGig.id,
    }).onConflictDoNothing();

    seeded++;
  }

  log.info("seedVillaPortaFridays", { year, seeded, skipped });
  return { seeded, skipped };
}

/**
 * Get all availability records in a date range.
 * Returns only dates that have records (committed/hold).
 */
export async function getAvailability(
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<DateSlot[]> {
  const rows = await db
    .select()
    .from(calendarEntry)
    .where(and(
      eq(calendarEntry.tenantId, tenantId),
      gte(calendarEntry.date, startDate),
      lte(calendarEntry.date, endDate),
    ))
    .orderBy(calendarEntry.date);

  return rows.map(rowToDateSlot);
}

/**
 * Get open (free) slots for a given month/year.
 * Logic: generate all dates in month, subtract committed/hold.
 */
export async function getOpenSlots(
  tenantId: string,
  month: number,
  year: number,
): Promise<DateSlot[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const committed = await getAvailability(tenantId, startDate, endDate);
  const committedDates = new Set(committed.map(c => c.date));

  const allDates = datesInRange(startDate, endDate);
  const openSlots: DateSlot[] = [];

  for (const date of allDates) {
    if (!committedDates.has(date)) {
      openSlots.push({
        date,
        day_of_week: dayOfWeek(date),
        status: "free",
      });
    }
  }

  return openSlots;
}

/**
 * Book a gig — creates committed calendar entry + gig record.
 */
export async function bookGig(
  tenantId: string,
  input: BookGigInput,
): Promise<{ calendarEntry: any; gig: any }> {
  // Check conflicts first
  const conflict = await checkConflicts(tenantId, [input.date]);
  if (conflict[0].hasConflict) {
    throw new Error(
      `Conflict on ${input.date}: already ${conflict[0].existing?.status} for ${conflict[0].existing?.venue || "unknown"}`,
    );
  }

  // Create gig record
  const [newGig] = await db.insert(gig).values({
    tenantId,
    date: input.date,
    venue: input.venue,
    market: input.market,
    fee: input.fee,
    notes: input.notes,
    status: "confirmed",
  }).returning();

  // Create calendar entry
  const [entry] = await db.insert(calendarEntry).values({
    tenantId,
    date: input.date,
    type: (input.commitmentType === "gig" || !input.commitmentType) ? "gig" : input.commitmentType as any,
    venue: input.venue,
    market: input.market,
    fee: input.fee,
    notes: input.notes,
    gigId: newGig.id,
  }).returning();

  log.info("bookGig", { date: input.date, venue: input.venue });
  return { calendarEntry: entry, gig: newGig };
}

/**
 * Hold dates for tour planning.
 */
export async function holdDates(
  tenantId: string,
  dates: string[],
  market: string,
  notes?: string,
): Promise<{ held: number; conflicted: string[] }> {
  let held = 0;
  const conflicted: string[] = [];

  for (const date of dates) {
    const conflicts = await checkConflicts(tenantId, [date]);
    if (conflicts[0].hasConflict) {
      conflicted.push(date);
      continue;
    }

    await db.insert(calendarEntry).values({
      tenantId,
      date,
      type: "hold",
      market,
      notes: notes || `Hold for ${market} tour planning`,
    }).onConflictDoNothing();

    held++;
  }

  log.info("holdDates", { market, held, conflicted: conflicted.length });
  return { held, conflicted };
}

/**
 * Release held dates.
 */
export async function releaseDates(
  tenantId: string,
  dates: string[],
): Promise<{ released: number; notFound: string[] }> {
  let released = 0;
  const notFound: string[] = [];

  for (const date of dates) {
    const rows = await db
      .select()
      .from(calendarEntry)
      .where(and(
        eq(calendarEntry.tenantId, tenantId),
        eq(calendarEntry.date, date),
        eq(calendarEntry.type, "hold"),
      ))
      .limit(1);

    if (rows.length === 0) {
      notFound.push(date);
      continue;
    }

    await db.delete(calendarEntry).where(eq(calendarEntry.id, rows[0].id));
    released++;
  }

  return { released, notFound };
}

/**
 * Check for conflicts on given dates.
 */
export async function checkConflicts(
  tenantId: string,
  dates: string[],
): Promise<ConflictResult[]> {
  const results: ConflictResult[] = [];

  for (const date of dates) {
    const rows = await db
      .select()
      .from(calendarEntry)
      .where(and(
        eq(calendarEntry.tenantId, tenantId),
        eq(calendarEntry.date, date),
        inArray(calendarEntry.type, ["gig", "hold", "travel", "personal"]),
      ))
      .limit(1);

    const existing = rows[0];
    results.push({
      date,
      hasConflict: !!existing,
      existing: existing ? rowToDateSlot(existing) : undefined,
    });
  }

  return results;
}

/**
 * Get upcoming committed gigs.
 */
export async function getUpcomingCommitments(
  tenantId: string,
  limit: number = 10,
): Promise<DateSlot[]> {
  const today = toISODate(new Date());

  const rows = await db
    .select()
    .from(calendarEntry)
    .where(and(
      eq(calendarEntry.tenantId, tenantId),
      gte(calendarEntry.date, today),
      inArray(calendarEntry.type, ["gig", "hold", "travel", "personal"]),
    ))
    .orderBy(calendarEntry.date)
    .limit(limit);

  return rows.map(rowToDateSlot);
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
