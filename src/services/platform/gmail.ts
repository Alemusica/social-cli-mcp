/**
 * Gmail Platform Client
 * Pure API client — no DB writes.
 * Combines Gmail API reading (OAuth2) and Gmail SMTP sending (nodemailer).
 *
 * Auth (reading): gmail-credentials.json + gmail-token.json (OAuth2)
 * Auth (sending): GMAIL_USER + GMAIL_APP_PASSWORD env vars
 * Refresh token: npx tsx scripts/refresh-gmail-token.ts
 */

import { google, gmail_v1 } from 'googleapis';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('gmail');

// ── Types ──

export interface ThreadContext {
  threadMessageCount: number;
  lastMessageBy: 'us' | 'them';
  lastMessageDate: Date;
  ourRepliesCount: number;
  theirRepliesCount: number;
}

export interface GmailMessage {
  messageId: string;
  threadId: string;
  internetMessageId: string;
  from: string;
  fromEmail: string;
  fromDomain: string;
  to: string;
  subject: string;
  date: Date;
  snippet: string;
  bodyText: string;
  labels: string[];
  threadContext?: ThreadContext;
}

export interface GmailThread {
  threadId: string;
  messages: GmailMessage[];
  subject: string;
  participantDomains: string[];
  messageCount: number;
}

export interface InboxScanResult {
  messages: GmailMessage[];
  /** All messages returned — dedup tracking is caller responsibility */
  totalCount: number;
  errors: string[];
  domainToVenue: Record<string, string>;
}

export interface SentScanResult {
  messages: GmailMessage[];
  totalCount: number;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── Gmail OAuth Auth ──

let _gmailApiClient: gmail_v1.Gmail | null = null;

function getGmailClient(): gmail_v1.Gmail {
  if (_gmailApiClient) return _gmailApiClient;

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
    log.info('token refreshed');
  });

  _gmailApiClient = google.gmail({ version: 'v1', auth });
  return _gmailApiClient;
}

// ── Header / body helpers ──

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
    const textPart = part.parts.find(p => p.mimeType === 'text/plain');
    if (textPart) return decodeBody(textPart);
    const htmlPart = part.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart) {
      const html = decodeBody(htmlPart);
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    for (const p of part.parts) {
      const result = decodeBody(p);
      if (result) return result;
    }
  }
  return '';
}

// ── Core read API ──

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
 * Scan for outreach replies from known venue domains.
 * domainToVenue map must be provided by the caller (loaded from DB/tracking.json).
 * Returns raw messages — dedup and persistence are caller responsibility.
 */
export async function scanOutreachReplies(
  domainToVenue: Record<string, string>,
  daysBack = 7,
  ourEmail = 'flutur8i8@gmail.com'
): Promise<InboxScanResult> {
  const errors: string[] = [];
  const allMessages: GmailMessage[] = [];

  const domains = Object.keys(domainToVenue);
  if (domains.length === 0) {
    return { messages: [], totalCount: 0, errors: ['No domains provided'], domainToVenue };
  }

  const after = new Date();
  after.setDate(after.getDate() - daysBack);
  const afterStr = `${after.getFullYear()}/${after.getMonth() + 1}/${after.getDate()}`;

  // Batch domains — Gmail query max ~4000 chars, ~80 domains per batch
  const BATCH_SIZE = 80;
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    const fromClause = batch.map(d => `from:${d}`).join(' OR ');
    const query = `(${fromClause}) after:${afterStr}`;

    let rawMessages: gmail_v1.Schema$Message[];
    try {
      rawMessages = await listMessages(query, 200);
    } catch (e: any) {
      errors.push(`Gmail API error (batch ${i / BATCH_SIZE}): ${e.message}`);
      continue;
    }

    for (const raw of rawMessages) {
      if (!raw.id) continue;
      const msg = await getMessage(raw.id);
      if (!msg) continue;
      // Exclude our own sent messages appearing in threads
      if (msg.fromEmail === ourEmail) continue;
      allMessages.push(msg);
    }
  }

  // Enrich with thread context
  const threadIds = [...new Set(allMessages.map(m => m.threadId))];
  const threadCache = new Map<string, GmailThread>();

  for (const tid of threadIds) {
    const thread = await getThread(tid);
    if (thread) threadCache.set(tid, thread);
  }

  for (const msg of allMessages) {
    const thread = threadCache.get(msg.threadId);
    if (!thread) continue;

    const sorted = [...thread.messages].sort((a, b) => a.date.getTime() - b.date.getTime());
    const lastMsg = sorted[sorted.length - 1];
    const ourCount = thread.messages.filter(m => m.fromEmail === ourEmail).length;
    const theirCount = thread.messages.length - ourCount;

    msg.threadContext = {
      threadMessageCount: thread.messages.length,
      lastMessageBy: lastMsg.fromEmail === ourEmail ? 'us' : 'them',
      lastMessageDate: lastMsg.date,
      ourRepliesCount: ourCount,
      theirRepliesCount: theirCount,
    };
  }

  return { messages: allMessages, totalCount: allMessages.length, errors, domainToVenue };
}

