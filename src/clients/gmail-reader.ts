/**
 * Gmail API Reader — Replaces IMAP for inbox scanning
 *
 * Auth: gmail-credentials.json + gmail-token.json (OAuth2)
 * Scopes: gmail.readonly + gmail.send
 *
 * Refresh token: npx tsx scripts/refresh-gmail-token.ts
 */

import { google, gmail_v1 } from 'googleapis';
import * as fs from 'fs';
import { getDb } from '../db/client.js';

// ── Types ──

export interface GmailMessage {
  messageId: string;       // Gmail internal ID
  threadId: string;        // Gmail thread ID
  internetMessageId: string; // RFC 2822 Message-ID header (unique across all email)
  from: string;
  fromEmail: string;
  fromDomain: string;
  to: string;
  subject: string;
  date: Date;
  snippet: string;         // Gmail's built-in preview
  bodyText: string;        // Plain text body (truncated)
  labels: string[];
}

export interface InboxScanResult {
  messages: GmailMessage[];
  newCount: number;         // Messages not seen before (not in DB)
  duplicateCount: number;   // Already persisted
  errors: string[];
}

// ── Auth ──

let gmailClient: gmail_v1.Gmail | null = null;

function getGmailClient(): gmail_v1.Gmail {
  if (gmailClient) return gmailClient;

  const credsPath = 'gmail-credentials.json';
  const tokenPath = 'gmail-token.json';

  if (!fs.existsSync(credsPath) || !fs.existsSync(tokenPath)) {
    throw new Error('Gmail OAuth not configured. Run: npx tsx scripts/refresh-gmail-token.ts');
  }

  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  const { client_id, client_secret } = creds.installed || creds.web;

  const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456');
  auth.setCredentials(token);

  // Auto-refresh handler
  auth.on('tokens', (newTokens) => {
    const existing = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    const merged = { ...existing, ...newTokens };
    if (!merged.refresh_token) merged.refresh_token = existing.refresh_token;
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
  });

  gmailClient = google.gmail({ version: 'v1', auth });
  return gmailClient;
}

// ── Header extraction ──

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match ? match[1] : fromHeader).toLowerCase().trim();
}

function extractDomain(email: string): string {
  return email.includes('@') ? email.split('@').pop()!.toLowerCase() : '';
}

function decodeBody(part: gmail_v1.Schema$MessagePart): string {
  if (part.body?.data) {
    return Buffer.from(part.body.data, 'base64url').toString('utf-8');
  }
  if (part.parts) {
    // Find text/plain first, then text/html
    const textPart = part.parts.find(p => p.mimeType === 'text/plain');
    if (textPart) return decodeBody(textPart);
    const htmlPart = part.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart) {
      const html = decodeBody(htmlPart);
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    // Recurse into multipart
    for (const p of part.parts) {
      const result = decodeBody(p);
      if (result) return result;
    }
  }
  return '';
}

// ── Core functions ──

export async function listMessages(query: string, maxResults = 50): Promise<gmail_v1.Schema$Message[]> {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults });
  return res.data.messages || [];
}

export async function getMessage(messageId: string): Promise<GmailMessage | null> {
  const gmail = getGmailClient();
  try {
    const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    const msg = res.data;
    const headers = msg.payload?.headers || [];

    const from = getHeader(headers, 'From');
    const fromEmail = extractEmail(from);

    return {
      messageId: msg.id || '',
      threadId: msg.threadId || '',
      internetMessageId: getHeader(headers, 'Message-ID'),
      from,
      fromEmail,
      fromDomain: extractDomain(fromEmail),
      to: getHeader(headers, 'To'),
      subject: getHeader(headers, 'Subject'),
      date: new Date(parseInt(msg.internalDate || '0')),
      snippet: msg.snippet || '',
      bodyText: msg.payload ? decodeBody(msg.payload).slice(0, 2000) : '',
      labels: msg.labelIds || [],
    };
  } catch {
    return null;
  }
}

/**
 * Scan inbox for outreach replies.
 * Matches against contacted domains from tracking.json.
 * Deduplicates against outreach_reply table by Gmail Message-ID.
 */
