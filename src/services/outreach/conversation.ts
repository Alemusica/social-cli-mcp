/**
 * Outreach Conversation Store (Drizzle)
 *
 * Unifies sent emails (email table) + received replies (outreach_reply table)
 * into thread views. Links via gmail_thread_id for full conversation history.
 *
 * Architecture:
 *   email table (persisted in Postgres, enriched with gmail_thread_id)
 *     → email.venueId FK → venue
 *   outreach_reply table (persisted replies, gmail_message_id unique)
 *     → outreachReply.venueId FK → venue
 *
 * Thread linking: gmail_thread_id groups sent + reply messages.
 * Backfill: findThreadByMessageId() resolves RFC2822 Message-ID → gmail_thread_id.
 *
 * Migrated from: src/outreach/conversation-store.ts
 * Change: SurrealDB getDb() → Drizzle ORM
 */

import { db } from "../../db/client.js";
import { email, outreachReply, venue } from "../../db/schema.js";
import { eq, and, or, ilike, isNull, isNotNull, asc, desc, sql } from "drizzle-orm";
import {
  findThreadByMessageId,
  getThread as getGmailThread,
  type GmailThread,
  type GmailMessage,
} from "../platform/gmail.js";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("outreach-conversation");

// ── Types ──

export interface ThreadMessage {
  direction: "sent" | "received";
  from: string;
  to: string;
  subject: string;
  preview: string;
  date: Date;
  emailType?: string;
  replyType?: string;
  gmailThreadId?: string;
  messageId?: string;
  source: "email" | "outreach_reply";
  dbId: string;
}

export interface OutreachConversation {
  venue: string;
  venueEmail: string;
  messages: ThreadMessage[];
  status: "no_reply" | "auto_reply" | "human_reply" | "bounced" | "in_conversation";
  firstContact: Date;
  lastActivity: Date;
  daysSinceLastActivity: number;
  followUpsSent: number;
  gmailThreadId?: string;
}

export interface ConversationDashboard {
  totalVenues: number;
  conversations: OutreachConversation[];
  byStatus: Record<string, number>;
  actionNeeded: OutreachConversation[];
}

// ── Core queries ──

/**
 * Get full conversation for a venue — all sent emails + all replies, ordered chronologically.
 */
