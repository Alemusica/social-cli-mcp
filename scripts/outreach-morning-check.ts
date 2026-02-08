#!/usr/bin/env npx tsx
/**
 * FLUTUR OUTREACH — Morning Intelligence Check
 *
 * Runs daily (via launchd). Does:
 * 1. Gmail API inbox scan for venue replies
 * 2. Classifies replies (human/auto/bounce)
 * 3. Persists to outreach_reply + outreach_snapshot (SurrealDB)
 * 4. Deduplicates by Gmail Message-ID (safe to re-run)
 * 5. Sends Telegram digest with actionable items
 *
 * Manual: npx tsx scripts/outreach-morning-check.ts [daysBack] [--silent]
 * Silent: npx tsx scripts/outreach-morning-check.ts --silent
 */

import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import { loadSecretsToEnv } from '../src/keychain.js';
import * as dotenv from 'dotenv';
import {
  scanOutreachReplies,
  classifyReply,
  persistReply,
  type GmailMessage,
  type InboxScanResult,
} from '../src/clients/gmail-reader.js';
import { getDb, closeDb } from '../src/db/client.js';
import {
  routeReplyEvent,
  formatBriefingForConsole,
  formatBriefingForTelegram,
  type IntelligenceBriefing,
} from '../src/agents/intelligence-router.js';

loadSecretsToEnv();
dotenv.config();

// ── Types ──

