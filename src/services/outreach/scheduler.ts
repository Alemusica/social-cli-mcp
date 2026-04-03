/**
 * Outreach Scheduler — Tour-to-Pipeline Bridge (Drizzle)
 *
 * Connects tour planning to the outreach pipeline by generating
 * venue lists (the input the pipeline consumes). Does NOT send emails.
 *
 * Relationships:
 *   tour-planner PROVIDES TourProposal[] (calendar windows + feasibility)
 *   pipeline CONSUMES the RawVenueData[] output as venue JSON
 *   mcp-server IMPORTS via barrel
 *
 * Migrated from: src/outreach/outreach-scheduler.ts
 * Change: SurrealDB getDb() -> Drizzle ORM
 */

import { db } from "../../db/client.js";
import { email, venue } from "../../db/schema.js";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("outreach-scheduler");

// ── Types ────────────────────────────────────────────────────

export interface TourProposal {
  country: string;
  window: { startDate: string; endDate: string };
  feasibility: "high" | "medium" | "low";
}

export interface RawVenueData {
  name: string;
  location: string;
  country: string;
  category: string;
  sub_category?: string;
  contact_email: string;
  website?: string;
  instagram?: string;
  live_music_details?: string;
  notes?: string;
}

export interface OutreachBatchPlan {
  country: string;
  tourWindow: { startDate: string; endDate: string };
  sendBy: string;
  venueCount: number;
  priority: "high" | "medium" | "low";
  venues: { name: string; email: string; category: string; location: string }[];
}

export interface OutreachPlan {
  batches: OutreachBatchPlan[];
}

export interface CountryStats {
  total: number;
  withEmail: number;
  countries: string[];
}

// ── Helpers ──────────────────────────────────────────────────

function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

function feasibilityToPriority(f: TourProposal["feasibility"]): OutreachBatchPlan["priority"] {
  return f; // same union, direct pass-through
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Survey all venues grouped by country. For each country: total venues,
 * venues with email that haven't been contacted yet, and list of countries.
 */
export async function getUncontactedByCountry(
  tenantId: string,
): Promise<Record<string, CountryStats>> {
  // Get all venues
  const venues = await db
    .select({
      country: venue.country,
      name: venue.name,
      contactEmail: venue.contactEmail,
      status: venue.status,
    })
    .from(venue)
    .where(eq(venue.tenantId, tenantId));

  // Get all contacted addresses
  const emailRows = await db
    .select({ toAddress: email.toAddress })
    .from(email)
    .where(eq(email.tenantId, tenantId));

  const contacted = new Set(emailRows.map((e) => e.toAddress.toLowerCase()));

  const byCountry: Record<string, { total: number; withEmail: number }> = {};

  for (const v of venues) {
    const country = v.country || "Unknown";
    if (!byCountry[country]) byCountry[country] = { total: 0, withEmail: 0 };
    byCountry[country].total++;

    const addr = (v.contactEmail || "").toLowerCase();
    if (addr && !contacted.has(addr)) {
      byCountry[country].withEmail++;
    }
  }

  const result: Record<string, CountryStats> = {};
  const allCountries = Object.keys(byCountry).sort();

  for (const [country, stats] of Object.entries(byCountry)) {
    result[country] = { ...stats, countries: allCountries };
  }

  return result;
}

/**
 * Given tour proposals from the planner, produce an OutreachPlan:
 * one batch per proposal, filtered to uncontacted venues with email,
 * sendBy = 4 weeks before tour start.
 */
export async function generateOutreachPlan(
  proposals: TourProposal[],
  tenantId: string,
): Promise<OutreachPlan> {
  // Pre-fetch all contacted addresses once (avoid N+1)
  const emailRows = await db
    .select({ toAddress: email.toAddress })
    .from(email)
    .where(eq(email.tenantId, tenantId));

  const contacted = new Set(emailRows.map((e) => e.toAddress.toLowerCase()));

  const batches: OutreachBatchPlan[] = [];

  for (const proposal of proposals) {
    const venueRows = await db
      .select({
        name: venue.name,
        contactEmail: venue.contactEmail,
        type: venue.type,
        location: venue.location,
      })
      .from(venue)
      .where(
        and(
          eq(venue.tenantId, tenantId),
          eq(venue.country, proposal.country),
          isNotNull(venue.contactEmail),
        ),
      );

    const filteredVenues = venueRows
      .filter((v) => {
        const addr = (v.contactEmail || "").toLowerCase();
        return addr && !contacted.has(addr);
      })
      .map((v) => ({
        name: v.name,
        email: v.contactEmail!,
        category: v.type || "",
        location: v.location || "",
      }));

    if (filteredVenues.length === 0) continue;

    batches.push({
      country: proposal.country,
      tourWindow: {
        startDate: proposal.window.startDate,
        endDate: proposal.window.endDate,
      },
      sendBy: subtractDays(proposal.window.startDate, 28),
      venueCount: filteredVenues.length,
      priority: feasibilityToPriority(proposal.feasibility),
      venues: filteredVenues,
    });
  }

  // Sort: high priority first, then by sendBy date (earliest deadline first)
  batches.sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = pOrder[a.priority] - pOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.sendBy.localeCompare(b.sendBy);
  });

  return { batches };
}

/**
 * Hydrate a single OutreachBatchPlan into RawVenueData[] — the format
 * the existing pipeline (pipeline-service / outreach-orchestrator) consumes.
 */
export async function createBatchFromPlan(
  batch: OutreachBatchPlan,
  tenantId: string,
): Promise<RawVenueData[]> {
  const emailAddresses = batch.venues.map((v) => v.email.toLowerCase());

  const venueRows = await db
    .select({
      name: venue.name,
      location: venue.location,
      country: venue.country,
      type: venue.type,
      contactEmail: venue.contactEmail,
      website: venue.website,
      instagram: venue.instagram,
      liveMusicDetails: venue.liveMusicDetails,
      notes: venue.notes,
    })
    .from(venue)
    .where(
      and(
        eq(venue.tenantId, tenantId),
        inArray(venue.contactEmail, emailAddresses),
      ),
    );

  return venueRows.map((v) => ({
    name: v.name,
    location: v.location || "",
    country: v.country || batch.country,
    category: v.type || "",
    contact_email: v.contactEmail || "",
    website: v.website ?? undefined,
    instagram: v.instagram ?? undefined,
    live_music_details: v.liveMusicDetails ? JSON.stringify(v.liveMusicDetails) : undefined,
    notes: v.notes ?? undefined,
  }));
}

// ── Namespace ────────────────────────────────────────────────

export const outreachScheduler = {
  getUncontactedByCountry,
  generateOutreachPlan,
  createBatchFromPlan,
};