export async function getConversation(
  venueName: string,
  tenantId: string,
): Promise<OutreachConversation | null> {
  const venueLower = venueName.toLowerCase();
  const pattern = `%${venueLower}%`;

  // Get sent emails for this venue
  const sent = await db
    .select()
    .from(email)
    .where(
      and(
        eq(email.tenantId, tenantId),
        or(
          ilike(email.subject, pattern),
          ilike(email.toAddress, pattern),
        ),
      ),
    )
    .orderBy(asc(email.sentAt));

  // Get replies — match by venue name in outreach_reply via venueId→venue.name
  const replies = await db
    .select({
      id: outreachReply.id,
      fromAddress: outreachReply.fromAddress,
      fromName: outreachReply.fromName,
      subject: outreachReply.subject,
      bodyPreview: outreachReply.bodyPreview,
      replyType: outreachReply.replyType,
      gmailThreadId: outreachReply.gmailThreadId,
      receivedAt: outreachReply.receivedAt,
      createdAt: outreachReply.createdAt,
      venueName: venue.name,
    })
    .from(outreachReply)
    .leftJoin(venue, eq(outreachReply.venueId, venue.id))
    .where(
      and(
        eq(outreachReply.tenantId, tenantId),
        or(
          ilike(venue.name, pattern),
          ilike(outreachReply.fromAddress, pattern),
        ),
      ),
    )
    .orderBy(asc(outreachReply.receivedAt));

  if (sent.length === 0 && replies.length === 0) return null;

  // Build chronological message list
  const messages: ThreadMessage[] = [];

  for (const s of sent) {
    messages.push({
      direction: "sent",
      from: "flutur8i8@gmail.com",
      to: s.toAddress,
      subject: s.subject,
      preview: (s.body || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
      date: s.sentAt ? new Date(s.sentAt) : new Date(),
      emailType: s.emailType ?? undefined,
      gmailThreadId: s.gmailThreadId ?? undefined,
      messageId: s.messageId ?? undefined,
      source: "email",
      dbId: s.id,
    });
  }

  for (const r of replies) {
    messages.push({
      direction: "received",
      from: r.fromAddress || "",
      to: "flutur8i8@gmail.com",
      subject: r.subject || "",
      preview: (r.bodyPreview || "").slice(0, 200),
      date: r.receivedAt ? new Date(r.receivedAt) : r.createdAt ? new Date(r.createdAt) : new Date(),
      replyType: r.replyType ?? undefined,
      gmailThreadId: r.gmailThreadId ?? undefined,
      source: "outreach_reply",
      dbId: r.id,
    });
  }

  messages.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Determine status
  const hasHumanReply = replies.some((r) => r.replyType === "human_reply");
  const hasAutoReply = replies.some((r) => r.replyType === "auto_reply");
  const hasBounce = replies.some((r) => r.replyType === "bounce");
  const hasMultipleExchanges =
    messages.filter((m) => m.direction === "received").length > 1 ||
    (messages.filter((m) => m.direction === "sent").length > 1 && hasHumanReply);

  let status: OutreachConversation["status"] = "no_reply";
  if (hasBounce) status = "bounced";
  else if (hasMultipleExchanges) status = "in_conversation";
  else if (hasHumanReply) status = "human_reply";
  else if (hasAutoReply) status = "auto_reply";

  const followUpsSent = sent.filter(
    (s) => s.emailType === "followup",
  ).length;
  const firstContact = messages[0]?.date || new Date();
  const lastActivity = messages[messages.length - 1]?.date || new Date();
  const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / 86400000);

  const gmailThreadId = messages.find((m) => m.gmailThreadId)?.gmailThreadId;

  return {
    venue: sent[0]?.subject?.match(/—\s*(.+)/)?.[1] || venueName,
    venueEmail: sent[0]?.toAddress || replies[0]?.fromAddress || "",
    messages,
    status,
    firstContact,
    lastActivity,
    daysSinceLastActivity,
    followUpsSent,
    gmailThreadId,
  };
}

/**
 * Get ALL conversations as a dashboard.
 */
