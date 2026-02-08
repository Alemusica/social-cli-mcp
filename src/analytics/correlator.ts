/**
 * Cross-Platform Correlator
 *
 * Links outreach events to observable signals across YouTube, Instagram, and EPK.
 *
 * The core insight: when you send a cold email on Day N, a booker evaluates you.
 * That leaves traces:
 *   1. YouTube: External views spike, channel page views, specific video watches
 *   2. Instagram: Profile views spike, website clicks
 *   3. EPK (8i8.art): Page views from unknown referrer
 *   4. Email: Reply 1-3 days later
 *
 * The correlator builds a daily digest from all sources, then scans for patterns.
 */

import { getDb } from '../db/client.js';
import type {
  CorrelationEvent,
  CorrelationSignal,
  DailyDigest,
  YouTubeChannelSnapshot,
  InstagramSnapshot,
  VercelAnalyticsImport,
} from './types.js';

// ═══════════════════════════════════════════════════════════════
// DAILY DIGEST BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build a daily digest for a specific date by querying SurrealDB snapshots.
 * All data must already be persisted — this reads, not fetches.
 */
export async function buildDailyDigest(date: string): Promise<DailyDigest> {
  const db = await getDb();

  // Query outreach emails sent on this date
  const [emailResults] = await db.query<any[]>(`
    SELECT to_address, ->sent_to->venue.name AS venue_names
    FROM email
    WHERE string::startsWith(string::from::datetime(sent_at), $date)
  `, { date });

  const emails = emailResults || [];
  const recipients = emails
    .flatMap((e: any) => e.venue_names || [])
    .filter(Boolean);

  // Query YouTube snapshot for this date
  const [ytResults] = await db.query<any[]>(`
    SELECT * FROM youtube_snapshot
    WHERE date = $date
    ORDER BY captured_at DESC
    LIMIT 1
  `, { date });
  const ytSnap = ytResults?.[0] || null;

  // Query Instagram snapshot nearest to this date
  const [igResults] = await db.query<any[]>(`
    SELECT * FROM audience_snapshot
    WHERE string::startsWith(string::from::datetime(captured_at), $date)
    ORDER BY captured_at DESC
    LIMIT 1
  `, { date });
  const igSnap = igResults?.[0] || null;

  // Query Vercel analytics import for this date
  const [epkResults] = await db.query<any[]>(`
    SELECT * FROM epk_analytics
    WHERE date = $date
    LIMIT 1
  `, { date });
  const epkSnap = epkResults?.[0] || null;

  return {
    date,
    youtube: ytSnap ? {
      totalViews: ytSnap.views_last_28d || 0,
      externalViews: (ytSnap.traffic_sources || [])
        .filter((s: any) => s.sourceType === 'EXTERNAL')
        .reduce((sum: number, s: any) => sum + (s.views || 0), 0),
      channelPageViews: (ytSnap.traffic_sources || [])
        .filter((s: any) => s.sourceType === 'YT_CHANNEL')
        .reduce((sum: number, s: any) => sum + (s.views || 0), 0),
      topExternalSources: (ytSnap.traffic_sources || [])
        .filter((s: any) => s.sourceType === 'EXTERNAL')
        .map((s: any) => ({ source: s.sourceDetail || 'unknown', views: s.views || 0 })),
    } : null,
    instagram: igSnap ? {
      profileViews: igSnap.profile_views_28d || 0,
      websiteClicks: igSnap.website_clicks_28d || 0,
      reach: igSnap.reach_28d || 0,
      newFollowers: 0, // would need delta from previous snapshot
    } : null,
    epk: epkSnap ? {
      pageViews: epkSnap.page_views || 0,
      visitors: epkSnap.visitors || 0,
      topReferrers: epkSnap.top_referrers || [],
    } : null,
    outreach: {
      emailsSent: emails.length,
      recipients,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// CORRELATION DETECTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Scan a range of days for outreach→signal correlations.
 *
 * Logic:
 *   For each day with emails sent, look at the same day + next 3 days
 *   for spikes in YouTube External views, Instagram profile views, EPK visits.
 *   If signals cluster, create a CorrelationEvent.
 */
export async function detectCorrelations(
  startDate: string,
  endDate: string,
): Promise<CorrelationEvent[]> {
  const correlations: CorrelationEvent[] = [];

  // Get all email send dates in range
  const db = await getDb();
  const [emailDays] = await db.query<any[]>(`
    SELECT
      string::slice(string::from::datetime(sent_at), 0, 10) AS send_date,
      array::group(to_address) AS recipients,
      array::group(->sent_to->venue.name) AS venues
    FROM email
    WHERE sent_at >= type::datetime($start) AND sent_at <= type::datetime($end)
    GROUP BY send_date
    ORDER BY send_date
  `, { start: startDate, end: endDate });

  for (const day of emailDays || []) {
    const sendDate = day.send_date;
    const signals: CorrelationSignal[] = [];

    // Check signals on send day + next 3 days
    for (let offset = 0; offset <= 3; offset++) {
      const checkDate = addDays(sendDate, offset);
      const digest = await buildDailyDigest(checkDate);

      // YouTube external views
      if (digest.youtube && digest.youtube.externalViews > 0) {
        signals.push({
          platform: 'youtube',
          metric: 'external_views',
          value: digest.youtube.externalViews,
          detail: digest.youtube.topExternalSources
            .map(s => `${s.source}: ${s.views}`)
            .join(', '),
          timestamp: checkDate,
        });
      }

      // YouTube channel page views
      if (digest.youtube && digest.youtube.channelPageViews > 0) {
        signals.push({
          platform: 'youtube',
          metric: 'channel_page_views',
          value: digest.youtube.channelPageViews,
          timestamp: checkDate,
        });
      }

      // Instagram profile views (only meaningful as delta, but log absolute for now)
      if (digest.instagram && digest.instagram.profileViews > 0) {
        signals.push({
          platform: 'instagram',
          metric: 'profile_views',
          value: digest.instagram.profileViews,
          timestamp: checkDate,
        });
      }

      // Instagram website clicks
      if (digest.instagram && digest.instagram.websiteClicks > 0) {
        signals.push({
          platform: 'instagram',
          metric: 'website_clicks',
          value: digest.instagram.websiteClicks,
          timestamp: checkDate,
        });
      }

      // EPK page views
      if (digest.epk && digest.epk.pageViews > 0) {
        signals.push({
          platform: 'epk',
          metric: 'page_views',
          value: digest.epk.pageViews,
          detail: digest.epk.topReferrers
            .map(r => `${r.source}: ${r.visits}`)
            .join(', '),
          timestamp: checkDate,
        });
      }
    }

    // Check if any reply came within 7 days
    const [replies] = await db.query<any[]>(`
      SELECT to_address, response_at, response_sentiment
      FROM email
      WHERE response_received = true
        AND sent_at >= type::datetime($start)
        AND sent_at <= type::datetime($end)
    `, { start: sendDate, end: addDays(sendDate, 7) });

    const hasReply = (replies || []).length > 0;

    if (signals.length > 0) {
      const confidence = calculateConfidence(signals, hasReply);

      correlations.push({
        date: sendDate,
        trigger: {
          type: 'email',
          targetVenue: (day.venues || []).flat().join(', '),
          sentAt: sendDate,
        },
        signals,
        confidence,
        outcome: hasReply ? 'reply' : 'silence',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return correlations;
}

/**
 * Quick check: did anyone look at our stuff in the last N days?
 * Returns a summary of cross-platform activity signals.
 */
export async function getRecentActivity(days: number = 7): Promise<{
  totalSignals: number;
  byPlatform: Record<string, number>;
  hotDays: string[];
  summary: string;
}> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = addDays(endDate, -days);

  const correlations = await detectCorrelations(startDate, endDate);

  const byPlatform: Record<string, number> = {};
  const daySignalCount: Record<string, number> = {};

  for (const corr of correlations) {
    for (const sig of corr.signals) {
      byPlatform[sig.platform] = (byPlatform[sig.platform] || 0) + sig.value;
      daySignalCount[corr.date] = (daySignalCount[corr.date] || 0) + 1;
    }
  }

  // Hot days = days with 3+ distinct signals
  const hotDays = Object.entries(daySignalCount)
    .filter(([_, count]) => count >= 3)
    .map(([date]) => date)
    .sort();

  const totalSignals = Object.values(byPlatform).reduce((a, b) => a + b, 0);

  let summary = `${totalSignals} signals across ${Object.keys(byPlatform).length} platforms in last ${days} days.`;
  if (hotDays.length > 0) {
    summary += ` Hot days: ${hotDays.join(', ')}. Likely booker evaluation activity.`;
  }

  return { totalSignals, byPlatform, hotDays, summary };
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE (save correlations to SurrealDB)
// ═══════════════════════════════════════════════════════════════

export async function saveCorrelation(event: CorrelationEvent): Promise<void> {
  const db = await getDb();
  const id = `correlation_${event.date.replace(/-/g, '_')}`;

  await db.query(`
    UPSERT type::thing("analytics_correlation", $id) SET
      date = $date,
      trigger_info = $trigger,
      signals = $signals,
      confidence = $confidence,
      outcome = $outcome,
      notes = $notes,
      detected_at = type::datetime($detectedAt)
  `, {
    id,
    date: event.date,
    trigger: event.trigger,
    signals: event.signals,
    confidence: event.confidence,
    outcome: event.outcome,
    notes: event.notes,
    detectedAt: event.detectedAt,
  });
}

export async function saveAllCorrelations(events: CorrelationEvent[]): Promise<number> {
  let saved = 0;
  for (const event of events) {
    await saveCorrelation(event);
    saved++;
  }
  return saved;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calculateConfidence(
  signals: CorrelationSignal[],
  hasReply: boolean,
): 'high' | 'medium' | 'low' {
  const platforms = new Set(signals.map(s => s.platform));
  const hasExternalYT = signals.some(s => s.metric === 'external_views');
  const hasEPK = signals.some(s => s.platform === 'epk');

  // High: reply + external YouTube views or EPK visit
  if (hasReply && (hasExternalYT || hasEPK)) return 'high';

  // High: 3+ platforms showing signals
  if (platforms.size >= 3) return 'high';

  // Medium: external YT + at least one other signal
  if (hasExternalYT && platforms.size >= 2) return 'medium';

  // Medium: EPK visit
  if (hasEPK) return 'medium';

  // Low: single platform signals only
  return 'low';
}

// ═══════════════════════════════════════════════════════════════
// EXPORT NAMESPACE
// ═══════════════════════════════════════════════════════════════

export const correlator = {
  buildDailyDigest,
  detectCorrelations,
  getRecentActivity,
  saveCorrelation,
  saveAllCorrelations,
};
