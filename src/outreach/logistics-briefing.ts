/**
 * Logistics Briefing — Shared Module
 *
 * Cost estimates and cluster analysis for tour planning.
 *
 * Relationships:
 *   intelligence-router.ts IMPORTS from here
 *   tour-planner.ts IMPORTS from here (cost data + cluster)
 *   outreach-orchestrator.ts IMPORTS from here
 *   morning-check.ts IMPORTS via intelligence-router
 */

import { getDb } from '../db/client.js';

// ── Types ────────────────────────────────────────────────────

export interface LogisticsBriefing {
  travelRequired: boolean;
  origin: string;
  destination: string;
  country: string;
  estimatedFlightCost: string;
  estimatedBaggageCost: string;
  estimatedAccommodation: string;
  estimatedTransportLocal: string;
  totalEstimate: { min: number; max: number };
  breakEven: { gigs: number; feePerGig: number };
  equipmentNotes: string;
}

export interface ClusterBriefing {
  nearbyVenues: {
    name: string;
    location: string;
    distanceFromTarget: string;
    email: string | null;
    status: 'contacted' | 'replied' | 'uncontacted' | 'bounced';
    category: string;
  }[];
  clusterViability: 'strong' | 'moderate' | 'weak';
  contactable: number;
  totalInArea: number;
  recommendation: string;
}

export interface RegionCosts {
  flight: [number, number];
  baggage: [number, number];
  accommodation: [number, number];
  localTransport: [number, number];
  fee: number;
}

// ── Constants (σ₂) ──────────────────────────────────────────

export const HOME_BASE = {
  city: 'Varese',
  country: 'Italy',
  nearestAirports: ['MXP', 'BGY'],
};

export const NO_FLIGHT_COUNTRIES = new Set(['Italy', 'italy', 'Switzerland', 'switzerland']);

// ── Cost Database (σ₁ — updated periodically) ───────────────

export const costByRegion: Record<string, RegionCosts> = {
  'Portugal':    { flight: [100, 180], baggage: [100, 270], accommodation: [200, 400], localTransport: [100, 150], fee: 400 },
  'Greece':      { flight: [80, 150],  baggage: [100, 270], accommodation: [150, 350], localTransport: [80, 120],  fee: 400 },
  'Spain':       { flight: [60, 140],  baggage: [100, 270], accommodation: [150, 350], localTransport: [80, 130],  fee: 400 },
  'Indonesia':   { flight: [400, 700], baggage: [100, 200], accommodation: [100, 250], localTransport: [50, 100],  fee: 500 },
  'Croatia':     { flight: [80, 160],  baggage: [100, 270], accommodation: [120, 300], localTransport: [80, 120],  fee: 400 },
  'France':      { flight: [60, 130],  baggage: [100, 270], accommodation: [200, 450], localTransport: [100, 150], fee: 450 },
  'Germany':     { flight: [50, 120],  baggage: [100, 270], accommodation: [120, 300], localTransport: [80, 120],  fee: 400 },
  // ── Added for FLUTUR OS tour planner ──
  'Brazil':      { flight: [500, 900], baggage: [100, 200], accommodation: [80, 250],  localTransport: [50, 100],  fee: 350 },
  'Switzerland': { flight: [0, 0],     baggage: [0, 0],     accommodation: [150, 300], localTransport: [30, 60],   fee: 500 },
  'Italy':       { flight: [0, 0],     baggage: [0, 0],     accommodation: [80, 200],  localTransport: [40, 100],  fee: 400 },
  'Malta':       { flight: [60, 130],  baggage: [100, 270], accommodation: [120, 280], localTransport: [40, 80],   fee: 400 },
};

export const DEFAULT_COSTS: RegionCosts = {
  flight: [100, 200],
  baggage: [100, 270],
  accommodation: [150, 400],
  localTransport: [80, 150],
  fee: 400,
};

// ── Functions ────────────────────────────────────────────────

export function getRegionCosts(country: string): RegionCosts {
  return costByRegion[country] || DEFAULT_COSTS;
}

