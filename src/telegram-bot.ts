/**
 * Telegram Bot for Social CLI MCP
 * Allows remote control and status checks via Telegram
 *
 * SECURITY: All sensitive actions (tweet, email) require confirmation
 */

import { Telegraf, Context, Markup } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';
import { TwitterClient } from './clients/twitter.js';
import { InstagramClient } from './clients/instagram.js';
import { loadSecretsToEnv } from './keychain.js';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

// Load secrets from Keychain first (priority), then .env as fallback
loadSecretsToEnv();
dotenv.config();

// ============================================
// EMAIL CLIENT
// ============================================
function createEmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = createEmailTransporter();
  if (!transporter) {
    return { success: false, error: 'Email not configured (GMAIL_USER/GMAIL_APP_PASSWORD missing)' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Flutur" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''),
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// SECURITY: Pending Actions Queue
// ============================================
interface PendingAction {
  id: string;
  type: 'tweet' | 'email' | 'thread' | 'instagram';
  data: any;
  preview: string;
  createdAt: Date;
  expiresAt: Date;
}

const pendingActions = new Map<string, PendingAction>();

// Clean expired actions every minute
setInterval(() => {
  const now = new Date();
  for (const [id, action] of pendingActions) {
    if (action.expiresAt < now) {
      pendingActions.delete(id);
      console.log(`🗑️ Expired action removed: ${id}`);
    }
  }
}, 60000);

// Generate secure action ID
function generateActionId(): string {
  return crypto.randomBytes(8).toString('hex');
}

// Queue a sensitive action for confirmation
function queueAction(type: PendingAction['type'], data: any, preview: string): string {
  const id = generateActionId();
  const now = new Date();
  pendingActions.set(id, {
    id,
    type,
    data,
    preview,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 min expiry
  });
  return id;
}

// Initialize Twitter client
const twitterClient = new TwitterClient({
  apiKey: process.env.TWITTER_API_KEY || '',
  apiSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
});

// Initialize Instagram client
const instagramClient = new InstagramClient({
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
  facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
});

// Config
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID; // Your Telegram user ID for security

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN required in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Claude is optional - basic commands work without it
let anthropic: Anthropic | null = null;
if (ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  console.log('✅ Claude API configured');
} else {
  console.log('⚠️ ANTHROPIC_API_KEY not set - Claude features disabled');
}

// Project paths
const PROJECT_ROOT = process.cwd();
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content');
const OUTREACH_DIR = path.join(CONTENT_DIR, 'outreach');
const ANALYTICS_DIR = path.join(PROJECT_ROOT, 'analytics');

// ============================================
// PENDING ACTIONS TRACKING (for agents)
// ============================================
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

// Build morning briefing
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

  // Load posted tweets to check for gaps
  const tweets = loadPostedTweetsIndex();
  if (tweets) {
    const recentTopics = tweets.postedTopics
      .filter(t => t.lastPosted === today || t.lastPosted === new Date(Date.now() - 86400000).toISOString().split('T')[0])
      .map(t => t.topic);

    if (recentTopics.length > 0) {
      lines.push(`🐦 **TWEET RECENTI:**`);
      lines.push(`Topics: ${recentTopics.join(', ')}`);
      lines.push('');
    }

    // Check for duplicates
    const duplicates = tweets.postedTopics.filter(t => t.tweetIds && t.tweetIds.length > 1);
    if (duplicates.length > 0) {
      lines.push(`⚠️ **ATTENZIONE DUPLICATI:**`);
      duplicates.forEach(d => {
        lines.push(`• ${d.topic}: ${d.tweetIds.length} tweet`);
      });
      lines.push('');
    }
  }

  // Outreach pipeline status
  try {
    const tracking: any[] = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tracking.json'), 'utf-8'));
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

    lines.push(`🎵 **OUTREACH:**`);
    lines.push(`📧 ${sent.length} sent | ${bounced.length} bounced | ${humanReplies.length} replies`);
    if (overdue.length > 0) {
      lines.push(`⏰ **${overdue.length} need follow-up!**`);
    }
    lines.push('');
  } catch {}

  if (lines.length <= 2) {
    lines.push('✅ Nessuna azione pending!');
  }

  return lines.join('\n');
}

// Security middleware - only allow authorized user
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id?.toString();

  if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
    console.log(`⚠️ Unauthorized access attempt from user ${userId}`);
    await ctx.reply('⛔ Non autorizzato.');
    return;
  }

  return next();
});

