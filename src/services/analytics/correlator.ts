/**
 * Analytics — Cross-platform Correlator (Drizzle)
 *
 * Links outreach events (email sent) to observable signals across YouTube,
 * Instagram, and the EPK site within a 3-day window.
 *
 * Pattern: email sent → YT external views spike → EPK visit → reply
 *
 * Correlations are stored as memory_link rows with signalType='correlation'.
 *
 * Migrated from: SurrealDB analytics_correlation table
 * Changes:
 *   - SurrealDB → Drizzle memoryLink insert/select
 *   - tenantId param added throughout
 *   - console.log → createLogger()
 */

import { db } from "../../db/client.js";
import { memoryLink, email, audienceSnapshot, ytAnalyticsSnapshot } from "../../db/schema.js";
import { eq, and, gte, lte, desc, like } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";
import type {
  CorrelationEvent,
  CorrelationSignal,
  DailyDigest,
} from "../../types/analytics.js";

const log = createLogger("analytics-correlator");

// ── Constants ─────────────────────────────────────────────────

/** How many days to look for signals after an email was sent */
const CORRELATION_WINDOW_DAYS = 3;

/** Minimum YT external-view spike to flag as signal */
const YT_EXTERNAL_VIEW_THRESHOLD = 3;

/** Minimum IG profile-view spike to flag as signal */
const IG_PROFILE_VIEW_THRESHOLD = 5;

// ── Write helpers ─────────────────────────────────────────────

/**
 * Persist a correlation event as a memory_link record.
 * Returns the generated id.
 */
export async function saveCorrelationEvent(
  tenantId: string,
  event: CorrelationEvent
): Promise<string> {
  const rows = await db
    .insert(memoryLink)
    .values({
      tenantId,
      fromDept: "analytics",
      toEntity: event.trigger?.targetVenue
        ? `venue:${event.trigger.targetVenue.toLowerCase().replace(/\s+/g, "_")}`
        : "analytics:correlation",
      content: JSON.stringify(event),
      sigma: "σ₁",
      signalType: "correlation",
    })
    .returning({ id: memoryLink.id });

  const id = rows[0]?.id;
  log.info("correlation event saved", {
    tenantId,
    id,
    confidence: event.confidence,
    outcome: event.outcome,
  });
  return id;
}

// ── Detection logic ───────────────────────────────────────────

/**
 * Build a daily digest: pull signals for a specific date from stored snapshots.
 */
export async function buildDailyDigest(
  tenantId: string,
  date: string
): Promise<DailyDigest> {
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  // Emails sent on this date
  const emailsSent = await db
    .select({ toAddress: email.toAddress, venueId: email.venueId })
    .from(email)
    .where(
      and(
        eq(email.tenantId, tenantId),
        gte(email.sentAt, dayStart),
        lte(email.sentAt, dayEnd)
      )
    );

  // Latest IG snapshot on or before this date
  const igSnap = await db
    .select()
    .from(audienceSnapshot)
    .where(
      and(
        eq(audienceSnapshot.tenantId, tenantId),
        eq(audienceSnapshot.platform, "instagram"),
        lte(audienceSnapshot.createdAt, dayEnd)
      )
    )
    .orderBy(desc(audienceSnapshot.createdAt))
    .limit(1);

  const igData = igSnap[0]
    ? {
        profileViews: (igSnap[0].data as any)?.profileViews28d ?? 0,
        websiteClicks: (igSnap[0].data as any)?.websiteClicks28d ?? 0,
        reach: igSnap[0].reach ?? 0,
        newFollowers: 0, // not tracked separately
      }
    : null;

  // Latest YT snapshot on or before this date
  const ytSnap = await db
    .select()
    .from(ytAnalyticsSnapshot)
    .where(
      and(
        eq(ytAnalyticsSnapshot.tenantId, tenantId),
        lte(ytAnalyticsSnapshot.createdAt, dayEnd)
      )
    )
    .orderBy(desc(ytAnalyticsSnapshot.createdAt))
    .limit(1);

  const ytRaw = ytSnap[0]?.data as any;
  const ytData = ytSnap[0]
    ? {
        totalViews: ytSnap[0].totalViews ?? 0,
        externalViews:
          ytRaw?.trafficSources
            ?.filter((s: any) => s.sourceType === "EXTERNAL")
            ?.reduce((sum: number, s: any) => sum + (s.views ?? 0), 0) ?? 0,
        channelPageViews: 0,
        topExternalSources:
          ytRaw?.trafficSources
            ?.filter((s: any) => s.sourceType === "EXTERNAL")
            ?.slice(0, 5)
            ?.map((s: any) => ({
              source: s.sourceDetail || s.sourceType,
              views: s.views ?? 0,
            })) ?? [],
      }
    : null;

  return {
    date,
    youtube: ytData,
    instagram: igData,
    epk: null, // Vercel analytics — manual CSV import only
    outreach: {
      emailsSent: emailsSent.length,
      recipients: emailsSent.map((e) => e.toAddress),
    },
  };
}

/**
 * Detect correlations over a date range using the 3-day window pattern.
 * For each email sent, checks if there are view/visit spikes within the window.
 */
