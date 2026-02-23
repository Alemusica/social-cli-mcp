/**
 * Outreach Scheduler — Tour-to-Pipeline Bridge
 *
 * Connects tour planning to the outreach pipeline by generating
 * venue lists (the input the pipeline consumes). Does NOT send emails.
 *
 * Relationships:
 *   tour-planner.ts PROVIDES TourProposal[] (calendar windows + feasibility)
 *   pipeline-service.ts CONSUMES the RawVenueData[] output as venue JSON
 *   mcp-server.ts IMPORTS via barrel (core/index.ts)
 */

import { getDb } from '../db/client.js';
import type { TourProposal } from '../calendar/tour-planner.js';

// ── Types ────────────────────────────────────────────────────

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

export interface OutreachBatch {
  country: string;
  tourWindow: { startDate: string; endDate: string };
  sendBy: string;
  venueCount: number;
  priority: 'high' | 'medium' | 'low';
  venues: { name: string; email: string; category: string; location: string }[];
}

export interface OutreachPlan {
  batches: OutreachBatch[];
}

export interface CountryStats {
  total: number;
  withEmail: number;
  countries: string[];
}

// ── Helpers ──────────────────────────────────────────────────

function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

function feasibilityToPriority(f: TourProposal['feasibility']): OutreachBatch['priority'] {
  return f; // same union, direct pass-through
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Survey all venues grouped by country. For each country: total venues,
 * venues with email that haven't been contacted yet, and list of countries.
 */
export async function getUncontactedByCountry(): Promise<Record<string, CountryStats>> {
  const db = await getDb();

  const [venueRows] = await db.query(
    `SELECT country, name, contact_email, status FROM venue`
  );
  const venues = (venueRows as any[]) || [];

  const [emailRows] = await db.query(
    `SELECT to_address FROM email`
  );
  const contacted = new Set(
    ((emailRows as any[]) || []).map((e: any) => (e.to_address || '').toLowerCase())
  );

  const byCountry: Record<string, { total: number; withEmail: number }> = {};

  for (const v of venues) {
    const country = v.country || 'Unknown';
    if (!byCountry[country]) byCountry[country] = { total: 0, withEmail: 0 };
    byCountry[country].total++;

    const email = (v.contact_email || '').toLowerCase();
    if (email && !contacted.has(email)) {
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
export async function generateOutreachPlan(proposals: TourProposal[]): Promise<OutreachPlan> {
  const db = await getDb();

  // Pre-fetch all contacted addresses once (avoid N+1)
  const [emailRows] = await db.query(`SELECT to_address FROM email`);
  const contacted = new Set(
    ((emailRows as any[]) || []).map((e: any) => (e.to_address || '').toLowerCase())
  );

  const batches: OutreachBatch[] = [];

  for (const proposal of proposals) {
    const [venueRows] = await db.query(
      `SELECT name, contact_email, category, sub_category, location
       FROM venue
       WHERE country = $country AND contact_email IS NOT NONE`,
      { country: proposal.country }
    );
    const venues = ((venueRows as any[]) || [])
      .filter((v: any) => {
        const email = (v.contact_email || '').toLowerCase();
        return email && !contacted.has(email);
      })
      .map((v: any) => ({
        name: v.name,
        email: v.contact_email,
        category: v.category || v.sub_category || '',
        location: v.location || '',
      }));

    if (venues.length === 0) continue;

    batches.push({
      country: proposal.country,
      tourWindow: {
        startDate: proposal.window.startDate,
        endDate: proposal.window.endDate,
      },
      sendBy: subtractDays(proposal.window.startDate, 28),
      venueCount: venues.length,
      priority: feasibilityToPriority(proposal.feasibility),
      venues,
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
 * Hydrate a single OutreachBatch into RawVenueData[] — the format
 * the existing pipeline (pipeline-service / outreach-orchestrator) consumes.
 */
export async function createBatchFromPlan(batch: OutreachBatch): Promise<RawVenueData[]> {
  const db = await getDb();

  const emails = batch.venues.map(v => v.email);

  const [venueRows] = await db.query(
    `SELECT name, location, country, category, sub_category,
            contact_email, website, instagram, live_music_details, notes
     FROM venue
     WHERE contact_email IN $emails`,
    { emails }
  );
  const rows = (venueRows as any[]) || [];

  return rows.map((v: any) => ({
    name: v.name,
    location: v.location || '',
    country: v.country || batch.country,
    category: v.category || v.sub_category || '',
    sub_category: v.sub_category,
    contact_email: v.contact_email,
    website: v.website,
    instagram: v.instagram,
    live_music_details: v.live_music_details,
    notes: v.notes,
  }));
}

// ── Namespace ────────────────────────────────────────────────

export const outreachScheduler = {
  getUncontactedByCountry,
  generateOutreachPlan,
  createBatchFromPlan,
};
