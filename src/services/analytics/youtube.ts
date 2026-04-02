/**
 * Analytics — YouTube DB write layer (Drizzle)
 *
 * Persists YouTube channel snapshots and per-video country data to Postgres.
 *
 * Migrated from: SurrealDB yt_analytics_snapshot + yt_video_country tables
 * Changes:
 *   - SurrealDB CREATE/SELECT → Drizzle insert/select
 *   - tenantId param added throughout
 *   - console.log → createLogger()
 */

import { db } from "../../db/client.js";
import { ytAnalyticsSnapshot, ytVideoCountry } from "../../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { createLogger } from "../../lib/logger.js";
import type {
  YouTubeChannelSnapshot,
  YouTubeGeoView,
  YouTubeVideoSnapshot,
} from "../../analytics/types.js";

const log = createLogger("analytics-youtube");

// ── Types ────────────────────────────────────────────────────

export interface YouTubeSnapshotRecord {
  id: string;
  tenantId: string;
  subscribers: number | null;
  totalViews: number | null;
  videoCount: number | null;
  data: YouTubeChannelSnapshot | null;
  createdAt: Date;
}

export interface VideoCountryRecord {
  id: string;
  tenantId: string;
  videoId: string;
  videoTitle: string | null;
  country: string;
  views: number;
  watchTimeMinutes: number;
  snapshotId: string | null;
  createdAt: Date;
}

// ── Write helpers ─────────────────────────────────────────────

/**
 * Save a full YouTube channel snapshot.
 * Returns the generated snapshot id.
 */
export async function saveYouTubeSnapshot(
  tenantId: string,
  snapshot: YouTubeChannelSnapshot
): Promise<string> {
  const rows = await db
    .insert(ytAnalyticsSnapshot)
    .values({
      tenantId,
      subscribers: snapshot.totalSubscribers ?? null,
      totalViews: snapshot.totalViews ?? null,
      videoCount: snapshot.totalVideos ?? null,
      data: snapshot as unknown as Record<string, unknown>,
    })
    .returning({ id: ytAnalyticsSnapshot.id });

  const id = rows[0]?.id;
  log.info("yt snapshot saved", {
    tenantId,
    subscribers: snapshot.totalSubscribers,
    id,
  });
  return id;
}

/**
 * Save per-video country data linked to a snapshot.
 */
export async function saveVideoCountryData(
  tenantId: string,
  snapshotId: string,
  videos: Array<{
    videoId: string;
    videoTitle?: string;
    countries: YouTubeGeoView[];
  }>
): Promise<void> {
  if (videos.length === 0) return;

  const rows = videos.flatMap(({ videoId, videoTitle, countries }) =>
    countries.map((c) => ({
      tenantId,
      videoId,
      videoTitle: videoTitle ?? null,
      country: c.country,
      views: c.views ?? 0,
      watchTimeMinutes: c.watchTimeMinutes ?? 0,
      snapshotId,
    }))
  );

  await db.insert(ytVideoCountry).values(rows);
  log.info("yt video country data saved", {
    tenantId,
    snapshotId,
    rowCount: rows.length,
  });
}

// ── Read helpers ──────────────────────────────────────────────

/**
 * Get the most recent YouTube snapshot for a tenant.
 */
export async function getLatestYouTubeSnapshot(
  tenantId: string
): Promise<YouTubeSnapshotRecord | null> {
  const rows = await db
    .select()
    .from(ytAnalyticsSnapshot)
    .where(eq(ytAnalyticsSnapshot.tenantId, tenantId))
    .orderBy(desc(ytAnalyticsSnapshot.createdAt))
    .limit(1);

  if (!rows[0]) return null;
  return toSnapshotRecord(rows[0]);
}

/**
 * Get video-country rows for a specific snapshot.
 */
export async function getVideoCountriesForSnapshot(
  tenantId: string,
  snapshotId: string
): Promise<VideoCountryRecord[]> {
  const rows = await db
    .select()
    .from(ytVideoCountry)
    .where(
      and(
        eq(ytVideoCountry.tenantId, tenantId),
        eq(ytVideoCountry.snapshotId, snapshotId)
      )
    )
    .orderBy(desc(ytVideoCountry.views));

  return rows.map(toCountryRecord);
}

/**
 * Get all country data for a specific video across all snapshots.
 */
export async function getVideoCountriesByVideoId(
  tenantId: string,
  videoId: string
): Promise<VideoCountryRecord[]> {
  const rows = await db
    .select()
    .from(ytVideoCountry)
    .where(
      and(
        eq(ytVideoCountry.tenantId, tenantId),
        eq(ytVideoCountry.videoId, videoId)
      )
    )
    .orderBy(desc(ytVideoCountry.createdAt));

  return rows.map(toCountryRecord);
}

/**
 * Get subscriber growth between two snapshots.
 */
export async function getSubscriberHistory(
  tenantId: string,
  limit: number = 10
): Promise<Array<{ id: string; subscribers: number | null; createdAt: Date }>> {
  const rows = await db
    .select({
      id: ytAnalyticsSnapshot.id,
      subscribers: ytAnalyticsSnapshot.subscribers,
      createdAt: ytAnalyticsSnapshot.createdAt,
    })
    .from(ytAnalyticsSnapshot)
    .where(eq(ytAnalyticsSnapshot.tenantId, tenantId))
    .orderBy(desc(ytAnalyticsSnapshot.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    subscribers: r.subscribers,
    createdAt: r.createdAt ?? new Date(),
  }));
}

// ── Internal ──────────────────────────────────────────────────

function toSnapshotRecord(
  row: typeof ytAnalyticsSnapshot.$inferSelect
): YouTubeSnapshotRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    subscribers: row.subscribers,
    totalViews: row.totalViews,
    videoCount: row.videoCount,
    data: (row.data as YouTubeChannelSnapshot) ?? null,
    createdAt: row.createdAt ?? new Date(),
  };
}

function toCountryRecord(
  row: typeof ytVideoCountry.$inferSelect
): VideoCountryRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    videoId: row.videoId,
    videoTitle: row.videoTitle,
    country: row.country,
    views: row.views ?? 0,
    watchTimeMinutes: row.watchTimeMinutes ?? 0,
    snapshotId: row.snapshotId,
    createdAt: row.createdAt ?? new Date(),
  };
}

// ── Barrel object ─────────────────────────────────────────────

export const youtubeAnalytics = {
  saveSnapshot: saveYouTubeSnapshot,
  saveVideoCountryData,
  getLatestSnapshot: getLatestYouTubeSnapshot,
  getVideoCountriesForSnapshot,
  getVideoCountriesByVideoId,
  getSubscriberHistory,
};