export async function scanOutreachReplies(daysBack = 7): Promise<InboxScanResult> {
  // Load tracking to get contacted domains
  const trackingPath = 'content/outreach/tracking.json';
  if (!fs.existsSync(trackingPath)) {
    return { messages: [], newCount: 0, duplicateCount: 0, errors: ['tracking.json not found'] };
  }

  const tracking = JSON.parse(fs.readFileSync(trackingPath, 'utf-8'));
  const domainToVenue: Record<string, string> = {};
  for (const t of tracking) {
    if (t.to?.includes('@')) {
      const domain = t.to.split('@')[1].toLowerCase();
      if (!['gmail.com', 'hotmail.com', 'gmx.de', 'yahoo.com'].includes(domain)) {
        domainToVenue[domain] = t.venue;
      }
    }
  }

  const errors: string[] = [];
  const allMessages: GmailMessage[] = [];

  // Query Gmail: all received messages in last N days, exclude own sent
  const after = new Date();
  after.setDate(after.getDate() - daysBack);
  const afterStr = `${after.getFullYear()}/${after.getMonth() + 1}/${after.getDate()}`;

  const query = `in:inbox after:${afterStr} -from:flutur8i8@gmail.com`;

  let rawMessages: gmail_v1.Schema$Message[];
  try {
    rawMessages = await listMessages(query, 100);
  } catch (e: any) {
    return { messages: [], newCount: 0, duplicateCount: 0, errors: [`Gmail API error: ${e.message}`] };
  }

  // Fetch full messages and filter by contacted domains
  for (const raw of rawMessages) {
    if (!raw.id) continue;
    const msg = await getMessage(raw.id);
    if (!msg) continue;

    // Match against contacted domains
    const matchedDomain = Object.keys(domainToVenue).find(d =>
      msg.fromDomain === d || msg.fromDomain.endsWith('.' + d)
    );

    if (matchedDomain) {
      allMessages.push(msg);
    }
  }

  // Check which messages are already persisted (dedup by Gmail Message-ID)
  const db = await getDb();
  let newCount = 0;
  let duplicateCount = 0;

  for (const msg of allMessages) {
    const [existing] = await db.query(
      `SELECT id FROM outreach_reply WHERE gmail_message_id = $mid LIMIT 1`,
      { mid: msg.messageId },
    );
    if ((existing as any[]).length > 0) {
      duplicateCount++;
    } else {
      newCount++;
    }
  }

  return { messages: allMessages, newCount, duplicateCount, errors };
}

/**
 * Persist a reply to outreach_reply table.
 * Uses Gmail Message-ID as dedup key — safe to call multiple times.
 */
export async function persistReply(msg: GmailMessage, venue: string, replyType: 'human_reply' | 'auto_reply' | 'bounce'): Promise<boolean> {
  const db = await getDb();

  // Dedup check
  const [existing] = await db.query(
    `SELECT id FROM outreach_reply WHERE gmail_message_id = $mid LIMIT 1`,
    { mid: msg.messageId },
  );
  if ((existing as any[]).length > 0) return false; // Already persisted

  const id = `reply_${msg.fromDomain.replace(/[^a-zA-Z0-9]/g, '_')}_${msg.messageId.slice(0, 12)}`;

  await db.query(`
    UPSERT type::thing("outreach_reply", $id) SET
      venue = $venue,
      from_email = $fromEmail,
      from_name = $fromName,
      from_domain = $fromDomain,
      subject = $subject,
      reply_type = $replyType,
      preview = $preview,
      body_text = $bodyText,
      gmail_message_id = $gmailId,
      gmail_thread_id = $threadId,
      internet_message_id = $internetMsgId,
      received_at = type::datetime($receivedAt),
      created_at = time::now()
  `, {
    id,
    venue,
    fromEmail: msg.fromEmail,
    fromName: msg.from,
    fromDomain: msg.fromDomain,
    subject: msg.subject,
    replyType,
    preview: msg.snippet,
    bodyText: msg.bodyText.slice(0, 2000),
    gmailId: msg.messageId,
    threadId: msg.threadId,
    internetMsgId: msg.internetMessageId,
    receivedAt: msg.date.toISOString(),
  });

  // Create memory_link for the venue entity
  const venueEntityId = `venue:${venue.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;
  const linkId = `reply_${id.slice(0, 30)}`;
  await db.query(`
    UPSERT type::thing("memory_link", $linkId) SET
      from_dept = 'marketing',
      to_entity = $entity,
      signal_type = 'observation',
      content = $content,
      sigma = 'σ₁',
      created_at = time::now()
  `, {
    linkId,
    entity: venueEntityId,
    content: `Reply from ${venue} (${replyType}): ${msg.subject}`,
  });

  return true; // New reply persisted
}

/**
 * Classify email type from content.
 */
export function classifyReply(msg: GmailMessage): 'human_reply' | 'auto_reply' | 'bounce' {
  const subj = msg.subject.toLowerCase();
  const body = msg.bodyText.toLowerCase();
  const from = msg.fromEmail.toLowerCase();

  if (from.includes('mailer-daemon') || from.includes('postmaster')) return 'bounce';
  if (subj.includes('delivery') && (subj.includes('fail') || subj.includes('notification'))) return 'bounce';
  if (subj.includes('undeliverable') || subj.includes('returned')) return 'bounce';

  if (subj.includes('automatic reply') || subj.includes('auto-reply') || subj.includes('autoreply')) return 'auto_reply';
  if (subj.includes('out of office') || subj.includes('absence')) return 'auto_reply';
  if (subj.includes('risposta automatica') || subj.includes('fuori ufficio')) return 'auto_reply';
  if (body.includes('this is an automated') || body.includes('auto-reply')) return 'auto_reply';

  return 'human_reply';
}

/**
 * Get all persisted replies (for dashboard / analysis).
 */
export async function getPersistedReplies(limit = 50): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT * FROM outreach_reply ORDER BY received_at DESC LIMIT $limit`,
    { limit },
  );
  return result as any[];
}