interface TrackingEntry {
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

interface OutreachPattern {
  totalSent: number;
  totalDelivered: number;
  humanReplies: number;
  autoReplies: number;
  bounces: number;
  responseRate: number;
  byVideo: Record<string, { sent: number; replied: number; rate: number }>;
  byCountry: Record<string, { sent: number; replied: number; rate: number }>;
  byStrategy: Record<string, { sent: number; replied: number; rate: number }>;
  insights: string[];
}

// ── Enrich tracking with email metadata ──

function enrichTracking(tracking: TrackingEntry[]): TrackingEntry[] {
  const emailLookup: Record<string, { video: string; country: string; strategy: string }> = {};
  const generatedDir = 'content/outreach/generated';

  try {
    const files = fs.readdirSync(generatedDir).filter(f =>
      f.endsWith('.json') && !f.includes('result') && !f.includes('temp')
    );

    for (const file of files) {
      try {
        const emails = JSON.parse(fs.readFileSync(`${generatedDir}/${file}`, 'utf-8'));
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
      } catch { /* skip non-email files */ }
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

// ── Video name extraction ──

function extractVideoName(videoUrl: string): string {
  if (!videoUrl) return 'Unknown';
  if (videoUrl.includes('vH-M')) return 'Chase The Sun';
  if (videoUrl.includes('Ba8H')) return 'Father Ocean';
  if (videoUrl.includes('I-lp')) return 'Efthymia';
  if (videoUrl.includes('q1mT')) return 'Transcendence';
  if (videoUrl.includes('oKDv')) return 'Who Is Flutur';
  if (videoUrl.includes('GGT') || videoUrl.includes('greeks-got-talent')) return 'GGT';
  return 'Other';
}

// ── Pattern Analysis ──

function analyzePatterns(tracking: TrackingEntry[], replies: GmailMessage[], classifiedTypes: Map<string, string>): OutreachPattern {
  const repliedDomains = new Set(
    replies.filter(r => classifiedTypes.get(r.messageId) === 'human_reply').map(r => r.fromDomain)
  );
  const bouncedDomains = new Set(
    replies.filter(r => classifiedTypes.get(r.messageId) === 'bounce').map(r => r.fromDomain)
  );

  const sent = tracking.filter(t => t.status === 'sent');
  const delivered = sent.filter(t => {
    const domain = t.to?.split('@')[1]?.toLowerCase();
    return domain && !bouncedDomains.has(domain) && !t.bounced;
  });

  const byVideo: Record<string, { sent: number; replied: number }> = {};
  const byCountry: Record<string, { sent: number; replied: number }> = {};
  const byStrategy: Record<string, { sent: number; replied: number }> = {};

  for (const t of sent) {
    const domain = t.to?.split('@')[1]?.toLowerCase();
    const replied = domain ? repliedDomains.has(domain) : false;

    const video = extractVideoName(t.video || '');
    if (video) {
      if (!byVideo[video]) byVideo[video] = { sent: 0, replied: 0 };
      byVideo[video].sent++;
      if (replied) byVideo[video].replied++;
    }

    const country = t.country || 'Unknown';
    if (!byCountry[country]) byCountry[country] = { sent: 0, replied: 0 };
    byCountry[country].sent++;
    if (replied) byCountry[country].replied++;

    const strategy = t.strategy || 'Unknown';
    if (!byStrategy[strategy]) byStrategy[strategy] = { sent: 0, replied: 0 };
    byStrategy[strategy].sent++;
    if (replied) byStrategy[strategy].replied++;
  }

  const humanReplies = replies.filter(r => classifiedTypes.get(r.messageId) === 'human_reply').length;
  const autoReplies = replies.filter(r => classifiedTypes.get(r.messageId) === 'auto_reply').length;
  const bounces = replies.filter(r => classifiedTypes.get(r.messageId) === 'bounce').length;
  const responseRate = delivered.length > 0 ? (humanReplies / delivered.length) * 100 : 0;

  const insights: string[] = [];

  const videoWithRates = Object.entries(byVideo)
    .map(([v, d]) => ({ video: v, ...d, rate: d.sent > 0 ? (d.replied / d.sent) * 100 : 0 }))
    .sort((a, b) => b.rate - a.rate);

  if (videoWithRates.length > 0) {
    const best = videoWithRates[0];
    if (best.rate > 0) insights.push(`Best video: ${best.video} (${best.rate.toFixed(0)}% reply rate, ${best.sent} sent)`);
    const worst = videoWithRates[videoWithRates.length - 1];
    if (worst.sent >= 5 && worst.rate === 0) insights.push(`${worst.video}: 0% reply rate on ${worst.sent} emails — consider swapping`);
  }

  const countryWithRates = Object.entries(byCountry)
    .map(([c, d]) => ({ country: c, ...d, rate: d.sent > 0 ? (d.replied / d.sent) * 100 : 0 }))
    .sort((a, b) => b.rate - a.rate);

  if (countryWithRates.length > 0) {
    const best = countryWithRates[0];
    if (best.rate > 0) insights.push(`Best country: ${best.country} (${best.rate.toFixed(0)}% reply, ${best.sent} sent)`);
  }

  const addRate = (d: Record<string, { sent: number; replied: number }>) =>
    Object.fromEntries(
      Object.entries(d).map(([k, v]) => [k, { ...v, rate: v.sent > 0 ? (v.replied / v.sent) * 100 : 0 }])
    );

  return {
    totalSent: sent.length,
    totalDelivered: delivered.length,
    humanReplies,
    autoReplies,
    bounces,
    responseRate,
    byVideo: addRate(byVideo),
    byCountry: addRate(byCountry),
    byStrategy: addRate(byStrategy),
    insights,
  };
}

// ── Save snapshot to SurrealDB ──

async function saveSnapshotToDB(patterns: OutreachPattern) {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const id = `outreach_snapshot_${today.replace(/-/g, '_')}`;

  await db.query(`DELETE FROM outreach_snapshot WHERE id = type::thing("outreach_snapshot", $id)`, { id });
  await db.query(`
    UPSERT type::thing("outreach_snapshot", $id) SET
      date = type::datetime($date),
      total_sent = $totalSent,
      total_delivered = $totalDelivered,
      human_replies = $humanReplies,
      auto_replies = $autoReplies,
      bounces = $bounces,
      response_rate = $responseRate,
      by_video = $byVideo,
      by_country = $byCountry,
      by_strategy = $byStrategy,
      insights = $insights,
      created_at = time::now()
  `, {
    id,
    date: `${today}T00:00:00Z`,
    totalSent: patterns.totalSent,
    totalDelivered: patterns.totalDelivered,
    humanReplies: patterns.humanReplies,
    autoReplies: patterns.autoReplies,
    bounces: patterns.bounces,
    responseRate: patterns.responseRate,
    byVideo: patterns.byVideo,
    byCountry: patterns.byCountry,
    byStrategy: patterns.byStrategy,
    insights: patterns.insights,
  });

  console.log(`  DB: Saved snapshot ${id}`);
}

// ── Telegram ──

function buildTelegramDigest(
  replies: GmailMessage[],
  classifiedTypes: Map<string, string>,
  patterns: OutreachPattern,
  tracking: TrackingEntry[],
  scanResult: InboxScanResult,
): string {
  const lines: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  lines.push(`🌅 *OUTREACH MORNING CHECK — ${today}*\n`);

  const human = replies.filter(r => classifiedTypes.get(r.messageId) === 'human_reply');
  const auto = replies.filter(r => classifiedTypes.get(r.messageId) === 'auto_reply');
  const bounces = replies.filter(r => classifiedTypes.get(r.messageId) === 'bounce');

  if (human.length > 0) {
    lines.push(`🎉 *NEW HUMAN REPLIES (${human.length}):*`);
    for (const r of human.slice(0, 5)) {
      const dateStr = r.date.toLocaleDateString('it-IT');
      lines.push(`  • *${r.fromDomain}* (${dateStr})`);
      lines.push(`    ${r.snippet.substring(0, 120).replace(/\n/g, ' ')}`);
    }
    if (human.length > 5) lines.push(`  ... +${human.length - 5} more`);
    lines.push('');
  }

  if (auto.length > 0) {
    lines.push(`📋 Auto-replies: ${auto.map(r => r.fromDomain).join(', ')}`);
    lines.push('');
  }

  if (bounces.length > 0) {
    lines.push(`⚠️ Bounces: ${bounces.length} new`);
    lines.push('');
  }

  // Dedup stats
  if (scanResult.duplicateCount > 0) {
    lines.push(`🔄 ${scanResult.duplicateCount} already persisted, ${scanResult.newCount} new`);
    lines.push('');
  }

  lines.push(`📊 *PIPELINE:*`);
  lines.push(`📧 ${patterns.totalSent} sent | ${patterns.totalDelivered} delivered`);
  lines.push(`💬 ${patterns.humanReplies} replies (${patterns.responseRate.toFixed(1)}%)`);
  lines.push(`🔄 ${patterns.autoReplies} auto | ❌ ${patterns.bounces} bounced`);

  // Overdue follow-ups
  const now = new Date();
  const overdue = tracking.filter(t => {
    if (t.status !== 'sent' || t.bounced || t.replyReceived || t.followUpSent) return false;
    const days = Math.floor((now.getTime() - new Date(t.sentAt || t.timestamp).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 7;
  });

  if (overdue.length > 0) {
    lines.push(`\n⏰ *${overdue.length} venues overdue for follow-up*`);
    for (const o of overdue.slice(0, 3)) {
      const days = Math.floor((now.getTime() - new Date(o.sentAt || o.timestamp).getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`  • ${o.venue} (${days}d)`);
    }
    if (overdue.length > 3) lines.push(`  ... +${overdue.length - 3} more`);
  }

  if (patterns.insights.length > 0) {
    lines.push(`\n💡 *INSIGHTS:*`);
    for (const i of patterns.insights) lines.push(`  • ${i}`);
  }

  return lines.join('\n');
}

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const userId = process.env.TELEGRAM_USER_ID;

  if (!token || !userId) {
    console.log('  Telegram: Skipped (no credentials)');
    return;
  }

  const bot = new Telegraf(token);
  try {
    if (message.length > 4000) {
      const parts = message.match(/[\s\S]{1,4000}/g) || [message];
      for (const part of parts) {
        await bot.telegram.sendMessage(userId, part, { parse_mode: 'Markdown' });
      }
    } else {
      await bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
    }
    console.log('  Telegram: Sent');
  } catch (err: any) {
    console.error(`  Telegram: Failed — ${err.message}`);
    try {
      await bot.telegram.sendMessage(userId, message.replace(/\*/g, ''));
      console.log('  Telegram: Sent (plain text fallback)');
    } catch { /* give up */ }
  }
}

// ── Main ──

async function main() {
  // Parse args: handle both `7` and `--silent` in any order
  const args = process.argv.slice(2);
  const silent = args.includes('--silent');
  const numArg = args.find(a => !a.startsWith('--'));
  const daysBack = numArg ? parseInt(numArg) || 7 : 7;

  console.log(`\n🌅 OUTREACH MORNING CHECK (last ${daysBack} days)\n`);

  // 1. Load tracking + enrich
  const rawTracking: TrackingEntry[] = JSON.parse(
    fs.readFileSync('content/outreach/tracking.json', 'utf-8')
  );
  const tracking = enrichTracking(rawTracking);
  console.log(`  Tracking: ${tracking.length} emails (enriched with video/country data)`);

  // 2. Scan inbox via Gmail API
  console.log('  Scanning inbox (Gmail API)...');
  const scanResult = await scanOutreachReplies(daysBack);

  if (scanResult.errors.length > 0) {
    for (const err of scanResult.errors) console.error(`  Error: ${err}`);
  }

  // 3. Classify each message
  const classifiedTypes = new Map<string, string>();
  for (const msg of scanResult.messages) {
    classifiedTypes.set(msg.messageId, classifyReply(msg));
  }

  const human = scanResult.messages.filter(r => classifiedTypes.get(r.messageId) === 'human_reply');
  const auto = scanResult.messages.filter(r => classifiedTypes.get(r.messageId) === 'auto_reply');
  const bounces = scanResult.messages.filter(r => classifiedTypes.get(r.messageId) === 'bounce');
  console.log(`  Found: ${human.length} human, ${auto.length} auto, ${bounces.length} bounces`);
  console.log(`  Dedup: ${scanResult.newCount} new, ${scanResult.duplicateCount} already persisted`);

  // 4. Persist new replies (Gmail Message-ID dedup)
  console.log('  Persisting to SurrealDB...');
  let persisted = 0;
  const domainToVenue: Record<string, string> = {};
  for (const t of tracking) {
    if (t.to?.includes('@')) {
      const domain = t.to.split('@')[1].toLowerCase();
      domainToVenue[domain] = t.venue;
    }
  }

  for (const msg of scanResult.messages) {
    const venue = domainToVenue[msg.fromDomain] || msg.fromDomain;
    const replyType = classifiedTypes.get(msg.messageId) as 'human_reply' | 'auto_reply' | 'bounce';
    if (replyType === 'bounce') continue; // Don't persist bounces as replies
    const saved = await persistReply(msg, venue, replyType);
    if (saved) persisted++;
  }
  console.log(`  Persisted: ${persisted} new replies`);

  // 5. Analyze patterns
  console.log('  Analyzing patterns...');
  const patterns = analyzePatterns(tracking, scanResult.messages, classifiedTypes);

  // 6. Save snapshot
  await saveSnapshotToDB(patterns);

  // 7. Intelligence Router — auto-generate briefings for human replies
  const briefings: IntelligenceBriefing[] = [];
  if (human.length > 0) {
    console.log('\n  Running intelligence router on human replies...');
    const processedDomains = new Set<string>();
    for (const r of human) {
      // One briefing per domain (not per message)
      if (processedDomains.has(r.fromDomain)) continue;
      processedDomains.add(r.fromDomain);

      const venue = domainToVenue[r.fromDomain] || r.fromDomain;
      const replyType = classifiedTypes.get(r.messageId) as 'human_reply' | 'auto_reply' | 'bounce';
      try {
        const briefing = await routeReplyEvent(venue, r.fromEmail, replyType, r.snippet);
        briefings.push(briefing);
        console.log(`  ${venue}: ${briefing.urgency} urgency | ${briefing.recommendations.length} actions`);
      } catch (err: any) {
        console.error(`  Router error for ${venue}: ${err.message}`);
      }
    }
  }

  // 8. Console output
  console.log('\n' + '='.repeat(60));
  if (human.length > 0) {
    console.log('\n🎉 HUMAN REPLIES:');
    for (const r of human) {
      console.log(`  ${r.date.toLocaleDateString('it-IT')} — ${r.fromDomain}`);
      console.log(`    From: ${r.from}`);
      console.log(`    ${r.snippet.substring(0, 200).replace(/\n/g, ' ')}`);
      console.log('');
    }
  }

  // Print intelligence briefings
  for (const b of briefings) {
    console.log(formatBriefingForConsole(b));
  }

  if (bounces.length > 0) {
    console.log(`\n⚠️ BOUNCES (${bounces.length}):`);
    for (const b of bounces) console.log(`  ${b.subject.substring(0, 80)}`);
  }

  console.log(`\n📊 Pipeline: ${patterns.totalSent} sent, ${patterns.totalDelivered} delivered, ${patterns.humanReplies} replied (${patterns.responseRate.toFixed(1)}%)`);

  if (patterns.insights.length > 0) {
    console.log('\n💡 Insights:');
    for (const i of patterns.insights) console.log(`  • ${i}`);
  }

  // 9. Telegram (includes intelligence briefings)
  if (!silent) {
    console.log('\n  Sending Telegram...');
    const digest = buildTelegramDigest(scanResult.messages, classifiedTypes, patterns, tracking, scanResult);
    const briefingDigest = briefings.map(b => formatBriefingForTelegram(b)).join('\n\n');
    const fullDigest = briefingDigest ? `${digest}\n\n${briefingDigest}` : digest;
    await sendTelegram(fullDigest);
  }

  console.log('\n✅ Done.\n');
  await closeDb();
  process.exit(0);
}

main().catch(async e => {
  console.error('Error:', e.message);
  await closeDb().catch(() => {});
  process.exit(1);
});
