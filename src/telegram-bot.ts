/**
 * Telegram Bot for Social CLI MCP
 * Allows remote control and status checks via Telegram
 *
 * SECURITY: All sensitive actions (tweet, email) require confirmation
 */

import { Telegraf, Context, Markup } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';
import { TwitterClient } from './clients/twitter.js';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

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
  type: 'tweet' | 'email' | 'thread';
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

🔐 **Azioni Sicure (richiedono conferma):**
/tweet <testo> - Pubblica tweet
/email to|subj|body - Invia email
/pending - Azioni in attesa

📊 **Status:**
/status - Stato outreach
/twitter - Tweet recenti
/venues - Lista venue

/help - Tutti i comandi

💬 Scrivi qualsiasi domanda e rispondo usando Claude.`, { parse_mode: 'Markdown' });
});

bot.command('help', async (ctx) => {
  await ctx.reply(`📋 **Comandi disponibili:**

🔐 **Azioni Sicure (con conferma):**
/tweet <testo> - Pubblica tweet
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

bot.command('status', async (ctx) => {
  try {
    const followups = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'venue-followups.json'), 'utf-8'));
    const newVenues = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'new-venues.json'), 'utf-8'));
    const tier1 = JSON.parse(fs.readFileSync(path.join(OUTREACH_DIR, 'tier1-pending.json'), 'utf-8'));

    const allVenues = [...followups, ...newVenues, ...tier1];
    const sent = allVenues.filter((v: any) => v.status === 'sent').length;
    const pending = allVenues.filter((v: any) => v.status === 'pending' || v.status === 'draft').length;

    const msg = `📊 **Status Outreach**

📧 Email inviate: **${sent}**
⏳ Pending: **${pending}**
📍 Totale venue: **${allVenues.length}**

**Breakdown:**
• Follow-ups: ${followups.length}
• Nuovi venue: ${newVenues.length}
• Tier 1: ${tier1.length}

📅 Data: ${new Date().toISOString().split('T')[0]}`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ Errore caricamento status');
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

// Free text - send to Claude
bot.on('text', async (ctx) => {
  const userMessage = ctx.message.text;

  // Ignore commands
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

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Si è verificato un errore.');
});

// Start bot
bot.launch().then(() => {
  console.log('🤖 Telegram bot started!');
  console.log('🔐 Security: Tweet confirmation enabled');
  console.log('Send /start to begin');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
