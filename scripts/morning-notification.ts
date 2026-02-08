#!/usr/bin/env npx tsx
/**
 * Morning Notification Script
 * Sends a morning briefing via Telegram at scheduled time
 * Includes outreach pipeline status
 *
 * Run with cron: 0 8 * * * cd /path/to/social-cli-mcp && npx tsx scripts/morning-notification.ts
 * Or use launchd on macOS
 */

import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';
import { loadSecretsToEnv } from '../src/keychain.js';
import * as dotenv from 'dotenv';

loadSecretsToEnv();
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const USER_ID = process.env.TELEGRAM_USER_ID;

if (!BOT_TOKEN || !USER_ID) {
  console.error('❌ TELEGRAM_BOT_TOKEN and TELEGRAM_USER_ID required');
  process.exit(1);
}

const PROJECT_ROOT = process.cwd();
const ANALYTICS_DIR = path.join(PROJECT_ROOT, 'analytics');

interface ManualAction {
  id: string;
  type: string;
  venue: string;
  website?: string;
  phone?: string;
  status: string;
  priority: number;
  createdAt: string;
  notes?: string;
}

interface FollowUp {
  id: string;
  type: string;
  dueDate: string;
  venues: string[];
  status: string;
  notes?: string;
}

interface PendingActionsData {
  lastUpdated: string;
  manualActions: ManualAction[];
  followUps: FollowUp[];
  contentReminders: any[];
}

function loadPendingActionsFile(): PendingActionsData | null {
  try {
    const data = fs.readFileSync(path.join(ANALYTICS_DIR, 'pending-actions.json'), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function loadPostedTweetsIndex(): { postedTopics: any[], recentTweetIds: string[] } | null {
  try {
    const data = fs.readFileSync(path.join(ANALYTICS_DIR, 'posted-tweets-index.json'), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function buildMorningBriefing(): string {
  const lines: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  lines.push(`🌅 **MORNING BRIEFING - ${today}**\n`);

  // Load pending actions
  const pending = loadPendingActionsFile();
  if (pending) {
    const manualPending = pending.manualActions.filter(a => a.status === 'pending');
    if (manualPending.length > 0) {
      lines.push(`📋 **AZIONI MANUALI PENDING (${manualPending.length}):**`);
      manualPending.sort((a, b) => a.priority - b.priority).forEach(action => {
        const icon = action.type === 'phone_call' ? '📞' : action.type === 'form_submission' ? '📝' : '📧';
        lines.push(`${icon} **${action.venue}**`);
        if (action.phone) lines.push(`   Tel: ${action.phone}`);
        if (action.website) lines.push(`   Web: ${action.website}`);
        if (action.notes) lines.push(`   📌 ${action.notes}`);
        lines.push('');
      });
    }

    // Check follow-ups due today or overdue
    const followUpsDue = pending.followUps.filter(f => {
      if (f.status !== 'pending') return false;
      return f.dueDate <= today;
    });

    if (followUpsDue.length > 0) {
      lines.push(`⏰ **FOLLOW-UP SCADUTI/OGGI:**`);
      followUpsDue.forEach(f => {
        lines.push(`• ${f.venues.join(', ')}`);
        lines.push(`  📅 Scadenza: ${f.dueDate}`);
        if (f.notes) lines.push(`  📌 ${f.notes}`);
      });
      lines.push('');
    }

    // Upcoming follow-ups (next 7 days)
    const upcoming = pending.followUps.filter(f => {
      if (f.status !== 'pending') return false;
      const dueDate = new Date(f.dueDate);
      const todayDate = new Date(today);
      const diffDays = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 7;
    });

    if (upcoming.length > 0) {
      lines.push(`📅 **FOLLOW-UP PROSSIMI 7 GIORNI:**`);
      upcoming.forEach(f => {
        lines.push(`• ${f.dueDate}: ${f.venues.join(', ')}`);
      });
      lines.push('');
    }
  }

  // Load posted tweets to check for duplicates
  const tweets = loadPostedTweetsIndex();
  if (tweets) {
    const duplicates = tweets.postedTopics.filter(t => t.tweetIds && t.tweetIds.length > 1);
    if (duplicates.length > 0) {
      lines.push(`⚠️ **ATTENZIONE DUPLICATI TWEET:**`);
      duplicates.forEach(d => {
        lines.push(`• ${d.topic}: ${d.tweetIds.length} tweet`);
      });
      lines.push('');
    }
  }

  // Outreach pipeline status
  try {
    const tracking: any[] = JSON.parse(fs.readFileSync('content/outreach/tracking.json', 'utf-8'));
    const sent = tracking.filter((t: any) => t.status === 'sent');
    const bounced = tracking.filter((t: any) => t.bounced);
    const humanReplies = tracking.filter((t: any) => t.replyType === 'human');
    const delivered = sent.length - bounced.length;

    const now = new Date();
    const overdue = sent.filter((t: any) => {
      if (t.bounced || t.replyReceived || t.followUpSent) return false;
      const days = Math.floor((now.getTime() - new Date(t.sentAt).getTime()) / (1000 * 60 * 60 * 24));
      return days >= 7;
    });

    lines.push(`🎵 **OUTREACH PIPELINE:**`);
    lines.push(`📧 ${sent.length} sent | ${bounced.length} bounced | ${delivered} delivered`);
    lines.push(`💬 ${humanReplies.length} replies (${delivered > 0 ? ((humanReplies.length / delivered) * 100).toFixed(1) : 0}% rate)`);

    if (overdue.length > 0) {
      lines.push(`\n⏰ **${overdue.length} venues need follow-up!**`);
      for (const o of overdue.slice(0, 3)) {
        const days = Math.floor((now.getTime() - new Date(o.sentAt).getTime()) / (1000 * 60 * 60 * 24));
        lines.push(`  • ${o.venue} (${days}d)`);
      }
      if (overdue.length > 3) lines.push(`  ... +${overdue.length - 3} more`);
    }
    lines.push('');
  } catch {}

  if (lines.length <= 2) {
    lines.push('✅ Nessuna azione pending! Buona giornata!');
  }

  return lines.join('\n');
}

async function main() {
  const bot = new Telegraf(BOT_TOKEN!);
  const briefing = buildMorningBriefing();

  try {
    await bot.telegram.sendMessage(USER_ID!, briefing, { parse_mode: 'Markdown' });
    console.log('✅ Morning notification sent');
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    process.exit(1);
  }
}

main();