export function buildLogisticsBriefing(country: string, venue: string): LogisticsBriefing {
  const costs = getRegionCosts(country);
  const noFlight = NO_FLIGHT_COUNTRIES.has(country);

  const totalMin = costs.flight[0] + costs.baggage[0] + costs.accommodation[0] + costs.localTransport[0];
  const totalMax = costs.flight[1] + costs.baggage[1] + costs.accommodation[1] + costs.localTransport[1];
  const breakEvenGigs = totalMax > 0 ? Math.ceil(totalMax / costs.fee) : 1;

  return {
    travelRequired: !noFlight,
    origin: `${HOME_BASE.city}, ${HOME_BASE.country}`,
    destination: `${venue}, ${country}`,
    country,
    estimatedFlightCost: noFlight ? 'N/A (drive/train)' : `€${costs.flight[0]}-${costs.flight[1]} RT`,
    estimatedBaggageCost: noFlight ? 'N/A (drive)' : `€${costs.baggage[0]}-${costs.baggage[1]} (2-3 bags × 15-23kg)`,
    estimatedAccommodation: `€${costs.accommodation[0]}-${costs.accommodation[1]} (3-5 nights)`,
    estimatedTransportLocal: `€${costs.localTransport[0]}-${costs.localTransport[1]}`,
    totalEstimate: { min: totalMin, max: totalMax },
    breakEven: { gigs: breakEvenGigs, feePerGig: costs.fee },
    equipmentNotes: noFlight
      ? 'Drive with full rig — no baggage constraints.'
      : 'RAV Vast can go cabin on easyJet (30×117×38cm). Min: 2 checked bags. Full rig: 3 bags.',
  };
}

export async function buildClusterBriefing(venueEmail: string, country: string): Promise<ClusterBriefing> {
  const db = await getDb();

  const [venueRows] = await db.query(`
    SELECT name, location, country FROM venue
    WHERE contact_email = $email
    LIMIT 1
  `, { email: venueEmail });
  const venueData = (venueRows as any[])?.[0];

  const targetCountry = country || venueData?.country || '';
  if (!targetCountry) {
    return { nearbyVenues: [], clusterViability: 'weak', contactable: 0, totalInArea: 0, recommendation: 'No country data available.' };
  }

  const [nearbyRows] = await db.query(`
    SELECT name, location, category, sub_category, contact_email, status FROM venue
    WHERE country = $country AND contact_email != $email
    ORDER BY name ASC
  `, { country: targetCountry, email: venueEmail });
  const nearby = (nearbyRows as any[]) || [];

  const emails = nearby.filter((v: any) => v.contact_email).map((v: any) => v.contact_email);
  const [sentRows] = await db.query(`
    SELECT to_address, bounced, reply_received, reply_type FROM email
    WHERE to_address IN $emails
  `, { emails });
  const sentMap = new Map<string, any>();
  for (const s of (sentRows as any[]) || []) {
    sentMap.set(s.to_address, s);
  }

  const nearbyVenues = nearby.map((v: any) => {
    const sent = sentMap.get(v.contact_email);
    let status: 'contacted' | 'replied' | 'uncontacted' | 'bounced' = 'uncontacted';
    if (sent?.bounced) status = 'bounced';
    else if (sent?.reply_received) status = 'replied';
    else if (sent) status = 'contacted';

    return {
      name: v.name,
      location: v.location || '',
      distanceFromTarget: '',
      email: v.contact_email || null,
      status,
      category: v.category || v.sub_category || '',
    };
  });

  const contactable = nearbyVenues.filter(v => v.email && v.status !== 'bounced').length;
  const totalInArea = nearbyVenues.length;
  const uncontacted = nearbyVenues.filter(v => v.email && v.status === 'uncontacted').length;

  let viability: 'strong' | 'moderate' | 'weak' = 'weak';
  if (contactable >= 10) viability = 'strong';
  else if (contactable >= 5) viability = 'moderate';

  let recommendation = '';
  if (viability === 'strong') {
    recommendation = `Strong cluster: ${uncontacted} uncontacted venues with email. Launch batch outreach to stack dates.`;
  } else if (viability === 'moderate') {
    recommendation = `Moderate cluster: ${uncontacted} uncontacted venues. Research more venues to strengthen the cluster.`;
  } else {
    recommendation = `Weak cluster: only ${contactable} contactable venues. Deep research needed before committing to travel.`;
  }

  return { nearbyVenues, clusterViability: viability, contactable, totalInArea, recommendation };
}
