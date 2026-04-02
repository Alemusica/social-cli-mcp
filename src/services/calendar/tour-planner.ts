/**
 * Tour Planner — FLUTUR Tour Proposal Engine (Drizzle)
 *
 * Composes calendar-engine + logistics — no duplication.
 *
 * σ₂ constraints:
 *   - Jul/Aug: Villa Porta every Friday → Sat-Thu windows only
 *   - Winter: no VP constraint → flexible windows
 *   - Break-even = total cost / fee per gig
 *
 * Relationships:
 *   engine.ts PROVIDES getOpenSlots, checkConflicts, getAvailability
 *   ../outreach/logistics.ts PROVIDES buildLogisticsBriefing, costByRegion
 *
 * Migrated from: src/calendar/tour-planner.ts
 * Change: SurrealDB getDb() → Drizzle ORM
 */

import { db } from "../../db/client.js";
import { email, venue } from "../../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { getOpenSlots, getAvailability } from "./engine.js";
import {
  buildLogisticsBriefing,
  costByRegion,
  DEFAULT_COSTS,
  NO_FLIGHT_COUNTRIES,
  type LogisticsBriefing,
  type RegionCosts,
} from "../outreach/logistics.js";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("tour-planner");

// ── Types ────────────────────────────────────────────────────

export interface TourWindow {
  startDate: string;
  endDate: string;
  days: number;
  dayOfWeekStart: string;
  dayOfWeekEnd: string;
  context: string;       // e.g., "between VP Fridays" or "winter window"
}

export interface TourProposal {
  country: string;
  window: TourWindow;
  logistics: LogisticsBriefing;
  venueStats: {
    totalInCountry: number;
    uncontacted: number;
    contacted: number;
    replied: number;
    withEmail: number;
  };
  feasibility: "high" | "medium" | "low";
  breakEvenGigs: number;
  estimatedTotalCost: { min: number; max: number };
  recommendation: string;
}

