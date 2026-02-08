import * as fs from 'fs';
import * as path from 'path';

const TRACKING_FILE = path.join(process.cwd(), 'content/outreach/tracking.json');
const SEND_LOG_FILE = path.join(process.cwd(), 'logs/send-log.json');
const DAILY_LIMIT = 25;

interface SendLogEntry {
  to: string;
  venue: string;
  date: string;
  timestamp: string;
}

/**
 * Load send log (append-only daily record)
 */
function loadSendLog(): SendLogEntry[] {
  try {
    if (fs.existsSync(SEND_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(SEND_LOG_FILE, 'utf-8'));
    }
  } catch { /* corrupt file */ }
  return [];
}

function saveSendLog(log: SendLogEntry[]) {
  const dir = path.dirname(SEND_LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SEND_LOG_FILE, JSON.stringify(log, null, 2));
}

/**
 * Check if an email was already sent to a recipient today.
 * Uses local tracking file — NO external API dependency.
 * FAIL-CLOSED: if anything is wrong, BLOCKS the send.
 */
export async function wasEmailSentToday(to: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const toLC = to.toLowerCase();

  // Check send log
  const log = loadSendLog();
  const sentToday = log.some(e => e.to.toLowerCase() === toLC && e.date === today);

  if (sentToday) {
    console.log(`DUPLICATE BLOCKED: Already sent to ${to} today (send-log)`);
    return true;
  }

  // Check tracking.json
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const tracking = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
      const alreadyTracked = tracking.some((t: any) =>
        t.to?.toLowerCase() === toLC && t.status === 'sent'
      );
      if (alreadyTracked) {
        console.log(`DUPLICATE BLOCKED: Already in tracking for ${to}`);
        return true;
      }
    }
  } catch {
    // Tracking file corrupt — fail closed
    console.error(`SEND BLOCKED: Cannot read tracking file. Fix before sending.`);
    return true;
  }

  return false;
}

/**
 * Check if daily send limit has been reached.
 * FAIL-CLOSED.
 */
export function isDailyLimitReached(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const log = loadSendLog();
  const todayCount = log.filter(e => e.date === today).length;

  if (todayCount >= DAILY_LIMIT) {
    console.error(`DAILY LIMIT REACHED: ${todayCount}/${DAILY_LIMIT} emails sent today. Blocking.`);
    return true;
  }

  return false;
}

/**
 * Record a sent email in the send log.
 */
export function recordSend(to: string, venue: string) {
  const log = loadSendLog();
  log.push({
    to,
    venue,
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
  });
  saveSendLog(log);
}

/**
 * Get today's send count.
 */
export function getTodaySendCount(): number {
  const today = new Date().toISOString().split('T')[0];
  const log = loadSendLog();
  return log.filter(e => e.date === today).length;
}

/**
 * Safe email sender with duplicate check and daily limit.
 * FAIL-CLOSED: blocks on any error.
 */
export async function safeSendEmail(
  transporter: any,
  options: { from: string; to: string; subject: string; html: string; venue?: string }
): Promise<{ success: boolean; messageId?: string; blocked?: boolean; error?: string }> {

  // Check daily limit
  if (isDailyLimitReached()) {
    return { success: false, blocked: true, error: 'Daily send limit reached' };
  }

  // Check for duplicates
  const alreadySent = await wasEmailSentToday(options.to);
  if (alreadySent) {
    return { success: false, blocked: true, error: `Duplicate: already sent to ${options.to}` };
  }

  try {
    const info = await transporter.sendMail(options);
    // Record successful send
    recordSend(options.to, options.venue || 'unknown');
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