export async function getConversationDashboard(
  tenantId: string,
): Promise<ConversationDashboard> {
  // Get all emails for this tenant
  const emails = await db
    .select()
    .from(email)
    .where(eq(email.tenantId, tenantId))
    .orderBy(asc(email.sentAt));

  // Get all replies for this tenant
  const replyRows = await db
    .select({
      id: outreachReply.id,
      fromAddress: outreachReply.fromAddress,
      fromName: outreachReply.fromName,
      subject: outreachReply.subject,
      bodyPreview: outreachReply.bodyPreview,
      replyType: outreachReply.replyType,
      gmailThreadId: outreachReply.gmailThreadId,
      receivedAt: outreachReply.receivedAt,
      createdAt: outreachReply.createdAt,
      venueId: outreachReply.venueId,
    })
    .from(outreachReply)
    .where(eq(outreachReply.tenantId, tenantId))
    .orderBy(asc(outreachReply.receivedAt));

  // Group by to_address (one conversation per recipient)
  const byAddress: Record<string, { emails: typeof emails; replies: typeof replyRows }> = {};

  for (const e of emails) {
    const addr = e.toAddress.toLowerCase();
    if (!byAddress[addr]) byAddress[addr] = { emails: [], replies: [] };
    byAddress[addr].emails.push(e);
  }

  // Match replies to addresses by domain
  for (const r of replyRows) {
    const fromAddr = r.fromAddress || "";
    const domain = fromAddr.split("@")[1]?.toLowerCase() || "";
    if (!domain) continue;
    const matchAddr = Object.keys(byAddress).find((a) => a.includes(domain));
    if (matchAddr) {
      byAddress[matchAddr].replies.push(r);
    }
  }

  const conversations: OutreachConversation[] = [];
  const byStatus: Record<string, number> = {};

  for (const [addr, data] of Object.entries(byAddress)) {
    const firstEmail = data.emails[0];
    const hasHumanReply = data.replies.some((r) => r.replyType === "human_reply");
    const hasAutoReply = data.replies.some((r) => r.replyType === "auto_reply");
    const hasBounce = data.replies.some((r) => r.replyType === "bounce");
    const hasManualReply = data.emails.some((e) => e.emailType === "manual_reply");
    const hasMultipleExchanges =
      data.replies.length > 1 || (hasHumanReply && hasManualReply);

    let status: OutreachConversation["status"] = "no_reply";
    if (hasBounce) status = "bounced";
    else if (hasMultipleExchanges) status = "in_conversation";
    else if (hasHumanReply && hasManualReply) status = "in_conversation";
    else if (hasHumanReply) status = "human_reply";
    else if (hasAutoReply) status = "auto_reply";

    const allDates = [
      ...data.emails.map((e) => (e.sentAt ? new Date(e.sentAt) : new Date())),
      ...data.replies.map((r) =>
        r.receivedAt ? new Date(r.receivedAt) : r.createdAt ? new Date(r.createdAt) : new Date(),
      ),
    ].sort((a, b) => a.getTime() - b.getTime());

    const firstContact = allDates[0] || new Date();
    const lastActivity = allDates[allDates.length - 1] || new Date();
    const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / 86400000);

    const msgList: ThreadMessage[] = [
      ...data.emails.map(
        (e): ThreadMessage => ({
          direction: "sent",
          from: "flutur8i8@gmail.com",
          to: addr,
          subject: e.subject,
          preview: "",
          date: e.sentAt ? new Date(e.sentAt) : new Date(),
          emailType: e.emailType ?? undefined,
          gmailThreadId: e.gmailThreadId ?? undefined,
          messageId: e.messageId ?? undefined,
          source: "email",
          dbId: e.id,
        }),
      ),
      ...data.replies.map(
        (r): ThreadMessage => ({
          direction: "received",
          from: r.fromAddress || "",
          to: "flutur8i8@gmail.com",
          subject: r.subject || "",
          preview: (r.bodyPreview || "").slice(0, 200),
          date: r.receivedAt ? new Date(r.receivedAt) : r.createdAt ? new Date(r.createdAt) : new Date(),
          replyType: r.replyType ?? undefined,
          gmailThreadId: r.gmailThreadId ?? undefined,
          source: "outreach_reply",
          dbId: r.id,
        }),
      ),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const conv: OutreachConversation = {
      venue:
        firstEmail?.subject
          ?.replace(/^(Re: )?Outreach: /, "")
          .replace(/^(Re: )?/, "")
          .split("—")[0]
          ?.trim() || addr,
      venueEmail: addr,
      messages: msgList,
      status,
      firstContact,
      lastActivity,
      daysSinceLastActivity,
      followUpsSent: data.emails.filter((e) => e.emailType === "followup").length,
      gmailThreadId: data.emails.find((e) => e.gmailThreadId)?.gmailThreadId ?? undefined,
    };

    conversations.push(conv);
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  // Sort: human_reply first, then by last activity
  conversations.sort((a, b) => {
    const statusOrder = { in_conversation: 0, human_reply: 1, auto_reply: 2, no_reply: 3, bounced: 4 };
    const sa = statusOrder[a.status] ?? 5;
    const sb = statusOrder[b.status] ?? 5;
    if (sa !== sb) return sa - sb;
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });

  // Action needed: human replies not yet followed up, or overdue follow-ups
  const actionNeeded = conversations.filter(
    (c) =>
      c.status === "human_reply" ||
      c.status === "in_conversation" ||
      (c.status === "no_reply" && c.daysSinceLastActivity >= 7 && c.followUpsSent === 0),
  );

  return { totalVenues: conversations.length, conversations, byStatus, actionNeeded };
}

/**
 * Backfill gmail_thread_id on email records by looking up RFC2822 Message-ID in Gmail API.
 * Run once to link existing sent emails to Gmail threads.
 */
export async function backfillThreadIds(
  tenantId: string,
): Promise<{ updated: number; skipped: number; failed: number }> {
  // Get emails with message_id but no gmail_thread_id
  const rows = await db
    .select({ id: email.id, messageId: email.messageId, gmailThreadId: email.gmailThreadId })
    .from(email)
    .where(
      and(
        eq(email.tenantId, tenantId),
        isNotNull(email.messageId),
        isNull(email.gmailThreadId),
      ),
    );

  let updated = 0,
    skipped = 0,
    failed = 0;

  for (const e of rows) {
    if (!e.messageId) {
      skipped++;
      continue;
    }

    const result = await findThreadByMessageId(e.messageId);
    if (result) {
      await db
        .update(email)
        .set({ gmailThreadId: result.threadId })
        .where(eq(email.id, e.id));
      updated++;
    } else {
      failed++;
    }

    // Rate limit: 100ms between API calls
    await new Promise((r) => setTimeout(r, 100));
  }

  log.info("backfillThreadIds complete", { updated, skipped, failed });
  return { updated, skipped, failed };
}

/**
 * Get full Gmail thread (live from API) for a venue.
 * Falls back to DB-only view if Gmail is unavailable.
 */
export async function getGmailConversation(
  venueName: string,
  tenantId: string,
): Promise<GmailThread | null> {
  const pattern = `%${venueName.toLowerCase()}%`;

  // Find gmail_thread_id from email table
  const rows = await db
    .select({ gmailThreadId: email.gmailThreadId, sentAt: email.sentAt })
    .from(email)
    .where(
      and(
        eq(email.tenantId, tenantId),
        isNotNull(email.gmailThreadId),
        or(ilike(email.subject, pattern), ilike(email.toAddress, pattern)),
      ),
    )
    .orderBy(asc(email.sentAt))
    .limit(1);

  const match = rows[0];
  if (!match?.gmailThreadId) return null;

  return getGmailThread(match.gmailThreadId);
}

/**
 * Sync manual sent messages — finds YOUR replies sent directly from Gmail
 * that the system doesn't know about.
 *
 * For each outreach thread (from outreach_reply.gmail_thread_id),
 * fetches the full thread from Gmail API and persists any sent messages
 * from flutur8i8@gmail.com that aren't already in the email table.
 */
export async function syncManualSentMessages(
  tenantId: string,
): Promise<{ found: number; persisted: number; errors: number }> {
  // Get all unique thread IDs from replies
  const replyThreadRows = await db
    .select({ gmailThreadId: outreachReply.gmailThreadId, venueId: outreachReply.venueId })
    .from(outreachReply)
    .where(
      and(
        eq(outreachReply.tenantId, tenantId),
        isNotNull(outreachReply.gmailThreadId),
      ),
    );

  // Also from email table
  const emailThreadRows = await db
    .select({ gmailThreadId: email.gmailThreadId })
    .from(email)
    .where(
      and(
        eq(email.tenantId, tenantId),
        isNotNull(email.gmailThreadId),
      ),
    );

  // Merge all known thread IDs
  const threadMap = new Map<string, string>(); // threadId → venueId
  for (const r of replyThreadRows) {
    if (r.gmailThreadId) threadMap.set(r.gmailThreadId, r.venueId || "");
  }
  for (const e of emailThreadRows) {
    if (e.gmailThreadId && !threadMap.has(e.gmailThreadId)) {
      threadMap.set(e.gmailThreadId, "");
    }
  }

  let found = 0,
    persisted = 0,
    errors = 0;

  for (const [threadId, venueId] of threadMap) {
    try {
      const thread = await getGmailThread(threadId);
      if (!thread) continue;

      // Find messages FROM us
      const ourMessages = thread.messages.filter(
        (m: GmailMessage) => m.fromEmail === "flutur8i8@gmail.com",
      );

      for (const msg of ourMessages) {
        // Check if already in email table by messageId (internet message ID / RFC2822)
        if (msg.internetMessageId) {
          const existing = await db
            .select({ id: email.id })
            .from(email)
            .where(
              and(
                eq(email.tenantId, tenantId),
                eq(email.messageId, msg.internetMessageId),
              ),
            )
            .limit(1);

          if (existing.length > 0) {
            // Record exists — backfill gmail_thread_id if missing
            await db
              .update(email)
              .set({ gmailThreadId: threadId })
              .where(
                and(
                  eq(email.id, existing[0].id),
                  isNull(email.gmailThreadId),
                ),
              );
            continue;
          }
        }

        // Check by gmailThreadId + toAddress combo to avoid duplicates
        const toEmail = (msg.to.match(/<([^>]+)>/)?.[1] || msg.to).toLowerCase();
        const existByThread = await db
          .select({ id: email.id })
          .from(email)
          .where(
            and(
              eq(email.tenantId, tenantId),
              eq(email.gmailThreadId, threadId),
              ilike(email.toAddress, toEmail),
              eq(email.emailType, "manual_reply"),
            ),
          )
          .limit(1);

        if (existByThread.length > 0) continue;

        // New manual sent message — persist it
        found++;
        await db.insert(email).values({
          tenantId,
          subject: msg.subject,
          body: msg.bodyText.slice(0, 2000),
          toAddress: toEmail,
          sentAt: msg.date,
          emailType: "manual_reply",
          gmailThreadId: threadId,
          messageId: msg.internetMessageId || null,
          venueId: venueId || null,
        });
        persisted++;
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      log.error("syncManualSent error for thread", { threadId, error: String(err) });
      errors++;
    }
  }

  log.info("syncManualSent complete", { found, persisted, errors });
  return { found, persisted, errors };
}

/**
 * Persist a manually-sent email from Gmail to the email table.
 * Direction: manual_reply. Dedup by messageId (RFC2822).
 * Called by morning-check after scanning sent folder.
 */
export async function persistManualSentEmail(
  msg: GmailMessage,
  venueName: string,
  tenantId: string,
): Promise<boolean> {
  // Dedup: check by internet message ID (RFC2822)
  if (msg.internetMessageId) {
    const existing = await db
      .select({ id: email.id })
      .from(email)
      .where(
        and(
          eq(email.tenantId, tenantId),
          eq(email.messageId, msg.internetMessageId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Record exists from pipeline — just backfill gmail IDs if missing
      await db
        .update(email)
        .set({ gmailThreadId: msg.threadId })
        .where(
          and(eq(email.id, existing[0].id), isNull(email.gmailThreadId)),
        );
      return false;
    }
  }

  // Look up venue by name to get venueId FK
  const venueRow = await db
    .select({ id: venue.id })
    .from(venue)
    .where(and(eq(venue.tenantId, tenantId), ilike(venue.name, `%${venueName}%`)))
    .limit(1);

  const toEmail = (msg.to.match(/<([^>]+)>/)?.[1] || msg.to).toLowerCase();

  try {
    await db.insert(email).values({
      tenantId,
      subject: msg.subject,
      body: msg.bodyText.slice(0, 2000),
      toAddress: toEmail,
      sentAt: msg.date,
      emailType: "manual_reply",
      gmailThreadId: msg.threadId,
      messageId: msg.internetMessageId || null,
      venueId: venueRow[0]?.id || null,
    });
  } catch {
    // UNIQUE index conflict — skip silently
    return false;
  }

  return true;
}

// ── Export ──

export const conversationStore = {
  get: getConversation,
  dashboard: getConversationDashboard,
  backfillThreadIds,
  getGmailThread: getGmailConversation,
  syncManualSent: syncManualSentMessages,
  persistManualSent: persistManualSentEmail,
};
