/**
 * Outreach Conversation Store
 *
 * Unifies sent emails (email table) + received replies (outreach_reply table)
 * into thread views. Links via gmail_thread_id for full conversation history.
 *
 * Architecture:
 *   tracking.json (source of truth for "what we sent")
 *     → email table (persisted in SurrealDB, enriched with gmail_thread_id)
 *       → sent_to relation → venue
 *   outreach_reply table (persisted replies, gmail_message_id dedup)
 *     → memory_link → venue entity
 *
 * Thread linking: gmail_thread_id groups sent + reply messages.
 * Backfill: findThreadByMessageId() resolves RFC2822 Message-ID → gmail_thread_id.
 */

import { getDb } from '../db/client.js';
import { findThreadByMessageId, getThread as getGmailThread, type GmailThread } from '../clients/gmail-reader.js';

// ── Types ──

export interface ThreadMessage {
  direction: 'sent' | 'received';
  from: string;
  to: string;
  subject: string;
  preview: string;
  date: Date;
  emailType?: string;     // initial, followup
  replyType?: string;     // human_reply, auto_reply, bounce
  gmailThreadId?: string;
  messageId?: string;     // RFC2822
  source: 'email' | 'outreach_reply';
  dbId: string;
}

export interface OutreachConversation {
  venue: string;
  venueEmail: string;
  messages: ThreadMessage[];
  status: 'no_reply' | 'auto_reply' | 'human_reply' | 'bounced' | 'in_conversation';
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
export async function getConversation(venue: string): Promise<OutreachConversation | null> {
  const db = await getDb();
  const venueLower = venue.toLowerCase();

  // Get sent emails for this venue
  const [sentRows] = await db.query(`
    SELECT *, sent_at FROM email
    WHERE string::lowercase(subject) CONTAINS $venue
       OR tracking_id CONTAINS $venue
       OR to_address CONTAINS $venue
    ORDER BY sent_at ASC
  `, { venue: venueLower });
  const sent = (sentRows as any[]) || [];

  // Get replies from this venue's domain
  const [replyRows] = await db.query(`
    SELECT *, received_at, created_at FROM outreach_reply
    WHERE string::lowercase(venue) CONTAINS $venue
    ORDER BY received_at ASC
  `, { venue: venueLower });
  const replies = (replyRows as any[]) || [];

  if (sent.length === 0 && replies.length === 0) return null;

  // Build chronological message list
  const messages: ThreadMessage[] = [];

  for (const s of sent) {
    messages.push({
      direction: 'sent',
      from: 'flutur8i8@gmail.com',
      to: s.to_address,
      subject: s.subject,
      preview: (s.body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
      date: new Date(s.sent_at),
      emailType: s.email_type,
      gmailThreadId: s.gmail_thread_id,
      messageId: s.message_id,
      source: 'email',
      dbId: String(s.id),
    });
  }

  for (const r of replies) {
    messages.push({
      direction: 'received',
      from: r.from_email,
      to: 'flutur8i8@gmail.com',
      subject: r.subject,
      preview: (r.preview || r.body_text || '').slice(0, 200),
      date: new Date(r.received_at || r.created_at),
      replyType: r.reply_type,
      gmailThreadId: r.gmail_thread_id,
      source: 'outreach_reply',
      dbId: String(r.id),
    });
  }

  messages.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Determine status
  const hasHumanReply = replies.some((r: any) => r.reply_type === 'human_reply');
  const hasAutoReply = replies.some((r: any) => r.reply_type === 'auto_reply');
  const hasBounce = sent.some((s: any) => s.bounced);
  const hasMultipleExchanges = messages.filter(m => m.direction === 'received').length > 1
    || (messages.filter(m => m.direction === 'sent').length > 1 && hasHumanReply);

  let status: OutreachConversation['status'] = 'no_reply';
  if (hasBounce) status = 'bounced';
  else if (hasMultipleExchanges) status = 'in_conversation';
  else if (hasHumanReply) status = 'human_reply';
  else if (hasAutoReply) status = 'auto_reply';

  const followUpsSent = sent.filter((s: any) => s.email_type === 'followup' || s.followup_sent).length;
  const firstContact = messages[0]?.date || new Date();
  const lastActivity = messages[messages.length - 1]?.date || new Date();
  const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / 86400000);

  // Get thread ID from any message that has one
  const gmailThreadId = messages.find(m => m.gmailThreadId)?.gmailThreadId;

  return {
    venue: sent[0]?.subject?.match(/—\s*(.+)/)?.[1] || venue,
    venueEmail: sent[0]?.to_address || replies[0]?.from_email || '',
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
export async function getConversationDashboard(): Promise<ConversationDashboard> {
  const db = await getDb();

  // Get all unique venues from email table
  const [emailVenues] = await db.query(`
    SELECT to_address, tracking_id, subject, bounced, followup_sent, reply_received, reply_type,
           gmail_thread_id, sent_at
    FROM email ORDER BY sent_at ASC
  `);
  const emails = (emailVenues as any[]) || [];

  // Get all replies
  const [replyData] = await db.query(`
    SELECT venue, from_domain, reply_type, gmail_thread_id, received_at, created_at
    FROM outreach_reply ORDER BY received_at ASC
  `);
  const replies = (replyData as any[]) || [];

  // Group by to_address (one conversation per recipient)
  const byAddress: Record<string, { emails: any[]; replies: any[] }> = {};

  for (const e of emails) {
    const addr = e.to_address?.toLowerCase();
    if (!addr) continue;
    if (!byAddress[addr]) byAddress[addr] = { emails: [], replies: [] };
    byAddress[addr].emails.push(e);
  }

  // Match replies to addresses by domain
  for (const r of replies) {
    const domain = r.from_domain;
    const matchAddr = Object.keys(byAddress).find(a => a.includes(domain));
    if (matchAddr) {
      byAddress[matchAddr].replies.push(r);
    }
  }

  const conversations: OutreachConversation[] = [];
  const byStatus: Record<string, number> = {};

  for (const [addr, data] of Object.entries(byAddress)) {
    const firstEmail = data.emails[0];
    const hasHumanReply = data.replies.some((r: any) => r.reply_type === 'human_reply');
    const hasAutoReply = data.replies.some((r: any) => r.reply_type === 'auto_reply');
    const hasBounce = data.emails.some((e: any) => e.bounced);
    const hasMultipleExchanges = data.replies.length > 1;

    let status: OutreachConversation['status'] = 'no_reply';
    if (hasBounce) status = 'bounced';
    else if (hasMultipleExchanges) status = 'in_conversation';
    else if (hasHumanReply) status = 'human_reply';
    else if (hasAutoReply) status = 'auto_reply';

    const allDates = [
      ...data.emails.map((e: any) => new Date(e.sent_at)),
      ...data.replies.map((r: any) => new Date(r.received_at || r.created_at)),
    ].sort((a, b) => a.getTime() - b.getTime());

    const firstContact = allDates[0] || new Date();
    const lastActivity = allDates[allDates.length - 1] || new Date();
    const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / 86400000);

    const messages: ThreadMessage[] = [
      ...data.emails.map((e: any) => ({
        direction: 'sent' as const,
        from: 'flutur8i8@gmail.com',
        to: addr,
        subject: e.subject,
        preview: '',
        date: new Date(e.sent_at),
        emailType: e.email_type,
        gmailThreadId: e.gmail_thread_id,
        messageId: e.message_id,
        source: 'email' as const,
        dbId: String(e.id),
      })),
      ...data.replies.map((r: any) => ({
        direction: 'received' as const,
        from: r.from_email || `reply@${r.from_domain}`,
        to: 'flutur8i8@gmail.com',
        subject: r.subject || '',
        preview: (r.preview || '').slice(0, 200),
        date: new Date(r.received_at || r.created_at),
        replyType: r.reply_type,
        gmailThreadId: r.gmail_thread_id,
        source: 'outreach_reply' as const,
        dbId: String(r.id),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const conv: OutreachConversation = {
      venue: firstEmail?.subject?.replace(/^(Re: )?Outreach: /, '').replace(/^(Re: )?/, '').split('—')[0]?.trim() || addr,
      venueEmail: addr,
      messages,
      status,
      firstContact,
      lastActivity,
      daysSinceLastActivity,
      followUpsSent: data.emails.filter((e: any) => e.followup_sent || e.email_type === 'followup').length,
      gmailThreadId: data.emails.find((e: any) => e.gmail_thread_id)?.gmail_thread_id,
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
  const actionNeeded = conversations.filter(c =>
    c.status === 'human_reply' || c.status === 'in_conversation'
    || (c.status === 'no_reply' && c.daysSinceLastActivity >= 7 && c.followUpsSent === 0)
  );

  return { totalVenues: conversations.length, conversations, byStatus, actionNeeded };
}

/**
 * Backfill gmail_thread_id on email records by looking up RFC2822 Message-ID in Gmail API.
 * Run once to link existing sent emails to Gmail threads.
 */
export async function backfillThreadIds(): Promise<{ updated: number; skipped: number; failed: number }> {
  const db = await getDb();

  const [rows] = await db.query(`
    SELECT id, message_id, gmail_thread_id FROM email
    WHERE message_id != NONE AND gmail_thread_id = NONE
  `);
  const emails = (rows as any[]) || [];

  let updated = 0, skipped = 0, failed = 0;

  for (const e of emails) {
    if (!e.message_id) { skipped++; continue; }

    const result = await findThreadByMessageId(e.message_id);
    if (result) {
      await db.query(`
        UPDATE type::thing("email", $id) SET
          gmail_thread_id = $threadId,
          gmail_message_id = $gmailMsgId
      `, {
        id: String(e.id).replace('email:', ''),
        threadId: result.threadId,
        gmailMsgId: result.gmailMessageId,
      });
      updated++;
    } else {
      failed++;
    }

    // Rate limit: 100ms between API calls
    await new Promise(r => setTimeout(r, 100));
  }

  return { updated, skipped, failed };
}

/**
 * Get full Gmail thread (live from API) for a venue.
 * Falls back to DB-only view if Gmail is unavailable.
 */
export async function getGmailConversation(venue: string): Promise<GmailThread | null> {
  const db = await getDb();
  const venueLower = venue.toLowerCase();

  // Find gmail_thread_id from email table
  const [rows] = await db.query(`
    SELECT gmail_thread_id, sent_at FROM email
    WHERE gmail_thread_id != NONE
      AND (string::lowercase(subject) CONTAINS $venue OR to_address CONTAINS $venue)
    ORDER BY sent_at ASC LIMIT 1
  `, { venue: venueLower });
  const match = (rows as any[])?.[0];

  if (!match?.gmail_thread_id) return null;

  return getGmailThread(match.gmail_thread_id);
}

/**
 * Sync tracking.json → email table for entries not yet in DB.
 */
export async function syncTrackingToDb(): Promise<{ synced: number; skipped: number }> {
  const fs = await import('fs');
  const trackingPath = 'content/outreach/tracking.json';
  if (!fs.existsSync(trackingPath)) return { synced: 0, skipped: 0 };

  const tracking = JSON.parse(fs.readFileSync(trackingPath, 'utf-8'));
  const db = await getDb();

  let synced = 0, skipped = 0;

  for (const t of tracking) {
    if (!t.id || !t.to || t.status !== 'sent') { skipped++; continue; }

    // Check if already in DB
    const [existing] = await db.query(
      `SELECT id FROM email WHERE tracking_id = $tid LIMIT 1`,
      { tid: t.id },
    );
    if ((existing as any[]).length > 0) { skipped++; continue; }

    // Insert — dynamic SET to avoid NULL on option<T> fields
    const emailId = t.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const params: Record<string, any> = {
      id: emailId,
      subject: `Outreach: ${t.venue}`,
      body: '',
      to: t.to,
      sentAt: t.sentAt || t.timestamp || new Date().toISOString(),
      trackingId: t.id,
      bounced: t.bounced || false,
      followupSent: t.followUpSent || false,
    };

    let setClauses = `
        subject = $subject,
        body = $body,
        to_address = $to,
        sent_at = type::datetime($sentAt),
        email_type = 'initial',
        tracking_id = $trackingId,
        bounced = $bounced,
        followup_sent = $followupSent`;

    if (t.messageId) { setClauses += `, message_id = $messageId`; params.messageId = t.messageId; }
    if (t.bounceReason) { setClauses += `, bounce_reason = $bounceReason`; params.bounceReason = t.bounceReason; }
    if (t.bounceType) { setClauses += `, bounce_type = $bounceType`; params.bounceType = t.bounceType; }
    if (t.followUpSentAt) { setClauses += `, followup_sent_at = type::datetime($followupSentAt)`; params.followupSentAt = t.followUpSentAt; }

    await db.query(`UPSERT type::thing("email", $id) SET ${setClauses}`, params);

    synced++;
  }

  return { synced, skipped };
}

// ── Export ──

export const conversationStore = {
  get: getConversation,
  dashboard: getConversationDashboard,
  backfillThreadIds,
  getGmailThread: getGmailConversation,
  syncTracking: syncTrackingToDb,
};
