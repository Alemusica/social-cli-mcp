/**
 * Logistics Briefing — Shared Module (Drizzle)
 *
 * Cost estimates and cluster analysis for tour planning.
 *
 * Relationships:
 *   intelligence.ts IMPORTS from here
 *   tour-planner IMPORTS from here (cost data + cluster)
 *
 * Migrated from: src/outreach/logistics-briefing.ts
 * Change: SurrealDB getDb() → Drizzle ORM (only in buildClusterBriefing)
 */

import { db } from "../../db/client.js";
import { email, venue } from "../../db/schema.js";
import { eq, and, ne, isNotNull, inArray, ilike } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("outreach-logistics");

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
    status: "contacted" | "replied" | "uncontacted" | "bounced";
    category: string;
  }[];
  clusterViability: "strong" | "moderate" | "weak";
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

// ── Constants (sigma-2) ──────────────────────────────────────

export const HOME_BASE = {
  city: "Varese",
  country: "Italy",
  nearestAirports: ["MXP", "BGY"],
};

export const NO_FLIGHT_COUNTRIES = new Set(["Italy", "italy", "Switzerland", "switzerland"]);

// ── Cost Database (sigma-1 — updated periodically) ───────────

export const costByRegion: Record<string, RegionCosts> = {
  Portugal: { flight: [100, 180], baggage: [100, 270], accommodation: [200, 400], localTransport: [100, 150], fee: 400 },
  Greece: { flight: [80, 150], baggage: [100, 270], accommodation: [150, 350], localTransport: [80, 120], fee: 400 },
  Spain: { flight: [60, 140], baggage: [100, 270], accommodation: [150, 350], localTransport: [80, 130], fee: 400 },
  Indonesia: { flight: [400, 700], baggage: [100, 200], accommodation: [100, 250], localTransport: [50, 100], fee: 500 },
  Croatia: { flight: [80, 160], baggage: [100, 270], accommodation: [120, 300], localTransport: [80, 120], fee: 400 },
  France: { flight: [60, 130], baggage: [100, 270], accommodation: [200, 450], localTransport: [100, 150], fee: 450 },
  Germany: { flight: [50, 120], baggage: [100, 270], accommodation: [120, 300], localTransport: [80, 120], fee: 400 },
  Brazil: { flight: [500, 900], baggage: [100, 200], accommodation: [80, 250], localTransport: [50, 100], fee: 350 },
  Switzerland: { flight: [0, 0], baggage: [0, 0], accommodation: [150, 300], localTransport: [30, 60], fee: 500 },
  Italy: { flight: [0, 0], baggage: [0, 0], accommodation: [80, 200], localTransport: [40, 100], fee: 400 },
  Malta: { flight: [60, 130], baggage: [100, 270], accommodation: [120, 280], localTransport: [40, 80], fee: 400 },
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

export function buildLogisticsBriefing(country: string, venueName: string): LogisticsBriefing {
  const costs = getRegionCosts(country);
  const noFlight = NO_FLIGHT_COUNTRIES.has(country);

  const totalMin = costs.flight[0] + costs.baggage[0] + costs.accommodation[0] + costs.localTransport[0];
  const totalMax = costs.flight[1] + costs.baggage[1] + costs.accommodation[1] + costs.localTransport[1];
  const breakEvenGigs = totalMax > 0 ? Math.ceil(totalMax / costs.fee) : 1;

  return {
    travelRequired: !noFlight,
    origin: `${HOME_BASE.city}, ${HOME_BASE.country}`,
    destination: `${venueName}, ${country}`,
    country,
    estimatedFlightCost: noFlight ? "N/A (drive/train)" : `\u20AC${costs.flight[0]}-${costs.flight[1]} RT`,
    estimatedBaggageCost: noFlight ? "N/A (drive)" : `\u20AC${costs.baggage[0]}-${costs.baggage[1]} (2-3 bags \u00D7 15-23kg)`,
    estimatedAccommodation: `\u20AC${costs.accommodation[0]}-${costs.accommodation[1]} (3-5 nights)`,
    estimatedTransportLocal: `\u20AC${costs.localTransport[0]}-${costs.localTransport[1]}`,
    totalEstimate: { min: totalMin, max: totalMax },
    breakEven: { gigs: breakEvenGigs, feePerGig: costs.fee },
    equipmentNotes: noFlight
      ? "Drive with full rig \u2014 no baggage constraints."
      : "RAV Vast can go cabin on easyJet (30\u00D7117\u00D738cm). Min: 2 checked bags. Full rig: 3 bags.",
  };
}

export async function buildClusterBriefing(
  venueEmail: string,
  country: string,
  tenantId: string,
): Promise<ClusterBriefing> {
  // Look up the venue by contact_email
  const venueRows = await db
    .select({ name: venue.name, location: venue.location, country: venue.country })
    .from(venue)
    .where(
      and(
        eq(venue.tenantId, tenantId),
        ilike(venue.contactEmail, venueEmail.toLowerCase()),
      ),
    )
    .limit(1);

  const venueData = venueRows[0];
  const targetCountry = country || venueData?.country || "";
  if (!targetCountry) {
    return {
      nearbyVenues: [],
      clusterViability: "weak",
      contactable: 0,
      totalInArea: 0,
      recommendation: "No country data available.",
    };
  }

  // Get all venues in same country excluding the target venue
  const nearbyRows = await db
    .select({
      name: venue.name,
      location: venue.location,
      type: venue.type,
      contactEmail: venue.contactEmail,
      status: venue.status,
    })
    .from(venue)
    .where(
      and(
        eq(venue.tenantId, tenantId),
        eq(venue.country, targetCountry),
        // Exclude target venue by email
        ne(venue.contactEmail, venueEmail),
      ),
    )
    .orderBy(venue.name);

  // Get sent email addresses to determine contact status
  const emailAddresses = nearbyRows
    .filter((v) => v.contactEmail)
    .map((v) => v.contactEmail!.toLowerCase());

  let sentMap = new Map<string, { responseReceived: boolean | null; responseSentiment: string | null }>();

  if (emailAddresses.length > 0) {
    const sentRows = await db
      .select({
        toAddress: email.toAddress,
        responseReceived: email.responseReceived,
        responseSentiment: email.responseSentiment,
      })
      .from(email)
      .where(
        and(
          eq(email.tenantId, tenantId),
          inArray(email.toAddress, emailAddresses),
        ),
      );

    for (const s of sentRows) {
      sentMap.set(s.toAddress.toLowerCase(), {
        responseReceived: s.responseReceived,
        responseSentiment: s.responseSentiment,
      });
    }
  }

  type VenueContactStatus = "contacted" | "replied" | "uncontacted" | "bounced";

  const nearbyVenues = nearbyRows.map((v) => {
    const addr = v.contactEmail?.toLowerCase() || "";
    const sent = sentMap.get(addr);
    let contactStatus: VenueContactStatus = "uncontacted";
    if (sent?.responseReceived) contactStatus = "replied";
    else if (sent) contactStatus = "contacted";
    // Note: bounce detection from outreach_reply table is not in scope here.
    // The "bounced" status exists for forward-compatibility.

    return {
      name: v.name,
      location: v.location || "",
      distanceFromTarget: "",
      email: v.contactEmail || null,
      status: contactStatus as VenueContactStatus,
      category: v.type || "",
    };
  });

  const contactable = nearbyVenues.filter((v) => v.email && v.status !== "bounced").length;
  const totalInArea = nearbyVenues.length;
  const uncontacted = nearbyVenues.filter((v) => v.email && v.status === "uncontacted").length;

  let viability: "strong" | "moderate" | "weak" = "weak";
  if (contactable >= 10) viability = "strong";
  else if (contactable >= 5) viability = "moderate";

  let recommendation = "";
  if (viability === "strong") {
    recommendation = `Strong cluster: ${uncontacted} uncontacted venues with email. Launch batch outreach to stack dates.`;
  } else if (viability === "moderate") {
    recommendation = `Moderate cluster: ${uncontacted} uncontacted venues. Research more venues to strengthen the cluster.`;
  } else {
    recommendation = `Weak cluster: only ${contactable} contactable venues. Deep research needed before committing to travel.`;
  }

  return { nearbyVenues, clusterViability: viability, contactable, totalInArea, recommendation };
}