// Load project data for context
function loadProjectContext(): string {
  const context: string[] = [];

  // Load venue followups
  try {
    const followups = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'venue-followups.json'), 'utf-8'));
    context.push(`## Venue Follow-ups (${followups.length} venues)`);
    followups.forEach((v: any) => {
      context.push(`- ${v.venue}: ${v.status} ${v.sentAt ? `(sent ${v.sentAt})` : ''}`);
    });
  } catch (e) {}

  // Load new venues
  try {
    const newVenues = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'new-venues.json'), 'utf-8'));
    context.push(`\n## New Venue Emails (${newVenues.length} venues)`);
    newVenues.forEach((v: any) => {
      context.push(`- ${v.venue}: ${v.status} ${v.sentAt ? `(sent ${v.sentAt})` : ''}`);
    });
  } catch (e) {}

  // Load tier1 pending
  try {
    const tier1 = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tier1-pending.json'), 'utf-8'));
    context.push(`\n## Tier 1 Venues (${tier1.length} venues)`);
    tier1.forEach((v: any) => {
      context.push(`- ${v.venue}: ${v.status}`);
    });
  } catch (e) {}

  // Load funnel strategy
  try {
    const funnel = fs.readFileSync(path.join(OUTREACH_DIR, 'funnel-strategy.md'), 'utf-8');
    context.push(`\n## Funnel Strategy Summary`);
    context.push(funnel.substring(0, 1000) + '...');
  } catch (e) {}

  return context.join('\n');
}

// Fetch Twitter data for context
async function loadTwitterContext(): Promise<string> {
  if (!twitterClient.isConfigured()) {
    return '## Twitter: Non configurato';
  }

  try {
    const me = await twitterClient.getMe();
    const result = await twitterClient.getMyRecentTweets(10);

    if (!result.success || !result.tweets) {
      return `## Twitter: Errore - ${result.error}`;
    }

    const lines: string[] = [];
    lines.push(`## Twitter @${me?.username || 'unknown'} (${me?.followers || 0} followers)`);
    lines.push(`Ultimi ${result.tweets.length} tweet:\n`);

    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();

    for (const tweet of result.tweets) {
      const tweetDate = new Date(tweet.created_at);
      const dateStr = tweetDate.toDateString();
      let dayLabel = '';
      if (dateStr === today) dayLabel = '(OGGI)';
      else if (dateStr === yesterday) dayLabel = '(IERI)';

      const timeStr = tweetDate.toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });

      lines.push(`- ${timeStr} ${dayLabel}`);
      lines.push(`  "${tweet.text.substring(0, 80)}${tweet.text.length > 80 ? '...' : ''}"`);
      if (tweet.metrics) {
        lines.push(`  ❤️${tweet.metrics.likes} 🔁${tweet.metrics.retweets} 💬${tweet.metrics.replies} 👁${tweet.metrics.impressions}`);
      }
    }

    return lines.join('\n');
  } catch (error) {
    return `## Twitter: Errore - ${(error as Error).message}`;
  }
}