export interface RegionComparison {
  country: string;
  costs: RegionCosts;
  venueCount: number;
  uncontactedWithEmail: number;
  breakEvenGigs: number;
  totalCostMax: number;
  feasibility: "high" | "medium" | "low";
  noFlight: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function dayOfWeek(dateStr: string): string {
  return DAYS[new Date(dateStr + "T12:00:00Z").getUTCDay()];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round(
    (new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / msPerDay,
  );
}

async function getVenueStats(tenantId: string, country: string) {
  const venues = await db
    .select({
      id: venue.id,
      contactEmail: venue.contactEmail,
      status: venue.status,
    })
    .from(venue)
    .where(and(
      eq(venue.tenantId, tenantId),
      eq(venue.country, country),
    ));

  const withEmail = venues.filter(v => v.contactEmail);
  const emails = withEmail.map(v => v.contactEmail!);

  let contacted = 0;
  let replied = 0;

  if (emails.length > 0) {
    const sentEmails = await db
      .select({
        toAddress: email.toAddress,
        responseReceived: email.responseReceived,
      })
      .from(email)
      .where(and(
        eq(email.tenantId, tenantId),
        inArray(email.toAddress, emails),
      ));

    for (const s of sentEmails) {
      contacted++;
      if (s.responseReceived) replied++;
    }
  }

  return {
    totalInCountry: venues.length,
    uncontacted: withEmail.length - contacted,
    contacted,
    replied,
    withEmail: withEmail.length,
  };
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Propose a tour for a specific country and optional month.
 */
export async function proposeTour(
  tenantId: string,
  country: string,
  month?: number,
  year: number = 2026,
  days: number = 5,
): Promise<TourProposal | null> {
  const venueStats = await getVenueStats(tenantId, country);

  const targetMonth = month || 7;
  const openSlots = await getOpenSlots(tenantId, targetMonth, year);

  if (openSlots.length < days) {
    log.warn("proposeTour: not enough open slots", { country, month: targetMonth, year, available: openSlots.length, required: days });
    return null;
  }

  // Find best consecutive window
  let bestWindow: TourWindow | null = null;
  for (let i = 0; i <= openSlots.length - days; i++) {
    const start = openSlots[i].date;
    const end = openSlots[i + days - 1].date;
    const span = daysBetween(start, end);

    if (span === days - 1) {
      bestWindow = {
        startDate: start,
        endDate: end,
        days,
        dayOfWeekStart: dayOfWeek(start),
        dayOfWeekEnd: dayOfWeek(end),
        context: month && month >= 7 && month <= 8
          ? "between VP Fridays (summer)"
          : "open window",
      };
      break;
    }
  }

  if (!bestWindow) {
    // Fallback: take first N open slots even if not consecutive
    const start = openSlots[0].date;
    const end = openSlots[Math.min(days - 1, openSlots.length - 1)].date;
    bestWindow = {
      startDate: start,
      endDate: end,
      days: Math.min(days, openSlots.length),
      dayOfWeekStart: dayOfWeek(start),
      dayOfWeekEnd: dayOfWeek(end),
      context: "non-consecutive open slots",
    };
  }

  const logistics = buildLogisticsBriefing(country, country);
  const costs = costByRegion[country] || DEFAULT_COSTS;

  let feasibility: "high" | "medium" | "low" = "low";
  if (venueStats.uncontacted >= 10 && logistics.totalEstimate.max < 800) feasibility = "high";
  else if (venueStats.uncontacted >= 5 || logistics.totalEstimate.max < 500) feasibility = "medium";

  const recommendation = buildRecommendation(country, venueStats, logistics, feasibility);

  return {
    country,
    window: bestWindow,
    logistics,
    venueStats,
    feasibility,
    breakEvenGigs: logistics.breakEven.gigs,
    estimatedTotalCost: logistics.totalEstimate,
    recommendation,
  };
}

function buildRecommendation(
  country: string,
  stats: TourProposal["venueStats"],
  logistics: LogisticsBriefing,
  feasibility: string,
): string {
  const parts: string[] = [];

  if (feasibility === "high") {
    parts.push("Strong candidate.");
  } else if (feasibility === "medium") {
    parts.push("Viable with preparation.");
  } else {
    parts.push("Needs more research.");
  }

  parts.push(`${stats.uncontacted} uncontacted venues with email.`);
  parts.push(`Break-even: ${logistics.breakEven.gigs} gigs at €${logistics.breakEven.feePerGig}.`);
  parts.push(`Total cost: €${logistics.totalEstimate.min}-${logistics.totalEstimate.max}.`);

  if (stats.replied > 0) {
    parts.push(`${stats.replied} venues already replied — warm leads.`);
  }

  return parts.join(" ");
}

/**
 * Auto-generate summer tour proposals for all Sat-Thu windows between VP Fridays.
 * σ₂: Jul+Aug, VP every Friday = committed.
 */
export async function proposeSummerTours(
  tenantId: string,
  year: number = 2026,
): Promise<TourWindow[]> {
  const julStart = `${year}-07-01`;
  const augEnd = `${year}-08-31`;
  const committed = await getAvailability(tenantId, julStart, augEnd);
  const vpFridays = committed
    .filter(c =>
      (c.venue?.includes("Villa Porta") || c.venue_entity === "venue:villa_porta") &&
      c.status === "committed",
    )
    .map(c => c.date)
    .sort();

  const windows: TourWindow[] = [];

  for (let i = 0; i < vpFridays.length - 1; i++) {
    const thisFriday = vpFridays[i];
    const nextFriday = vpFridays[i + 1];

    // Window: Saturday after this VP → Thursday before next VP
    const satStart = addDays(thisFriday, 1);
    const thuEnd = addDays(nextFriday, -1);
    const days = daysBetween(satStart, thuEnd) + 1;

    if (days >= 3) {
      windows.push({
        startDate: satStart,
        endDate: thuEnd,
        days,
        dayOfWeekStart: dayOfWeek(satStart),
        dayOfWeekEnd: dayOfWeek(thuEnd),
        context: `Between VP ${thisFriday} and VP ${nextFriday}`,
      });
    }
  }

  // Window before first VP
  const firstVP = vpFridays[0];
  if (firstVP) {
    const julFirst = `${year}-07-01`;
    const daysBefore = daysBetween(julFirst, addDays(firstVP, -1));
    if (daysBefore >= 3) {
      windows.unshift({
        startDate: julFirst,
        endDate: addDays(firstVP, -1),
        days: daysBefore + 1,
        dayOfWeekStart: dayOfWeek(julFirst),
        dayOfWeekEnd: dayOfWeek(addDays(firstVP, -1)),
        context: `Before first VP ${firstVP}`,
      });
    }
  }

  // Window after last VP
  const lastVP = vpFridays[vpFridays.length - 1];
  if (lastVP) {
    const augLast = `${year}-08-31`;
    const daysAfter = daysBetween(addDays(lastVP, 1), augLast);
    if (daysAfter >= 3) {
      windows.push({
        startDate: addDays(lastVP, 1),
        endDate: augLast,
        days: daysAfter + 1,
        dayOfWeekStart: dayOfWeek(addDays(lastVP, 1)),
        dayOfWeekEnd: dayOfWeek(augLast),
        context: `After last VP ${lastVP}`,
      });
    }
  }

  return windows;
}

/**
 * Propose a winter tour (no VP constraint).
 */
export async function proposeWinterTour(
  tenantId: string,
  country: string,
  month: number = 12,
  year: number = 2026,
  days: number = 10,
): Promise<TourProposal | null> {
  return proposeTour(tenantId, country, month, year, days);
}

/**
 * Compare regions for feasibility in a given month.
 */
export async function compareRegions(
  tenantId: string,
  month?: number,
  year: number = 2026,
): Promise<RegionComparison[]> {
  const regions = Object.keys(costByRegion);
  const comparisons: RegionComparison[] = [];

  for (const country of regions) {
    const costs = costByRegion[country];
    const noFlight = NO_FLIGHT_COUNTRIES.has(country);
    const totalMax =
      costs.flight[1] + costs.baggage[1] + costs.accommodation[1] + costs.localTransport[1];
    const breakEvenGigs = totalMax > 0 ? Math.ceil(totalMax / costs.fee) : 1;

    const stats = await getVenueStats(tenantId, country);

    let feasibility: "high" | "medium" | "low" = "low";
    if (stats.uncontacted >= 10 && totalMax < 800) feasibility = "high";
    else if (stats.uncontacted >= 5 || totalMax < 500) feasibility = "medium";

    comparisons.push({
      country,
      costs,
      venueCount: stats.totalInCountry,
      uncontactedWithEmail: stats.uncontacted,
      breakEvenGigs,
      totalCostMax: totalMax,
      feasibility,
      noFlight,
    });
  }

  // Sort: high feasibility first, then by cost
  return comparisons.sort((a, b) => {
    const fOrder = { high: 0, medium: 1, low: 2 };
    const fDiff = fOrder[a.feasibility] - fOrder[b.feasibility];
    if (fDiff !== 0) return fDiff;
    return a.totalCostMax - b.totalCostMax;
  });
}

// ── Tour Planner namespace ───────────────────────────────────

export const tourPlanner = {
  proposeTour,
  proposeSummerTours,
  proposeWinterTour,
  compareRegions,
};