/**
 * Scan Gmail SENT folder.
 * Returns all sent messages — filtering and dedup are caller responsibility.
 */
export async function scanSentEmails(daysBack = 30, maxResults = 200): Promise<SentScanResult> {
  const after = new Date();
  after.setDate(after.getDate() - daysBack);
  const afterStr = `${after.getFullYear()}/${after.getMonth() + 1}/${after.getDate()}`;

  const query = `from:flutur8i8@gmail.com in:sent after:${afterStr}`;

  let rawMessages: gmail_v1.Schema$Message[];
  try {
    rawMessages = await listMessages(query, maxResults);
  } catch (e: any) {
    log.error('scanSentEmails failed', { error: e.message });
    return { messages: [], totalCount: 0 };
  }

  const results: GmailMessage[] = [];
  for (const raw of rawMessages) {
    if (!raw.id) continue;
    const msg = await getMessage(raw.id);
    if (msg) results.push(msg);
  }

  return { messages: results, totalCount: results.length };
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

// ── SMTP Sender ──

export class GmailSender {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string = '';

  constructor(config?: { user: string; appPassword: string }) {
    if (config?.user && config?.appPassword) {
      this.fromEmail = config.user;
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.appPassword,
        },
      });
    }
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      log.info('SMTP connected', { from: this.fromEmail });
      return true;
    } catch (error: any) {
      log.error('SMTP connection failed', { error: error.message });
      return false;
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email client not configured',
      };
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: any) {
      log.error('send failed', { to: options.to, error: error.message });
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send outreach email with built-in template
   */
  async sendOutreach(
    to: string,
    template: 'podcast' | 'collaboration' | 'introduction',
    variables: Record<string, string>
  ): Promise<EmailResult> {
    const templates = {
      podcast: {
        subject: `Podcast Guest Pitch: ${variables.angle || 'Unique Story to Share'}`,
        html: `
          <p>Hi ${variables.name || 'there'},</p>

          <p>${variables.opening || 'I discovered your podcast and thought my story might resonate with your audience.'}</p>

          <p><strong>Quick intro:</strong></p>
          <ul>
            <li>🎵 <strong>Flutur</strong> - Multi-instrumentalist (RAV Vast + live looping), Greece's Got Talent</li>
            <li>💻 <strong>jsOM</strong> - AI tool giving UI designers their place in the LLM era</li>
          </ul>

          <p>I call it the "M-shaped mind" - deep expertise in music + code, connected by creativity.</p>

          <p>${variables.customMessage || ''}</p>

          <p>Would love to share this perspective. Happy to chat first!</p>

          <p>Best,<br>Alessio</p>

          <p style="color: #666; font-size: 12px;">
            Links:
            <a href="https://instagram.com/flutur_8">Music</a> |
            <a href="https://github.com/AlessioIan/jsom">jsOM</a>
          </p>
        `,
      },
      collaboration: {
        subject: `Collaboration Opportunity: ${variables.topic || 'Creative Partnership'}`,
        html: `
          <p>Hi ${variables.name || 'there'},</p>

          <p>${variables.opening || 'I love your work and see potential for an exciting collaboration.'}</p>

          <p>${variables.pitch || ''}</p>

          <p>Let me know if you'd be interested in exploring this!</p>

          <p>Best,<br>Alessio</p>
        `,
      },
      introduction: {
        subject: variables.subject || 'Quick Introduction',
        html: `
          <p>Hi ${variables.name || 'there'},</p>

          <p>${variables.message || ''}</p>

          <p>Best,<br>Alessio</p>
        `,
      },
    };

    const tmpl = templates[template];

    return this.send({
      to,
      subject: tmpl.subject,
      html: tmpl.html,
    });
  }
}

/**
 * Load GmailSender from environment variables.
 */
export function loadGmailSender(): GmailSender {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (user && appPassword) {
    return new GmailSender({ user, appPassword });
  }

  return new GmailSender();
}

/**
 * Unified gmail client object (matches existing gmailReader API surface).
 */
export const gmailClient = {
  // Reading
  listMessages,
  getMessage,
  getThread,
  findThreadByMessageId,
  scanReplies: scanOutreachReplies,
  scanSent: scanSentEmails,
  classify: classifyReply,
  // Sending
  createSender: loadGmailSender,
};