// Claude API call with project context
async function askClaude(userMessage: string): Promise<string> {
  if (!anthropic) {
    return '⚠️ Claude non configurato. Aggiungi ANTHROPIC_API_KEY al .env per abilitare le risposte AI.';
  }

  const projectContext = loadProjectContext();

  // Check if user is asking about Twitter - fetch live data
  const isTwitterQuestion = /twitter|tweet|post|x\.com|social/i.test(userMessage);
  let twitterContext = '';
  if (isTwitterQuestion && twitterClient.isConfigured()) {
    twitterContext = await loadTwitterContext();
  }

  const systemPrompt = `Sei l'assistente di Alessio "Flutur" per il progetto social-cli-mcp.

Il progetto gestisce:
- Outreach per venue musicali (beach clubs, wellness retreats, hotel)
- Email automation per booking
- Content strategy per Flutur (musica) e jsOM (software)
- Social media: Twitter @flutur_8

CONTESTO ATTUALE DEL PROGETTO:
${projectContext}

${twitterContext ? `\nDATI TWITTER LIVE:\n${twitterContext}` : ''}

Rispondi in italiano, in modo conciso e discorsivo. Usa i dati reali sopra per rispondere.
Quando parli di Twitter, usa i dati live che hai (date, metriche, testo dei tweet).`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : 'Nessuna risposta.';
  } catch (error) {
    console.error('Claude API error:', error);
    return `❌ Errore API: ${(error as Error).message}`;
  }
}

// Commands
bot.command('start', async (ctx) => {
  await ctx.reply(`🎵 **Flutur Bot** - Social CLI MCP

🌅 /morning - **BRIEFING GIORNALIERO**

🔐 **Azioni Sicure (richiedono conferma):**
/tweet <testo> - Pubblica tweet
/instagram <url> <caption> - Post Instagram
/reel <url> <caption> - Pubblica Reel
/email to|subj|body - Invia email
/pending - Azioni in attesa

📊 **Status:**
/status - Pipeline outreach
/outreach - Dettaglio reply + follow-up
/twitter - Tweet recenti
/venues - Lista venue

/help - Tutti i comandi

💬 Scrivi qualsiasi domanda e rispondo usando Claude.`, { parse_mode: 'Markdown' });
});

bot.command('help', async (ctx) => {
  await ctx.reply(`📋 **Comandi disponibili:**

🌅 **Daily:**
/morning - Briefing giornaliero (azioni pending, follow-up, tweet)

🔐 **Azioni Sicure (con conferma):**
/tweet <testo> - Pubblica tweet
/instagram <url> <caption> - Post Instagram (foto)
/reel <url> <caption> - Pubblica Reel (video)
/story <url> - Pubblica Story
/email to|subj|body - Invia email
/pending - Vedi azioni in attesa

📊 **Outreach:**
/status - Stato generale
/venues - Lista venue contattati
/stats - Statistiche email
/tier1 - Venue Tier 1

🐦 **Social:**
/twitter - Tweet recenti + metriche

💬 **Chat libera** - scrivi qualsiasi domanda:
- "Quante email ho inviato oggi?"
- "Status Twitter dei post"`, { parse_mode: 'Markdown' });
});

