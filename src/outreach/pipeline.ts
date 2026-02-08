/**
 * Outreach Pipeline — Funnel data for dashboard and agents
 *
 * Provides structured queries over tracking.json + SurrealDB.
 * Used by: morning-check, alessio-os API, CLI scripts.
 */

import * as fs from 'fs';
import * as path from 'path';

const TRACKING_FILE = path.join(process.cwd(), 'content/outreach/tracking.json');
const GENERATED_DIR = path.join(process.cwd(), 'content/outreach/generated');

export interface TrackingEntry {
  id: string;
  venue: string;
  to: string;
  status: string;
  sentAt: string;
  timestamp: string;
  followUpDue?: string;
  bounced?: boolean;
  replyReceived?: boolean;
  replyType?: string;
  followUpSent?: boolean;
  video?: string;
  strategy?: string;
  country?: string;
}

export interface PipelineStats {
  total: number;
  sent: number;
  bounced: number;
  delivered: number;
  replied: number;
  autoReplied: number;
  awaitingReply: number;
  followUpSent: number;
  followUpDue: number;
  responseRate: number;
}

export interface FunnelByDimension {
  dimension: string;
  sent: number;
  replied: number;
  rate: number;
}

/**
 * Load tracking data, enriched with email metadata.
 */
export function loadTracking(): TrackingEntry[] {
  if (!fs.existsSync(TRACKING_FILE)) return [];
  const raw: TrackingEntry[] = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
  return enrichTracking(raw);
}

/**
 * Pipeline funnel stats.
 */
export function getPipelineStats(tracking?: TrackingEntry[]): PipelineStats {
  const t = tracking ?? loadTracking();
  const sent = t.filter(e => e.status === 'sent' || e.status === 'bounced');
  const bounced = t.filter(e => e.bounced);
  const delivered = sent.filter(e => !e.bounced);
  const replied = t.filter(e => e.replyReceived && e.replyType === 'human_reply');
  const autoReplied = t.filter(e => e.replyReceived && e.replyType === 'auto_reply');
  const followUpSent = t.filter(e => e.followUpSent);

  const now = new Date();
  const followUpDue = t.filter(e => {
    if (e.bounced || e.replyReceived || e.followUpSent) return false;
    if (!e.sentAt && !e.timestamp) return false;
    const days = Math.floor((now.getTime() - new Date(e.sentAt || e.timestamp).getTime()) / 86400000);
    return days >= 7;
  });

  return {
    total: t.length,
    sent: sent.length,
    bounced: bounced.length,
    delivered: delivered.length,
    replied: replied.length,
    autoReplied: autoReplied.length,
    awaitingReply: delivered.length - replied.length - autoReplied.length,
    followUpSent: followUpSent.length,
    followUpDue: followUpDue.length,
    responseRate: delivered.length > 0 ? (replied.length / delivered.length) * 100 : 0,
  };
}

/**
 * Funnel breakdown by a dimension (video, country, strategy).
 */
export function getFunnelBy(dimension: 'video' | 'country' | 'strategy', tracking?: TrackingEntry[]): FunnelByDimension[] {
  const t = tracking ?? loadTracking();
  const sent = t.filter(e => e.status === 'sent' || e.status === 'bounced');

  const groups: Record<string, { sent: number; replied: number }> = {};

  for (const entry of sent) {
    const key = (entry[dimension] || 'Unknown') as string;
    if (!groups[key]) groups[key] = { sent: 0, replied: 0 };
    groups[key].sent++;
    if (entry.replyReceived && entry.replyType === 'human_reply') {
      groups[key].replied++;
    }
  }

  return Object.entries(groups)
    .map(([dim, data]) => ({
      dimension: dim,
      sent: data.sent,
      replied: data.replied,
      rate: data.sent > 0 ? (data.replied / data.sent) * 100 : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
}

/**
 * Venues overdue for follow-up (sent > 7 days, no reply, no FU).
 */
export function getOverdueFollowUps(tracking?: TrackingEntry[]): TrackingEntry[] {
  const t = tracking ?? loadTracking();
  const now = new Date();

  return t.filter(e => {
    if (e.bounced || e.replyReceived || e.followUpSent) return false;
    if (e.status !== 'sent') return false;
    const sentDate = new Date(e.sentAt || e.timestamp);
    const days = Math.floor((now.getTime() - sentDate.getTime()) / 86400000);
    return days >= 7;
  }).sort((a, b) => {
    const da = new Date(a.sentAt || a.timestamp).getTime();
    const db = new Date(b.sentAt || b.timestamp).getTime();
    return da - db; // oldest first
  });
}

/**
 * Enrich tracking with video/country/strategy from generated email files.
 */
function enrichTracking(tracking: TrackingEntry[]): TrackingEntry[] {
  const emailLookup: Record<string, { video: string; country: string; strategy: string }> = {};

  try {
    const files = fs.readdirSync(GENERATED_DIR).filter(f =>
      f.endsWith('.json') && !f.includes('result') && !f.includes('temp')
    );
    for (const file of files) {
      try {
        const emails = JSON.parse(fs.readFileSync(path.join(GENERATED_DIR, file), 'utf-8'));
        if (!Array.isArray(emails)) continue;
        for (const e of emails) {
          if (e.to && (e.video || e.country || e.strategy)) {
            emailLookup[e.to.toLowerCase()] = {
              video: e.video || '',
              country: e.country || '',
              strategy: e.strategy || '',
            };
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* dir doesn't exist */ }

  return tracking.map(t => {
    if ((!t.video || !t.country) && t.to) {
      const meta = emailLookup[t.to.toLowerCase()];
      if (meta) {
        return {
          ...t,
          video: t.video || meta.video,
          country: t.country || meta.country,
          strategy: t.strategy || meta.strategy,
        };
      }
    }
    return t;
  });
}
