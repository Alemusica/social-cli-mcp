/**
 * Telegram Bot — thin client, all business logic delegated to services
 *
 * SECURITY: User ID check via TELEGRAM_USER_ID, pending actions with 5min expiry,
 * inline keyboard confirmation for all mutating actions.
 */

import { Telegraf, Context, Markup } from "telegraf";
import Anthropic from "@anthropic-ai/sdk";
import * as crypto from "crypto";

import { createLogger } from "../lib/logger.js";
import { withTenant, getDefaultTenantId } from "../db/client.js";
import { loadCredentialsToEnv } from "../config/credentials.js";

// ── Outreach services ──
import {
  getConversationDashboard,
  getBatchStatus,
  getDailyLimits,
  runPipeline,
  approveBatch,
  sendApprovedBatch,
} from "../services/outreach/index.js";

// ── Platform clients ──
import { TwitterClient, InstagramClient, GmailSender } from "../services/platform/index.js";

// Load credentials from Keychain before anything else
loadCredentialsToEnv();

const log = createLogger("telegram");

// ============================================
// TYPES
// ============================================
interface PendingAction {
  id: string;
  type: "tweet" | "email" | "thread" | "instagram" | "approve_batch";
  data: any;
  preview: string;
  createdAt: Date;
  expiresAt: Date;
}

// ============================================
// CONFIG
// ============================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_USER_ID = process.env.TELEGRAM_USER_ID;

if (!BOT_TOKEN) {
  log.error("TELEGRAM_BOT_TOKEN required");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Claude (optional — basic commands work without it)
let anthropic: Anthropic | null = null;
if (ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  log.info("Claude API configured");
} else {
  log.warn("ANTHROPIC_API_KEY not set — Claude features disabled");
}

// ── Platform clients ──
const twitterClient = new TwitterClient({
  apiKey: process.env.TWITTER_API_KEY || "",
  apiSecret: process.env.TWITTER_API_SECRET || "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
  accessSecret: process.env.TWITTER_ACCESS_SECRET || "",
});

const instagramClient = new InstagramClient({
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "",
  facebookPageId: process.env.FACEBOOK_PAGE_ID || "",
});

// ── Gmail sender (for /email command) ──
const gmailSender = new GmailSender({
  user: process.env.GMAIL_USER || "",
  appPassword: process.env.GMAIL_APP_PASSWORD || "",
});

// ============================================
// SECURITY: Pending Actions Queue
// ============================================
const pendingActions = new Map<string, PendingAction>();

// Expire stale actions every minute
setInterval(() => {
  const now = new Date();
  for (const [id, action] of pendingActions) {
    if (action.expiresAt < now) {
      pendingActions.delete(id);
      log.debug("expired action removed", { id });
    }
  }
}, 60_000);

function generateActionId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function queueAction(
  type: PendingAction["type"],
  data: any,
  preview: string,
): string {
  const id = generateActionId();
  const now = new Date();
  pendingActions.set(id, {
    id,
    type,
    data,
    preview,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
  });
  return id;
}

// ============================================
// SECURITY MIDDLEWARE — allowlist by user ID
// ============================================
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id?.toString();
  if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
    log.warn("unauthorized access attempt", { userId });
    await ctx.reply("Non autorizzato.");
    return;
  }
  return next();
});