// ============================================
// MORNING BRIEFING COMMAND
// ============================================
bot.command('morning', async (ctx) => {
  const briefing = buildMorningBriefing();
  await ctx.reply(briefing, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  try {
    const tracking: any[] = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tracking.json'), 'utf-8'));
    const sent = tracking.filter((t: any) => t.status === 'sent');
    const bounced = tracking.filter((t: any) => t.bounced);
    const humanReplies = tracking.filter((t: any) => t.replyType === 'human');
    const autoReplies = tracking.filter((t: any) => t.replyType === 'auto');
    const delivered = sent.length - bounced.length;

    const now = new Date();
    const overdue = sent.filter((t: any) => {
      if (t.bounced || t.replyReceived || t.followUpSent) return false;
      const days = Math.floor((now.getTime() - new Date(t.sentAt).getTime()) / (1000 * 60 * 60 * 24));
      return days >= 7;
    });
    const followUpsSent = tracking.filter((t: any) => t.followUpSent);

    const msg = `📊 **OUTREACH PIPELINE**

📧 Sent: **${sent.length}** | Bounced: **${bounced.length}** | Delivered: **${delivered}**
💬 Human replies: **${humanReplies.length}** (${delivered > 0 ? ((humanReplies.length / delivered) * 100).toFixed(1) : 0}%)
🤖 Auto-replies: **${autoReplies.length}**
📨 Follow-ups sent: **${followUpsSent.length}**
⏰ Overdue for follow-up: **${overdue.length}**

📅 ${new Date().toISOString().split('T')[0]}`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ Errore caricamento status. Usa tracking.json.');
  }
});

bot.command('outreach', async (ctx) => {
  try {
    const tracking: any[] = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tracking.json'), 'utf-8'));
    const now = new Date();

    const humanReplies = tracking.filter((t: any) => t.replyType === 'human');
    const overdue = tracking.filter((t: any) => {
      if (t.status !== 'sent' || t.bounced || t.replyReceived || t.followUpSent) return false;
      const days = Math.floor((now.getTime() - new Date(t.sentAt).getTime()) / (1000 * 60 * 60 * 24));
      return days >= 7;
    });

    let msg = `🎵 **OUTREACH DETAIL**\n\n`;

    if (humanReplies.length > 0) {
      msg += `🎉 **Replies:**\n`;
      for (const r of humanReplies) {
        msg += `• **${r.venue}** (${r.replyDate?.split('T')[0] || '?'})\n`;
        if (r.replyPreview) msg += `  "${r.replyPreview.substring(0, 100)}"\n`;
      }
      msg += '\n';
    }

    if (overdue.length > 0) {
      msg += `⏰ **Need follow-up (${overdue.length}):**\n`;
      for (const o of overdue.slice(0, 10)) {
        const days = Math.floor((now.getTime() - new Date(o.sentAt).getTime()) / (1000 * 60 * 60 * 24));
        msg += `• ${o.venue} (${days}d)\n`;
      }
      if (overdue.length > 10) msg += `  ... +${overdue.length - 10} more\n`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ Errore. Run: npx tsx scripts/outreach-auto.ts report');
  }
});

bot.command('venues', async (ctx) => {
  try {
    const followups = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'venue-followups.json'), 'utf-8'));
    const newVenues = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'new-venues.json'), 'utf-8'));
    const tier1 = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tier1-pending.json'), 'utf-8'));

    let msg = `📍 **Venue Contattati**\n\n`;

    msg += `**Follow-ups (${followups.length}):**\n`;
    followups.slice(0, 5).forEach((v: any) => {
      msg += `• ${v.venue} - ${v.status}\n`;
    });

    msg += `\n**Nuovi (${newVenues.length}):**\n`;
    newVenues.slice(0, 5).forEach((v: any) => {
      msg += `• ${v.venue} - ${v.status}\n`;
    });

    msg += `\n**Tier 1 (${tier1.length}):**\n`;
    tier1.forEach((v: any) => {
      msg += `• ${v.venue} - ${v.status}\n`;
    });

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ Errore caricamento venue');
  }
});

bot.command('stats', async (ctx) => {
  try {
    const followups = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'venue-followups.json'), 'utf-8'));
    const newVenues = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'new-venues.json'), 'utf-8'));
    const tier1 = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tier1-pending.json'), 'utf-8'));

    const allVenues = [...followups, ...newVenues, ...tier1];
    const sent = allVenues.filter((v: any) => v.status === 'sent').length;
    const pending = allVenues.filter((v: any) => v.status === 'pending' || v.status === 'draft').length;

    const msg = `📊 **Statistiche Outreach**

📧 Email inviate: **${sent}**
⏳ Pending: **${pending}**
📍 Totale venue: **${allVenues.length}**

📅 Ultimo invio: ${new Date().toISOString().split('T')[0]}`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ Errore caricamento stats');
  }
});