export async function detectCorrelations(
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<CorrelationEvent[]> {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T23:59:59Z`);

  // Get all emails sent in the window
  const emails = await db
    .select({
      id: email.id,
      toAddress: email.toAddress,
      venueId: email.venueId,
      sentAt: email.sentAt,
      responseReceived: email.responseReceived,
      responseAt: email.responseAt,
    })
    .from(email)
    .where(
      and(
        eq(email.tenantId, tenantId),
        gte(email.sentAt, from),
        lte(email.sentAt, to)
      )
    )
    .orderBy(email.sentAt);

  const events: CorrelationEvent[] = [];

  for (const e of emails) {
    if (!e.sentAt) continue;

    const windowEnd = new Date(e.sentAt);
    windowEnd.setDate(windowEnd.getDate() + CORRELATION_WINDOW_DAYS);

    const signals: CorrelationSignal[] = [];

    // Check YT external views in window
    const ytSnaps = await db
      .select()
      .from(ytAnalyticsSnapshot)
      .where(
        and(
          eq(ytAnalyticsSnapshot.tenantId, tenantId),
          gte(ytAnalyticsSnapshot.createdAt, e.sentAt),
          lte(ytAnalyticsSnapshot.createdAt, windowEnd)
        )
      )
      .orderBy(ytAnalyticsSnapshot.createdAt)
      .limit(5);

    for (const snap of ytSnaps) {
      const raw = snap.data as any;
      const externalViews =
        raw?.trafficSources
          ?.filter((s: any) => s.sourceType === "EXTERNAL")
          ?.reduce((sum: number, s: any) => sum + (s.views ?? 0), 0) ?? 0;

      if (externalViews >= YT_EXTERNAL_VIEW_THRESHOLD) {
        signals.push({
          platform: "youtube",
          metric: "external_views",
          value: externalViews,
          detail: "External traffic spike after email send",
          timestamp: snap.createdAt?.toISOString() ?? e.sentAt.toISOString(),
        });
      }
    }

    // Check IG profile views in window
    const igSnaps = await db
      .select()
      .from(audienceSnapshot)
      .where(
        and(
          eq(audienceSnapshot.tenantId, tenantId),
          eq(audienceSnapshot.platform, "instagram"),
          gte(audienceSnapshot.createdAt, e.sentAt),
          lte(audienceSnapshot.createdAt, windowEnd)
        )
      )
      .orderBy(audienceSnapshot.createdAt)
      .limit(5);

    for (const snap of igSnaps) {
      const profileViews = (snap.data as any)?.profileViews28d ?? 0;
      if (profileViews >= IG_PROFILE_VIEW_THRESHOLD) {
        signals.push({
          platform: "instagram",
          metric: "profile_views",
          value: profileViews,
          detail: "Profile view spike after email send",
          timestamp: snap.createdAt?.toISOString() ?? e.sentAt.toISOString(),
        });
      }
    }

    if (signals.length === 0) continue;

    // Determine confidence
    let confidence: "high" | "medium" | "low" = "low";
    if (signals.length >= 3) confidence = "high";
    else if (signals.length >= 2) confidence = "medium";

    const event: CorrelationEvent = {
      date: e.sentAt.toISOString().split("T")[0],
      trigger: {
        type: "email",
        targetEmail: e.toAddress,
        sentAt: e.sentAt.toISOString(),
      },
      signals,
      confidence,
      outcome: e.responseReceived ? "reply" : "silence",
      detectedAt: new Date().toISOString(),
    };

    events.push(event);
    log.info("correlation detected", {
      tenantId,
      venue: e.toAddress,
      signalCount: signals.length,
      confidence,
    });
  }

  return events;
}

/**
 * Get previously saved correlation events from memory_link.
 */
export async function getSavedCorrelations(
  tenantId: string,
  limit: number = 50
): Promise<CorrelationEvent[]> {
  const rows = await db
    .select()
    .from(memoryLink)
    .where(
      and(
        eq(memoryLink.tenantId, tenantId),
        eq(memoryLink.signalType, "correlation")
      )
    )
    .orderBy(desc(memoryLink.createdAt))
    .limit(limit);

  return rows.map((r) => {
    try {
      return JSON.parse(r.content) as CorrelationEvent;
    } catch {
      return null;
    }
  }).filter((e): e is CorrelationEvent => e !== null);
}

/**
 * Detect and persist correlations for the last N days.
 */
export async function runCorrelationDetection(
  tenantId: string,
  days: number = 14
): Promise<CorrelationEvent[]> {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const events = await detectCorrelations(
    tenantId,
    fromDate.toISOString().split("T")[0],
    toDate.toISOString().split("T")[0]
  );

  for (const event of events) {
    await saveCorrelationEvent(tenantId, event);
  }

  log.info("correlation detection run complete", {
    tenantId,
    eventsFound: events.length,
    days,
  });

  return events;
}

// ── Barrel object ─────────────────────────────────────────────

export const correlator = {
  buildDailyDigest,
  detectCorrelations,
  saveCorrelationEvent,
  getSavedCorrelations,
  runCorrelationDetection,
};
