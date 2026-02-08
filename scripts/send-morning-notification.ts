#!/usr/bin/env npx tsx
/**
 * Send Morning Notification
 *
 * Manually trigger the morning briefing notification.
 */

import { Telegraf } from 'telegraf';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadCredentialsToEnv } from '../src/core/credentials.js';
import { getDuplicateReport } from '../src/core/duplicate-checker.js';

// Load credentials
await loadCredentialsToEnv();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID;

if (!TELEGRAM_BOT_TOKEN || !ALLOWED_USER_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ALLOWED_USER_ID');
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Build the morning briefing message
async function buildMorningBriefing(): Promise<string> {
  const today = new Date();
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const dayName = dayNames[today.getDay()];
  const dateStr = today.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  let message = `☀️ *Buongiorno FLUTUR!*\n`;
  message += `📅 ${dayName}, ${dateStr}\n\n`;

  // Pending actions from tracking file
  const trackingFile = join(process.cwd(), 'content/outreach/tracking.json');
  const pendingActions: string[] = [];
  const followUps: string[] = [];

  if (existsSync(trackingFile)) {
    try {
      const tracking = JSON.parse(readFileSync(trackingFile, 'utf-8'));

      for (const entry of tracking.sent || []) {
        if (entry.status === 'sent' && !entry.replied) {
          const sentDate = new Date(entry.sentAt);
          const daysSince = Math.floor((today.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSince >= 7) {
            followUps.push(`• ${entry.venue} (${daysSince} giorni)`);
          }
        }

        if (entry.status === 'pending' || entry.requiresAction) {
          pendingActions.push(`• ${entry.venue}: ${entry.note || 'action needed'}`);
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Add pending actions section
  if (pendingActions.length > 0) {
    message += `📋 *Azioni Pending:*\n`;
    message += pendingActions.join('\n') + '\n\n';
  }

  // Add follow-ups section
  if (followUps.length > 0) {
    message += `📬 *Follow-up Needed (7+ giorni):*\n`;
    message += followUps.join('\n') + '\n\n';
  }

  // Check expired grid canvases
  const gridActionsFile = join(process.cwd(), 'analytics/pending-grid-actions.json');
  const expiredGrids: string[] = [];

  if (existsSync(gridActionsFile)) {
    try {
      const gridActions = JSON.parse(readFileSync(gridActionsFile, 'utf-8'));

      for (const action of gridActions) {
        if (action.action === 'archive_grid_canvas') {
          const expiryDate = new Date(action.expiresAt);
          if (expiryDate <= today) {
            expiredGrids.push(`• ${action.grid} - ${action.postedIds?.length || 0} posts`);
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Add expired grids section
  if (expiredGrids.length > 0) {
    message += `🎨 *Grid Canvas Scaduti:*\n`;
    message += expiredGrids.join('\n') + '\n';
    message += `\n⚠️ Archiviali manualmente via Instagram app\n`;
    message += `o elimina: \`npx tsx scripts/delete-grid-canvas.ts <name>\`\n\n`;
  }

  // Duplicate warnings from Twitter
  try {
    const twitterReport = await getDuplicateReport('twitter');
    if (twitterReport.topicsPostedLast7Days.length > 0) {
      message += `🐦 *Twitter - Topic già postati (7 giorni):*\n`;
      message += twitterReport.topicsPostedLast7Days.map(t => `• ${t}`).join('\n') + '\n\n';
    }

    const igReport = await getDuplicateReport('instagram');
    if (igReport.topicsPostedLast7Days.length > 0) {
      message += `📷 *Instagram - Topic già postati (7 giorni):*\n`;
      message += igReport.topicsPostedLast7Days.map(t => `• ${t}`).join('\n') + '\n\n';
    }
  } catch (e) {
    // Ignore duplicate checker errors
  }

  // Platform-specific suggestions
  const suggestions: string[] = [];

  if (today.getDay() === 3 || today.getDay() === 4) { // Wed or Thu
    suggestions.push('📈 Twitter peak day - considera thread tech');
  }
  if (today.getDay() === 4) { // Thursday
    suggestions.push('📸 IG best day - posta alle 21:00');
  }
  if (today.getDay() === 6) { // Saturday
    suggestions.push('🌉 Crossover day - contenuto bridge tech+music');
  }

  if (suggestions.length > 0) {
    message += `💡 *Suggerimenti:*\n`;
    message += suggestions.join('\n') + '\n\n';
  }

  // Quick stats
  message += `📊 *Status Sistema:*\n`;
  message += `✅ Duplicate checker: attivo\n`;
  message += `✅ Telegram bot: online\n`;

  message += `\n_Layer su layer_ 🎵`;

  return message;
}

async function main() {
  console.log('📤 Sending morning notification...');

  const briefing = await buildMorningBriefing();

  try {
    await bot.telegram.sendMessage(ALLOWED_USER_ID, briefing, { parse_mode: 'Markdown' });
    console.log('✅ Morning notification sent!');
  } catch (error) {
    console.error('❌ Failed to send:', error);
  }

  process.exit(0);
}

main();