bot.command('tier1', async (ctx) => {
  try {
    const tier1 = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tier1-pending.json'), 'utf-8'));

    let msg = `🏆 **Venue Tier 1**\n\n`;
    tier1.forEach((v: any) => {
      msg += `**${v.venue}**\n`;
      msg += `📧 ${v.to}\n`;
      msg += `📌 Status: ${v.status}\n\n`;
    });

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ Errore caricamento Tier 1');
  }
});

// Twitter command
bot.command('twitter', async (ctx) => {
  if (!twitterClient.isConfigured()) {
    await ctx.reply('❌ Twitter non configurato. Aggiungi le credenziali al .env');
    return;
  }

  await ctx.reply('🐦 Carico tweet recenti...');

  try {
    // Get user info
    const me = await twitterClient.getMe();

    // Get recent tweets
    const result = await twitterClient.getMyRecentTweets(5);

    if (!result.success || !result.tweets) {
      await ctx.reply(`❌ Errore: ${result.error}`);
      return;
    }

    let msg = `🐦 **Twitter @${me?.username || 'unknown'}**\n`;
    msg += `👥 Followers: ${me?.followers || 0}\n\n`;
    msg += `**Ultimi ${result.tweets.length} tweet:**\n\n`;

    for (const tweet of result.tweets) {
      const date = new Date(tweet.created_at);
      const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

      msg += `📅 ${dateStr} ${timeStr}\n`;
      msg += `${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}\n`;

      if (tweet.metrics) {
        msg += `❤️ ${tweet.metrics.likes} | 🔁 ${tweet.metrics.retweets} | 💬 ${tweet.metrics.replies}`;
        if (tweet.metrics.impressions > 0) {
          msg += ` | 👁 ${tweet.metrics.impressions}`;
        }
        msg += '\n';
      }
      msg += '\n';
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply(`❌ Errore Twitter: ${(error as Error).message}`);
  }
});

// ============================================
// SECURITY: Confirmation Handlers
// ============================================

// Handle confirmation button clicks
bot.action(/^confirm_(.+)$/, async (ctx) => {
  const actionId = ctx.match[1];
  const action = pendingActions.get(actionId);

  if (!action) {
    await ctx.answerCbQuery('⏰ Azione scaduta o già eseguita');
    await ctx.editMessageText('⏰ Azione scaduta. Riprova.');
    return;
  }

  pendingActions.delete(actionId);

  try {
    if (action.type === 'tweet') {
      await ctx.editMessageText('📤 Pubblicando tweet...');
      const result = await twitterClient.post({ text: action.data.text });

      if (result.success) {
        await ctx.editMessageText(
          `✅ **Tweet pubblicato!**\n\n"${action.data.text.substring(0, 100)}..."\n\n🔗 ${result.url}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.editMessageText(`❌ Errore: ${result.error}`);
      }
    } else if (action.type === 'email') {
      await ctx.editMessageText('📧 Inviando email...');
      const result = await sendEmail(action.data.to, action.data.subject, action.data.html);

      if (result.success) {
        await ctx.editMessageText(
          `✅ **Email inviata!**\n\n📧 A: ${action.data.to}\n📝 Oggetto: ${action.data.subject}\n\n🆔 ${result.messageId}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.editMessageText(`❌ Errore: ${result.error}`);
      }
    } else if (action.type === 'instagram') {
      const postType = action.data.postType || 'feed';
      const typeLabel = postType === 'reels' ? 'Reel' : postType === 'stories' ? 'Story' : 'post';
      await ctx.editMessageText(`📸 Pubblicando ${typeLabel} su Instagram...`);

      let result;
      if (postType === 'reels') {
        result = await instagramClient.postReel(action.data.mediaUrl, action.data.caption, {
          hashtags: action.data.hashtags,
          shareToFeed: true,
        });
      } else if (postType === 'stories') {
        result = await instagramClient.postStory(action.data.mediaUrl, action.data.caption);
      } else {
        result = await instagramClient.post({
          text: action.data.caption,
          caption: action.data.caption,
          mediaUrls: [action.data.mediaUrl],
          hashtags: action.data.hashtags,
        });
      }

      if (result.success) {
        await ctx.editMessageText(
          `✅ **Instagram ${typeLabel} pubblicato!**\n\n"${action.data.caption.substring(0, 100)}..."\n\n🔗 ${result.url || result.postId}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.editMessageText(`❌ Errore Instagram: ${result.error}`);
      }
    }

    await ctx.answerCbQuery('✅ Azione eseguita');
  } catch (error) {
    await ctx.answerCbQuery('❌ Errore');
    await ctx.editMessageText(`❌ Errore: ${(error as Error).message}`);
  }
});

// Handle cancel button clicks
bot.action(/^cancel_(.+)$/, async (ctx) => {
  const actionId = ctx.match[1];
  const action = pendingActions.get(actionId);

  if (action) {
    pendingActions.delete(actionId);
  }

  await ctx.answerCbQuery('❌ Annullato');
  await ctx.editMessageText('❌ Azione annullata.');
});

// ============================================
// TWEET COMMAND with Confirmation
// ============================================
bot.command('tweet', async (ctx) => {
  const text = ctx.message.text.replace('/tweet ', '').trim();

  if (!text || text === '/tweet') {
    await ctx.reply('Uso: /tweet <testo del tweet>\n\nEsempio:\n/tweet Hello world!');
    return;
  }

  if (!twitterClient.isConfigured()) {
    await ctx.reply('❌ Twitter non configurato');
    return;
  }

  // Queue for confirmation
  const actionId = queueAction('tweet', { text }, text);

  const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;

  await ctx.reply(
    `🔐 **Conferma Tweet**\n\n"${preview}"\n\n📊 ${text.length}/280 caratteri\n⏰ Scade in 5 minuti`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Pubblica', `confirm_${actionId}`),
          Markup.button.callback('❌ Annulla', `cancel_${actionId}`),
        ],
      ]),
    }
  );
});

// ============================================
// EMAIL COMMAND with Confirmation
// ============================================
bot.command('email', async (ctx) => {
  // Format: /email to@email.com | Subject | Body HTML
  const args = ctx.message.text.replace('/email ', '').trim();

  if (!args || args === '/email') {
    await ctx.reply(`📧 **Uso:**
/email destinatario | oggetto | corpo

**Esempio:**
/email test@example.com | Test Subject | <p>Hello!</p>

Separa con | (pipe)`);
    return;
  }

  const parts = args.split('|').map(p => p.trim());

  if (parts.length < 3) {
    await ctx.reply('❌ Formato: /email to | subject | body\n\nSepara con | (pipe)');
    return;
  }

  const [to, subject, ...bodyParts] = parts;
  const html = bodyParts.join('|'); // In case body contains |

  // Validate email
  if (!to.includes('@')) {
    await ctx.reply('❌ Email destinatario non valida');
    return;
  }

  // Queue for confirmation
  const actionId = queueAction('email', { to, subject, html }, `To: ${to} | ${subject}`);

  const preview = html.length > 100 ? html.substring(0, 100) + '...' : html;

  await ctx.reply(
    `🔐 **Conferma Email**\n\n📧 **A:** ${to}\n📝 **Oggetto:** ${subject}\n\n**Corpo:**\n${preview}\n\n⏰ Scade in 5 minuti`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Invia', `confirm_${actionId}`),
          Markup.button.callback('❌ Annulla', `cancel_${actionId}`),
        ],
      ]),
    }
  );
});

// ============================================
// INSTAGRAM COMMAND with Confirmation
// ============================================
bot.command('instagram', async (ctx) => {
  // Format: /instagram <media-url> <caption>
  const args = ctx.message.text.replace('/instagram ', '').trim();

  if (!args || args === '/instagram') {
    await ctx.reply(`📸 **Uso:**
/instagram <url-immagine> <caption>

**Esempio:**
/instagram https://example.com/image.jpg Ecco la mia foto! #flutur

Nota: L'URL deve essere pubblicamente accessibile`);
    return;
  }

  if (!instagramClient.isConfigured()) {
    await ctx.reply('❌ Instagram non configurato. Aggiungi INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ACCOUNT_ID al .env');
    return;
  }

  const parts = args.split(' ');
  const mediaUrl = parts[0];
  const caption = parts.slice(1).join(' ') || '';

  if (!mediaUrl.startsWith('http')) {
    await ctx.reply('❌ URL media non valido. Deve iniziare con http:// o https://');
    return;
  }

  // Extract hashtags from caption
  const hashtagMatch = caption.match(/#\w+/g);
  const hashtags = hashtagMatch || [];

  // Queue for confirmation
  const actionId = queueAction('instagram', {
    mediaUrl,
    caption,
    hashtags,
    postType: 'feed',
  }, caption || mediaUrl);

  const preview = caption.length > 150 ? caption.substring(0, 150) + '...' : caption || '(nessuna caption)';

  await ctx.reply(
    `🔐 **Conferma Post Instagram**\n\n📸 **Media:** ${mediaUrl.substring(0, 50)}...\n📝 **Caption:** "${preview}"\n${hashtags.length > 0 ? `#️⃣ **Hashtags:** ${hashtags.length}\n` : ''}⏰ Scade in 5 minuti`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Pubblica', `confirm_${actionId}`),
          Markup.button.callback('❌ Annulla', `cancel_${actionId}`),
        ],
      ]),
    }
  );
});

// ============================================
// REEL COMMAND with Confirmation
// ============================================
bot.command('reel', async (ctx) => {
  const args = ctx.message.text.replace('/reel ', '').trim();

  if (!args || args === '/reel') {
    await ctx.reply(`🎬 **Uso:**
/reel <url-video> <caption>

**Esempio:**
/reel https://example.com/video.mp4 Il mio nuovo Reel! #flutur #music

Nota: Video max 90 secondi, formato 9:16 consigliato`);
    return;
  }

  if (!instagramClient.isConfigured()) {
    await ctx.reply('❌ Instagram non configurato');
    return;
  }

  const parts = args.split(' ');
  const mediaUrl = parts[0];
  const caption = parts.slice(1).join(' ') || '';

  if (!mediaUrl.startsWith('http')) {
    await ctx.reply('❌ URL video non valido');
    return;
  }

  const hashtagMatch = caption.match(/#\w+/g);
  const hashtags = hashtagMatch || [];

  const actionId = queueAction('instagram', {
    mediaUrl,
    caption,
    hashtags,
    postType: 'reels',
  }, caption || mediaUrl);

  const preview = caption.length > 150 ? caption.substring(0, 150) + '...' : caption || '(nessuna caption)';

  await ctx.reply(
    `🔐 **Conferma Reel Instagram**\n\n🎬 **Video:** ${mediaUrl.substring(0, 50)}...\n📝 **Caption:** "${preview}"\n${hashtags.length > 0 ? `#️⃣ **Hashtags:** ${hashtags.length}\n` : ''}⏰ Scade in 5 minuti`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Pubblica', `confirm_${actionId}`),
          Markup.button.callback('❌ Annulla', `cancel_${actionId}`),
        ],
      ]),
    }
  );
});

