/**
 * Analytics — Instagram DB write layer (Drizzle)
 *
 * Persists Instagram audience snapshots to Postgres for historical tracking.
 * Every API call becomes an immutable point-in-time record.
 *
 * Migrated from: src/core/insights-archiver.ts
 * Changes:
 *   - SurrealDB CREATE/SELECT → Drizzle insert/select
 *   - tenantId param added throughout
 *   - console.log/error → createLogger()
 */

import { db } from "../../db/client.js";
import { audienceSnapshot } from "../../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("analytics-instagram");

// ── Types ────────────────────────────────────────────────────

export interface AudienceSnapshotData {
  followers: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  /** Full raw API payload + demographics */
  data?: {
    username?: string;
    following?: number;
    postsCount?: number;
    reach28d?: number;
    profileViews28d?: number;
    websiteClicks28d?: number;
    topCountries?: { country: string; count: number }[];
    topCities?: { city: string; count: number }[];
    ageGender?: { ageRange: string; male: number; female: number }[];
    [key: string]: unknown;
  };
}

export interface AudienceSnapshotRecord extends AudienceSnapshotData {
  id: string;
  tenantId: string;
  platform: "instagram";
  createdAt: Date;
}

export interface InsightsEvolution {
  periodDays: number;
  snapshots: AudienceSnapshotRecord[];
  changes: {
    followersChange: number;
    followersChangePct: number;
    reachChange?: number;
  };
  insights: string[];
}

// ── Write helpers ─────────────────────────────────────────────

/**
 * Persist an audience snapshot.
 * Returns the generated record id.
 */
export async function saveAudienceSnapshot(
  tenantId: string,
  data: AudienceSnapshotData
): Promise<string> {
  const rows = await db
    .insert(audienceSnapshot)
    .values({
      tenantId,
      platform: "instagram",
      followers: data.followers,
      reach: data.reach ?? null,
      impressions: data.impressions ?? null,
      engagement: data.engagement ?? null,
      data: data.data ?? null,
    })
    .returning({ id: audienceSnapshot.id });

  const id = rows[0]?.id;
  log.info("audience snapshot saved", {
    tenantId,
    followers: data.followers,
    id,
  });
  return id;
}

// ── Read helpers ──────────────────────────────────────────────

/**
 * Get the most recent Instagram snapshot for a tenant.
 */
export async function getLatestAudience(
  tenantId: string
): Promise<AudienceSnapshotRecord | null> {
  const rows = await db
    .select()
    .from(audienceSnapshot)
    .where(
      and(
        eq(audienceSnapshot.tenantId, tenantId),
        eq(audienceSnapshot.platform, "instagram")
      )
    )
    .orderBy(desc(audienceSnapshot.createdAt))
    .limit(1);

  if (!rows[0]) return null;
  return toRecord(rows[0]);
}

/**
 * Get audience snapshots for the last N days.
 */
export async function getAudienceHistory(
  tenantId: string,
  days: number = 30
): Promise<AudienceSnapshotRecord[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const rows = await db
    .select()
    .from(audienceSnapshot)
    .where(
      and(
        eq(audienceSnapshot.tenantId, tenantId),
        eq(audienceSnapshot.platform, "instagram"),
        gte(audienceSnapshot.createdAt, cutoff)
      )
    )
    .orderBy(audienceSnapshot.createdAt);

  return rows.map(toRecord);
}

/**
 * Calculate evolution over the last N days.
 */