/**
 * Check if a specific message is already persisted.
 */
export async function isReplyPersisted(gmailMessageId: string): Promise<boolean> {
  const db = await getDb();
  const [result] = await db.query(
    `SELECT id FROM outreach_reply WHERE gmail_message_id = $mid LIMIT 1`,
    { mid: gmailMessageId },
  );
  return (result as any[]).length > 0;
}

// ── Thread operations ──

export interface GmailThread {
  threadId: string;
  messages: GmailMessage[];
  subject: string;
  participantDomains: string[];
  messageCount: number;
}

/**
 * Fetch a complete Gmail thread (all messages in conversation).
 */
export async function getThread(threadId: string): Promise<GmailThread | null> {
  const gmail = getGmailClient();
  try {
    const res = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
    const thread = res.data;
    const messages: GmailMessage[] = [];

    for (const msg of thread.messages || []) {
      const headers = msg.payload?.headers || [];
      const from = getHeader(headers, 'From');
      const fromEmail = extractEmail(from);

      messages.push({
        messageId: msg.id || '',
        threadId: msg.threadId || '',
        internetMessageId: getHeader(headers, 'Message-ID'),
        from,
        fromEmail,
        fromDomain: extractDomain(fromEmail),
        to: getHeader(headers, 'To'),
        subject: getHeader(headers, 'Subject'),
        date: new Date(parseInt(msg.internalDate || '0')),
        snippet: msg.snippet || '',
        bodyText: msg.payload ? decodeBody(msg.payload).slice(0, 2000) : '',
        labels: msg.labelIds || [],
      });
    }

    const domains = [...new Set(messages.map(m => m.fromDomain))];

    return {
      threadId: thread.id || threadId,
      messages,
      subject: messages[0]?.subject || '',
      participantDomains: domains,
      messageCount: messages.length,
    };
  } catch {
    return null;
  }
}

/**
 * Find Gmail thread ID for a sent message by RFC2822 Message-ID.
 * Used to backfill gmail_thread_id on existing email records.
 */
export async function findThreadByMessageId(rfc2822MessageId: string): Promise<{ gmailMessageId: string; threadId: string } | null> {
  const gmail = getGmailClient();
  try {
    const cleanId = rfc2822MessageId.replace(/[<>]/g, '');
    const res = await gmail.users.messages.list({ userId: 'me', q: `rfc822msgid:${cleanId}`, maxResults: 1 });
    const msg = res.data.messages?.[0];
    if (!msg?.id || !msg.threadId) return null;
    return { gmailMessageId: msg.id, threadId: msg.threadId };
  } catch {
    return null;
  }
}

/**
 * Scan Gmail SENT folder for outreach emails.
 * Returns sent messages with Gmail thread IDs for linking.
 */
export async function scanSentEmails(daysBack = 30, maxResults = 200): Promise<GmailMessage[]> {
  const after = new Date();
  after.setDate(after.getDate() - daysBack);
  const afterStr = `${after.getFullYear()}/${after.getMonth() + 1}/${after.getDate()}`;

  const query = `from:flutur8i8@gmail.com in:sent after:${afterStr}`;

  let rawMessages: gmail_v1.Schema$Message[];
  try {
    rawMessages = await listMessages(query, maxResults);
  } catch {
    return [];
  }

  const results: GmailMessage[] = [];
  for (const raw of rawMessages) {
    if (!raw.id) continue;
    const msg = await getMessage(raw.id);
    if (msg) results.push(msg);
  }

  return results;
}

export const gmailReader = {
  scan: scanOutreachReplies,
  scanSent: scanSentEmails,
  getMessage,
  getThread,
  findThreadByMessageId,
  listMessages,
  persist: persistReply,
  classify: classifyReply,
  getPersisted: getPersistedReplies,
  isPersisted: isReplyPersisted,
};