// ============================================
// STORY COMMAND with Confirmation
// ============================================
bot.command('story', async (ctx) => {
  const args = ctx.message.text.replace('/story ', '').trim();

  if (!args || args === '/story') {
    await ctx.reply(`📖 **Uso:**
/story <url-media>

**Esempio:**
/story https://example.com/image.jpg

Nota: Le storie durano 24 ore. Video max 60 secondi.`);
    return;
  }

  if (!instagramClient.isConfigured()) {
    await ctx.reply('❌ Instagram non configurato');
    return;
  }

  const mediaUrl = args.split(' ')[0];

  if (!mediaUrl.startsWith('http')) {
    await ctx.reply('❌ URL media non valido');
    return;
  }

  const actionId = queueAction('instagram', {
    mediaUrl,
    caption: '',
    postType: 'stories',
  }, mediaUrl);

  await ctx.reply(
    `🔐 **Conferma Story Instagram**\n\n📖 **Media:** ${mediaUrl.substring(0, 60)}...\n⏰ Scade in 5 minuti`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Pubblica', `confirm_${actionId}`),
          Markup.button.callback('❌ Annulla', `cancel_${actionId}`),
        ],
      ]),
    }
  );
});

// ============================================
// PENDING ACTIONS STATUS
// ============================================
bot.command('pending', async (ctx) => {
  if (pendingActions.size === 0) {
    await ctx.reply('✅ Nessuna azione in attesa di conferma.');
    return;
  }

  let msg = `🔐 **Azioni in attesa (${pendingActions.size}):**\n\n`;

  for (const [id, action] of pendingActions) {
    const remainingMs = action.expiresAt.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    msg += `• **${action.type}** - scade in ${remainingMin}min\n`;
    msg += `  "${action.preview.substring(0, 50)}..."\n\n`;
  }

  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ============================================
// FREE TEXT - Send to Claude (MUST be last handler)
// ============================================
bot.on('text', async (ctx) => {
  const userMessage = ctx.message.text;

  // Ignore commands - they have their own handlers above
  if (userMessage.startsWith('/')) return;

  await ctx.reply('🤔 Sto pensando...');

  try {
    const response = await askClaude(userMessage);

    // Split long messages (Telegram limit: 4096 chars)
    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response);
    }
  } catch (error) {
    await ctx.reply(`❌ Errore: ${(error as Error).message}`);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Si è verificato un errore.');
});

// ============================================
// AUTOMATIC MORNING NOTIFICATION
// ============================================
async function sendMorningNotification() {
  if (!ALLOWED_USER_ID) {
    console.log('⚠️ TELEGRAM_USER_ID not set - cannot send morning notification');
    return;
  }

  try {
    const briefing = buildMorningBriefing();
    await bot.telegram.sendMessage(ALLOWED_USER_ID, briefing, { parse_mode: 'Markdown' });
    console.log('✅ Morning notification sent');
  } catch (error) {
    console.error('❌ Failed to send morning notification:', error);
  }
}

// Schedule morning notification at 9:00 AM
function scheduleMorningNotification() {
  const now = new Date();
  const targetHour = 9; // 9:00 AM

  // Calculate milliseconds until next 9:00 AM
  let target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);

  if (now >= target) {
    // Already past 9 AM today, schedule for tomorrow
    target.setDate(target.getDate() + 1);
  }

  const msUntilTarget = target.getTime() - now.getTime();
  console.log(`⏰ Morning notification scheduled for ${target.toLocaleString('it-IT')}`);

  // First notification
  setTimeout(() => {
    sendMorningNotification();

    // Then repeat every 24 hours
    setInterval(sendMorningNotification, 24 * 60 * 60 * 1000);
  }, msUntilTarget);
}

// Start bot
// Note: bot.launch() promise doesn't resolve until bot stops (Telegraf bug #1989)
// So we log immediately and don't await
console.log('🚀 Starting Telegram bot...');
console.log('🤖 Bot is now running and listening for commands');
console.log('🔐 Security: All sensitive actions require confirmation');
console.log('📱 Send /start on Telegram to begin');

bot.launch({ dropPendingUpdates: true }).then(() => {
  // Schedule morning notification after bot is running
  scheduleMorningNotification();
}).catch((err) => {
  console.error('❌ Bot launch failed:', err);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