export async function getAudienceEvolution(
  tenantId: string,
  days: number = 30
): Promise<InsightsEvolution | null> {
  const snapshots = await getAudienceHistory(tenantId, days);
  if (snapshots.length === 0) return null;

  const oldest = snapshots[0];
  const latest = snapshots[snapshots.length - 1];

  const followersChange = (latest.followers ?? 0) - (oldest.followers ?? 0);
  const followersChangePct =
    (oldest.followers ?? 0) > 0
      ? (followersChange / (oldest.followers ?? 1)) * 100
      : 0;

  const insights: string[] = [];

  if (followersChangePct > 5) {
    insights.push(
      `Strong growth: +${followersChange} followers (+${followersChangePct.toFixed(1)}%)`
    );
  } else if (followersChangePct < -2) {
    insights.push(
      `Follower decline: ${followersChange} (${followersChangePct.toFixed(1)}%)`
    );
  } else {
    insights.push(
      `Stable: ${followersChange > 0 ? "+" : ""}${followersChange} followers`
    );
  }

  const latestData = (latest.data as any) || {};
  if (latestData.topCountries?.length >= 2) {
    const italians =
      latestData.topCountries.find((c: any) => c.country === "IT")?.count || 0;
    const greeks =
      latestData.topCountries.find((c: any) => c.country === "GR")?.count || 0;
    const corridorPct =
      latest.followers && latest.followers > 0
        ? ((italians + greeks) / latest.followers) * 100
        : 0;
    if (corridorPct > 60) {
      insights.push(
        `IT↔GR corridor strong: ${corridorPct.toFixed(0)}% of audience`
      );
    }
  }

  if (latestData.ageGender?.length > 0) {
    const primary = [...latestData.ageGender].sort(
      (a: any, b: any) => b.male + b.female - (a.male + a.female)
    )[0];
    insights.push(`Primary age group: ${primary.ageRange}`);
  }

  return {
    periodDays: days,
    snapshots,
    changes: {
      followersChange,
      followersChangePct,
      reachChange: (latest.reach ?? 0) - (oldest.reach ?? 0),
    },
    insights,
  };
}

/**
 * Check if a fresh snapshot is needed.
 */
export async function needsFreshInsights(
  tenantId: string,
  maxAgeHours: number = 24
): Promise<boolean> {
  const latest = await getLatestAudience(tenantId);
  if (!latest) return true;
  const hoursSince =
    (Date.now() - latest.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSince > maxAgeHours;
}

/**
 * IT↔GR corridor analysis from latest snapshot.
 */
export async function getCorridorAnalysis(tenantId: string): Promise<{
  italians: number;
  greeks: number;
  corridorPct: number;
  otherCountries: { country: string; count: number }[];
  insight: string;
} | null> {
  const latest = await getLatestAudience(tenantId);
  if (!latest) return null;

  const topCountries =
    ((latest.data as any)?.topCountries as { country: string; count: number }[]) || [];
  const italians = topCountries.find((c) => c.country === "IT")?.count || 0;
  const greeks = topCountries.find((c) => c.country === "GR")?.count || 0;
  const total = latest.followers ?? 0;
  const corridorPct = total > 0 ? ((italians + greeks) / total) * 100 : 0;

  const otherCountries = topCountries.filter(
    (c) => c.country !== "IT" && c.country !== "GR"
  );

  let insight =
    corridorPct > 70
      ? "IT↔GR corridor very strong — bridge content will have maximum impact."
      : corridorPct > 50
        ? "Good IT↔GR base — keep cultivating the cultural bridge."
        : "Diversified audience — consider strengthening IT↔GR corridor.";

  return { italians, greeks, corridorPct, otherCountries, insight };
}

// ── Internal ──────────────────────────────────────────────────

function toRecord(
  row: typeof audienceSnapshot.$inferSelect
): AudienceSnapshotRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    platform: "instagram" as const,
    followers: row.followers ?? 0,
    reach: row.reach ?? undefined,
    impressions: row.impressions ?? undefined,
    engagement: row.engagement ?? undefined,
    data: (row.data as any) ?? undefined,
    createdAt: row.createdAt ?? new Date(),
  };
}

// ── Barrel object ─────────────────────────────────────────────

export const instagramAnalytics = {
  saveSnapshot: saveAudienceSnapshot,
  getLatest: getLatestAudience,
  getHistory: getAudienceHistory,
  getEvolution: getAudienceEvolution,
  needsFresh: needsFreshInsights,
  getCorridorAnalysis,
};