// ============================================
// HELPER: ask Claude with project context
// ============================================
async function askClaude(userMessage: string): Promise<string> {
  if (!anthropic) {
    return "Claude non configurato. Aggiungi ANTHROPIC_API_KEY per abilitare le risposte AI.";
  }

  const tenantId = getDefaultTenantId();
  let dashboardContext = "";
  try {
    const dashboard = await getConversationDashboard(tenantId);
    const s = dashboard.byStatus;
    dashboardContext = `Outreach: ${dashboard.totalVenues} venue totali, ${s["human_reply"] || 0} risposte umane, ${s["no_reply"] || 0} senza risposta.`;
  } catch {
    dashboardContext = "Outreach: dati non disponibili.";
  }

  let twitterContext = "";
  const isTwitterQuestion = /twitter|tweet|post|x\.com|social/i.test(userMessage);
  if (isTwitterQuestion && twitterClient.isConfigured()) {
    try {
      const me = await twitterClient.getMe();
      const result = await twitterClient.getMyRecentTweets(5);
      if (result.success && result.tweets) {
        const lines = [`Twitter @${me?.username || "?"} (${me?.followers || 0} followers)`];
        for (const t of result.tweets) {
          const d = new Date(t.created_at).toLocaleString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          lines.push(`- ${d}: "${t.text.substring(0, 80)}"`);
        }
        twitterContext = lines.join("\n");
      }
    } catch {}
  }

  const systemPrompt = `Sei l'assistente di Alessio "Flutur" per il progetto social-cli-mcp.

CONTESTO ATTUALE:
${dashboardContext}

${twitterContext ? `DATI TWITTER LIVE:\n${twitterContext}` : ""}

Rispondi in italiano, in modo conciso e discorsivo.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : "Nessuna risposta.";
  } catch (error) {
    log.error("Claude API error", { error: String(error) });
    return `Errore API: ${(error as Error).message}`;
  }
}

// ============================================
// MORNING BRIEFING
// ============================================
async function buildMorningBriefing(): Promise<string> {
  const tenantId = getDefaultTenantId();
  const today = new Date().toISOString().split("T")[0];
  const lines: string[] = [];
  lines.push(`MORNING BRIEFING - ${today}\n`);

  try {
    const dashboard = await getConversationDashboard(tenantId);
    const s = dashboard.byStatus;
    lines.push("OUTREACH:");
    lines.push(`Venue totali: ${dashboard.totalVenues}`);
    if (s["human_reply"]) lines.push(`Risposte umane: ${s["human_reply"]}`);
    if (s["in_conversation"]) lines.push(`In conversazione: ${s["in_conversation"]}`);
    if (s["no_reply"]) lines.push(`Nessuna risposta: ${s["no_reply"]}`);
    if (s["bounced"]) lines.push(`Bounce: ${s["bounced"]}`);

    if (dashboard.actionNeeded.length > 0) {
      lines.push(`\nAzione necessaria (${dashboard.actionNeeded.length}):`);
      for (const item of dashboard.actionNeeded.slice(0, 8)) {
        lines.push(`- ${item.venue}: ${item.status} (${item.daysSinceLastActivity}d)`);
      }
    }
  } catch (err) {
    log.warn("morning briefing: dashboard unavailable", { error: String(err) });
    lines.push("Dati outreach non disponibili.");
  }

  try {
    const limits = await getDailyLimits(tenantId);
    lines.push(`\nEmail oggi: ${limits.sent}/${limits.limit} (${limits.remaining} rimanenti)`);
  } catch {}

  return lines.join("\n");
}

// ============================================
// COMMANDS
// ============================================
bot.command("start", async (ctx) => {
  await ctx.reply(
    `Flutur Bot — Social CLI MCP\n\n` +
    `/morning - Briefing giornaliero\n\n` +
    `Azioni sicure (richiedono conferma):\n` +
    `/tweet <testo> - Pubblica tweet\n` +
    `/instagram <url> <caption> - Post Instagram\n` +
    `/reel <url> <caption> - Pubblica Reel\n` +
    `/story <url> - Pubblica Story\n` +
    `/email to|subj|body - Invia email\n` +
    `/pending - Azioni in attesa\n\n` +
    `Status:\n` +
    `/status - Pipeline outreach\n` +
    `/outreach - Dettaglio reply + follow-up\n` +
    `/conversations - Dashboard conversazioni\n` +
    `/pipeline <file> - Genera batch email\n` +
    `/approve - Approva batch\n` +
    `/pstats - Pipeline stats\n\n` +
    `Scrivi qualsiasi domanda e rispondo usando Claude.`,
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `Comandi disponibili:\n\n` +
    `Daily:\n` +
    `/morning - Briefing giornaliero\n\n` +
    `Azioni sicure (con conferma):\n` +
    `/tweet <testo>\n` +
    `/instagram <url> <caption>\n` +
    `/reel <url> <caption>\n` +
    `/story <url>\n` +
    `/email to|subj|body\n` +
    `/pending - Azioni in attesa\n\n` +
    `Outreach:\n` +
    `/status - Stato generale\n` +
    `/outreach - Dettaglio reply\n` +
    `/conversations - Dashboard thread\n` +
    `/pipeline <file> - Genera batch\n` +
    `/approve - Approva batch\n` +
    `/pstats - Stats pipeline\n\n` +
    `Chat libera - scrivi qualsiasi domanda`,
  );
});

// ── /morning ──
bot.command("morning", async (ctx) => {
  const briefing = await buildMorningBriefing();
  await ctx.reply(briefing);
});

// ── /status ──
bot.command("status", async (ctx) => {
  const tenantId = getDefaultTenantId();
  try {
    const dashboard = await getConversationDashboard(tenantId);
    const s = dashboard.byStatus;
    const humanReplies = s["human_reply"] || 0;
    const bounced = s["bounced"] || 0;
    const noReply = s["no_reply"] || 0;
    const total = dashboard.totalVenues;

    const msg =
      `OUTREACH PIPELINE\n\n` +
      `Venue totali: ${total}\n` +
      `Bounce: ${bounced}\n` +
      `Risposte umane: ${humanReplies} (${total > 0 ? ((humanReplies / total) * 100).toFixed(1) : 0}%)\n` +
      `Nessuna risposta: ${noReply}\n` +
      `Azione necessaria: ${dashboard.actionNeeded.length}\n\n` +
      `${new Date().toISOString().split("T")[0]}`;

    await ctx.reply(msg);
  } catch (error) {
    await ctx.reply(`Errore caricamento status: ${(error as Error).message}`);
  }
});

// ── /outreach ──
bot.command("outreach", async (ctx) => {
  const tenantId = getDefaultTenantId();
  try {
    const dashboard = await getConversationDashboard(tenantId);
    let msg = "OUTREACH DETAIL\n\n";

    const replies = dashboard.actionNeeded.filter(
      (item) => item.status === "human_reply" || item.status === "in_conversation",
    );
    if (replies.length > 0) {
      msg += `Risposte (${replies.length}):\n`;
      for (const r of replies) {
        msg += `- ${r.venue} (${r.daysSinceLastActivity}d fa)\n`;
      }
      msg += "\n";
    }

    const needFollowUp = dashboard.actionNeeded.filter(
      (item) => item.status === "no_reply",
    );
    if (needFollowUp.length > 0) {
      msg += `Azione necessaria (${needFollowUp.length}):\n`;
      for (const o of needFollowUp.slice(0, 10)) {
        msg += `- ${o.venue} (${o.daysSinceLastActivity}d)\n`;
      }
      if (needFollowUp.length > 10) msg += `  ... +${needFollowUp.length - 10} altri\n`;
    }

    await ctx.reply(msg);
  } catch (error) {
    await ctx.reply(`Errore: ${(error as Error).message}`);
  }
});

// ── /conversations ──
bot.command("conversations", async (ctx) => {
  const tenantId = getDefaultTenantId();
  try {
    const dashboard = await getConversationDashboard(tenantId);
    const s = dashboard.byStatus;

    let msg = `Outreach Conversations\n\n`;
    msg += `Totale: ${dashboard.totalVenues}\n`;
    if (s["human_reply"]) msg += `Risposte umane: ${s["human_reply"]}\n`;
    if (s["in_conversation"]) msg += `In conversazione: ${s["in_conversation"]}\n`;
    if (s["no_reply"]) msg += `Nessuna risposta: ${s["no_reply"]}\n`;
    if (s["bounced"]) msg += `Bounce: ${s["bounced"]}\n`;

    if (dashboard.actionNeeded.length > 0) {
      msg += `\nAzione necessaria:\n`;
      for (const item of dashboard.actionNeeded.slice(0, 10)) {
        msg += `- ${item.venue}: ${item.status} (${item.daysSinceLastActivity}d)\n`;
      }
    }

    await ctx.reply(msg);
  } catch (err: any) {
    await ctx.reply(`Errore: ${err.message}`);
  }
});

// ── /pending ──
bot.command("pending", async (ctx) => {
  if (pendingActions.size === 0) {
    await ctx.reply("Nessuna azione in attesa di conferma.");
    return;
  }

  let msg = `Azioni in attesa (${pendingActions.size}):\n\n`;
  for (const [, action] of pendingActions) {
    const remainingMin = Math.ceil(
      (action.expiresAt.getTime() - Date.now()) / 60_000,
    );
    msg += `- ${action.type} — scade in ${remainingMin}min\n`;
    msg += `  "${action.preview.substring(0, 50)}..."\n\n`;
  }

  await ctx.reply(msg);
});

// ── /tweet ──
bot.command("tweet", async (ctx) => {
  const text = ctx.message.text.replace("/tweet ", "").trim();

  if (!text || text === "/tweet") {
    await ctx.reply("Uso: /tweet <testo del tweet>");
    return;
  }

  if (!twitterClient.isConfigured()) {
    await ctx.reply("Twitter non configurato.");
    return;
  }

  const actionId = queueAction("tweet", { text }, text);
  const preview = text.length > 200 ? text.substring(0, 200) + "..." : text;

  await ctx.reply(
    `Conferma Tweet\n\n"${preview}"\n\n${text.length}/280 caratteri\nScade in 5 minuti`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Pubblica", `confirm_${actionId}`),
        Markup.button.callback("Annulla", `cancel_${actionId}`),
      ],
    ]),
  );
});

// ── /email ──
bot.command("email", async (ctx) => {
  const args = ctx.message.text.replace("/email ", "").trim();

  if (!args || args === "/email") {
    await ctx.reply(
      "Uso: /email destinatario | oggetto | corpo\n\nSepara con | (pipe)",
    );
    return;
  }

  const parts = args.split("|").map((p) => p.trim());
  if (parts.length < 3) {
    await ctx.reply("Formato: /email to | subject | body");
    return;
  }

  const [to, subject, ...bodyParts] = parts;
  const html = bodyParts.join("|");

  if (!to.includes("@")) {
    await ctx.reply("Email destinatario non valida.");
    return;
  }

  const actionId = queueAction(
    "email",
    { to, subject, html },
    `To: ${to} | ${subject}`,
  );
  const preview = html.length > 100 ? html.substring(0, 100) + "..." : html;

  await ctx.reply(
    `Conferma Email\n\nA: ${to}\nOggetto: ${subject}\n\nCorpo:\n${preview}\n\nScade in 5 minuti`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Invia", `confirm_${actionId}`),
        Markup.button.callback("Annulla", `cancel_${actionId}`),
      ],
    ]),
  );
});

// ── /instagram ──
bot.command("instagram", async (ctx) => {
  const args = ctx.message.text.replace("/instagram ", "").trim();

  if (!args || args === "/instagram") {
    await ctx.reply(
      "Uso: /instagram <url-immagine> <caption>\n\nL'URL deve essere pubblicamente accessibile.",
    );
    return;
  }

  if (!instagramClient.isConfigured()) {
    await ctx.reply("Instagram non configurato.");
    return;
  }

  const parts = args.split(" ");
  const mediaUrl = parts[0];
  const caption = parts.slice(1).join(" ") || "";

  if (!mediaUrl.startsWith("http")) {
    await ctx.reply("URL media non valido. Deve iniziare con http:// o https://");
    return;
  }

  const hashtags = caption.match(/#\w+/g) || [];
  const actionId = queueAction(
    "instagram",
    { mediaUrl, caption, hashtags, postType: "feed" },
    caption || mediaUrl,
  );
  const preview =
    caption.length > 150 ? caption.substring(0, 150) + "..." : caption || "(nessuna caption)";

  await ctx.reply(
    `Conferma Post Instagram\n\nMedia: ${mediaUrl.substring(0, 50)}...\nCaption: "${preview}"\n${hashtags.length > 0 ? `Hashtags: ${hashtags.length}\n` : ""}Scade in 5 minuti`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Pubblica", `confirm_${actionId}`),
        Markup.button.callback("Annulla", `cancel_${actionId}`),
      ],
    ]),
  );
});

// ── /reel ──
bot.command("reel", async (ctx) => {
  const args = ctx.message.text.replace("/reel ", "").trim();

  if (!args || args === "/reel") {
    await ctx.reply(
      "Uso: /reel <url-video> <caption>\n\nVideo max 90 secondi, formato 9:16 consigliato.",
    );
    return;
  }

  if (!instagramClient.isConfigured()) {
    await ctx.reply("Instagram non configurato.");
    return;
  }

  const parts = args.split(" ");
  const mediaUrl = parts[0];
  const caption = parts.slice(1).join(" ") || "";

  if (!mediaUrl.startsWith("http")) {
    await ctx.reply("URL video non valido.");
    return;
  }

  const hashtags = caption.match(/#\w+/g) || [];
  const actionId = queueAction(
    "instagram",
    { mediaUrl, caption, hashtags, postType: "reels" },
    caption || mediaUrl,
  );
  const preview =
    caption.length > 150 ? caption.substring(0, 150) + "..." : caption || "(nessuna caption)";

  await ctx.reply(
    `Conferma Reel Instagram\n\nVideo: ${mediaUrl.substring(0, 50)}...\nCaption: "${preview}"\n${hashtags.length > 0 ? `Hashtags: ${hashtags.length}\n` : ""}Scade in 5 minuti`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Pubblica", `confirm_${actionId}`),
        Markup.button.callback("Annulla", `cancel_${actionId}`),
      ],
    ]),
  );
});

// ── /story ──
bot.command("story", async (ctx) => {
  const args = ctx.message.text.replace("/story ", "").trim();

  if (!args || args === "/story") {
    await ctx.reply(
      "Uso: /story <url-media>\n\nLe storie durano 24 ore. Video max 60 secondi.",
    );
    return;
  }

  if (!instagramClient.isConfigured()) {
    await ctx.reply("Instagram non configurato.");
    return;
  }

  const mediaUrl = args.split(" ")[0];

  if (!mediaUrl.startsWith("http")) {
    await ctx.reply("URL media non valido.");
    return;
  }

  const actionId = queueAction(
    "instagram",
    { mediaUrl, caption: "", postType: "stories" },
    mediaUrl,
  );

  await ctx.reply(
    `Conferma Story Instagram\n\nMedia: ${mediaUrl.substring(0, 60)}...\nScade in 5 minuti`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Pubblica", `confirm_${actionId}`),
        Markup.button.callback("Annulla", `cancel_${actionId}`),
      ],
    ]),
  );
});

// ── /pipeline ──
bot.command("pipeline", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const inputFile = args[0];

  if (!inputFile) {
    await ctx.reply(
      "Uso: /pipeline <venue-json>\n\nEsempio:\n/pipeline content/outreach/venues/portugal.json",
    );
    return;
  }

  const statusMsg = await ctx.reply("Generando email (dry-run)...");
  const tenantId = getDefaultTenantId();

  try {
    const batch = await runPipeline(inputFile, tenantId);

    const emails = batch.result?.generated || [];
    let msg = `Pipeline completata\n\n`;
    msg += `Batch: ${batch.id}\n`;
    msg += `Email: ${batch.emailCount}\n`;
    msg += `Stats: ${batch.result?.stats.totalInput} input -> ${batch.result?.stats.composed} composti -> ${batch.result?.stats.brandPassed} brand pass\n\n`;

    if (emails.length > 0) {
      msg += `Email generate:\n`;
      for (const e of emails.slice(0, 15)) {
        const flag = e._meta?.flaggedForReview ? " (review)" : "";
        msg += `- ${e.venue} | ${e.type} | ${e.video?.split("/").pop() || "N/A"}${flag}\n`;
      }
      if (emails.length > 15) msg += `  ... +${emails.length - 15} altre\n`;
    }

    const rejected = batch.result?.skippedBrand || [];
    if (rejected.length > 0) {
      msg += `\nRifiutati (${rejected.length}):\n`;
      for (const r of rejected) {
        msg += `- ${r.venue}: ${r.issues[0]?.slice(0, 60) || "unknown"}\n`;
      }
    }

    msg += `\nUsa /approve per approvare e inviare.`;

    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      undefined,
      msg,
    );
  } catch (err: any) {
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      undefined,
      `Pipeline fallita: ${err.message}`,
    );
  }
});

// ── /approve ──
bot.command("approve", async (ctx) => {
  const tenantId = getDefaultTenantId();
  try {
    const batches = (await getBatchStatus(tenantId)) as any[];
    const previewBatch = batches.find((b: any) => b.status === "preview");

    if (!previewBatch) {
      await ctx.reply(
        "Nessun batch in attesa di approvazione.\nUsa /pipeline per generarne uno.",
      );
      return;
    }

    const limits = await getDailyLimits(tenantId);

    let msg = `Approva Batch\n\n`;
    msg += `${previewBatch.id}\n`;
    msg += `${previewBatch.emailCount} email pronte\n`;
    msg += `Limite giornaliero: ${limits.sent}/${limits.limit} (${limits.remaining} rimanenti)\n`;

    if (limits.remaining < previewBatch.emailCount) {
      msg += `\nAttenzione: solo ${limits.remaining} email possibili oggi.`;
    }

    const actionId = queueAction(
      "approve_batch",
      { batchId: previewBatch.id },
      `Batch ${previewBatch.id} — ${previewBatch.emailCount} email`,
    );

    await ctx.reply(msg, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Approva & Invia", callback_data: `confirm_${actionId}` },
            { text: "Annulla", callback_data: `cancel_${actionId}` },
          ],
        ],
      },
    });
  } catch (err: any) {
    await ctx.reply(`Errore: ${err.message}`);
  }
});

// ── /pstats ──
bot.command("pstats", async (ctx) => {
  const tenantId = getDefaultTenantId();
  try {
    const limits = await getDailyLimits(tenantId);
    const batches = (await getBatchStatus(tenantId)) as any[];

    let msg = `Pipeline Stats\n\n`;
    msg += `Oggi: ${limits.sent}/${limits.limit} (${limits.remaining} rimanenti)\n\n`;

    if (batches.length === 0) {
      msg += `Nessun batch recente.`;
    } else {
      msg += `Batch recenti:\n`;
      const emojiMap: Record<string, string> = {
        generating: "⏳",
        preview: "👀",
        approved: "✅",
        sending: "📤",
        sent: "📬",
        error: "❌",
      };
      for (const b of batches.slice(0, 5)) {
        const statusEmoji = emojiMap[b.status as string] || "?";
        const date = b.createdAt
          ? new Date(b.createdAt).toLocaleDateString("it-IT")
          : "?";
        msg += `${statusEmoji} ${b.id} | ${b.emailCount} email | ${date}\n`;
      }
    }

    await ctx.reply(msg);
  } catch (err: any) {
    await ctx.reply(`Errore: ${err.message}`);
  }
});

// ============================================
// CONFIRMATION HANDLERS
// ============================================
bot.action(/^confirm_(.+)$/, async (ctx) => {
  const actionId = ctx.match[1];
  const action = pendingActions.get(actionId);

  if (!action) {
    await ctx.answerCbQuery("Azione scaduta o già eseguita");
    await ctx.editMessageText("Azione scaduta. Riprova.");
    return;
  }

  pendingActions.delete(actionId);

  try {
    if (action.type === "tweet") {
      await ctx.editMessageText("Pubblicando tweet...");
      const result = await twitterClient.post({ text: action.data.text });
      if (result.success) {
        await ctx.editMessageText(
          `Tweet pubblicato!\n\n"${action.data.text.substring(0, 100)}..."\n\n${result.url}`,
        );
      } else {
        await ctx.editMessageText(`Errore: ${result.error}`);
      }
    } else if (action.type === "email") {
      await ctx.editMessageText("Inviando email...");
      const result = await gmailSender.send({
        to: action.data.to,
        subject: action.data.subject,
        html: action.data.html,
      });
      if (result.success) {
        await ctx.editMessageText(
          `Email inviata!\n\nA: ${action.data.to}\nOggetto: ${action.data.subject}\n\n${result.messageId}`,
        );
      } else {
        await ctx.editMessageText(`Errore: ${result.error}`);
      }
    } else if (action.type === "approve_batch") {
      await ctx.editMessageText("Approvando e inviando batch...");
      const tenantId = getDefaultTenantId();
      const approved = await approveBatch(action.data.batchId, tenantId);
      const sent = await sendApprovedBatch(approved.id, tenantId);
      const results = sent.sendResults || [];
      const sentCount = results.filter((r: any) => r.status === "sent").length;
      const failedCount = results.filter((r: any) => r.status === "failed").length;
      const dupCount = results.filter((r: any) => r.status === "duplicate").length;
      await ctx.editMessageText(
        `Batch inviato!\n\nInviati: ${sentCount}\nDuplicati: ${dupCount}\nFalliti: ${failedCount}\n${sent.id}`,
      );
    } else if (action.type === "instagram") {
      const postType = action.data.postType || "feed";
      const typeLabel =
        postType === "reels" ? "Reel" : postType === "stories" ? "Story" : "post";
      await ctx.editMessageText(`Pubblicando ${typeLabel} su Instagram...`);

      let result: any;
      if (postType === "reels") {
        result = await instagramClient.postReel(action.data.mediaUrl, action.data.caption, {
          hashtags: action.data.hashtags,
          shareToFeed: true,
        });
      } else if (postType === "stories") {
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
          `Instagram ${typeLabel} pubblicato!\n\n"${action.data.caption.substring(0, 100)}..."\n\n${result.url || result.postId}`,
        );
      } else {
        await ctx.editMessageText(`Errore Instagram: ${result.error}`);
      }
    }

    await ctx.answerCbQuery("Azione eseguita");
  } catch (error) {
    await ctx.answerCbQuery("Errore");
    await ctx.editMessageText(`Errore: ${(error as Error).message}`);
  }
});

bot.action(/^cancel_(.+)$/, async (ctx) => {
  const actionId = ctx.match[1];
  const action = pendingActions.get(actionId);
  if (action) pendingActions.delete(actionId);
  await ctx.answerCbQuery("Annullato");
  await ctx.editMessageText("Azione annullata.");
});

// ============================================
// FREE TEXT — Claude AI (MUST be last handler)
// ============================================
bot.on("text", async (ctx) => {
  const userMessage = ctx.message.text;
  if (userMessage.startsWith("/")) return;

  await ctx.reply("Sto pensando...");

  try {
    const response = await askClaude(userMessage);
    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/gs) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response);
    }
  } catch (error) {
    await ctx.reply(`Errore: ${(error as Error).message}`);
  }
});

// Error handling
bot.catch((err, ctx) => {
  log.error("bot error", { error: String(err) });
  ctx.reply("Si è verificato un errore.");
});

// ============================================
// MORNING NOTIFICATION SCHEDULER
// ============================================
async function sendMorningNotification() {
  if (!ALLOWED_USER_ID) {
    log.warn("TELEGRAM_USER_ID not set — cannot send morning notification");
    return;
  }
  try {
    const briefing = await buildMorningBriefing();
    await bot.telegram.sendMessage(ALLOWED_USER_ID, briefing);
    log.info("morning notification sent");
  } catch (error) {
    log.error("morning notification failed", { error: String(error) });
  }
}

function scheduleMorningNotification() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);

  const msUntilTarget = target.getTime() - now.getTime();
  log.info("morning notification scheduled", { at: target.toISOString() });

  setTimeout(() => {
    sendMorningNotification();
    setInterval(sendMorningNotification, 24 * 60 * 60 * 1000);
  }, msUntilTarget);
}

// ============================================
// LAUNCH
// ============================================
log.info("starting Telegram bot");

bot
  .launch({ dropPendingUpdates: true })
  .then(() => {
    scheduleMorningNotification();
  })
  .catch((err) => {
    log.error("bot launch failed", { error: String(err) });
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
