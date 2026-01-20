import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Check if an email was already sent to a recipient today
 * Prevents duplicate sends
 */
export async function wasEmailSentToday(to: string): Promise<boolean> {
  try {
    const credentialsPath = path.join(process.cwd(), 'gmail-credentials.json');
    const tokenPath = path.join(process.cwd(), 'gmail-token.json');

    if (!fs.existsSync(credentialsPath) || !fs.existsSync(tokenPath)) {
      console.warn('Gmail OAuth not configured, skipping duplicate check');
      return false;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const { client_id, client_secret } = credentials.installed || credentials.web;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials(token);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get today's date in YYYY/MM/DD format
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `in:sent to:${to} after:${today}`,
      maxResults: 1
    });

    const alreadySent = !!(res.data.messages && res.data.messages.length > 0);

    if (alreadySent) {
      console.log(`⚠️ DUPLICATE BLOCKED: Email already sent to ${to} today`);
    }

    return alreadySent;
  } catch (err) {
    console.warn('Error checking for duplicates:', (err as Error).message);
    return false; // Allow send on error (fail open)
  }
}

/**
 * Safe email sender with duplicate check
 */
export async function safeSendEmail(
  transporter: any,
  options: { from: string; to: string; subject: string; html: string }
): Promise<{ success: boolean; messageId?: string; blocked?: boolean; error?: string }> {

  // Check for duplicates first
  const alreadySent = await wasEmailSentToday(options.to);

  if (alreadySent) {
    return {
      success: false,
      blocked: true,
      error: `Duplicate blocked: already sent to ${options.to} today`
    };
  }

  try {
    const info = await transporter.sendMail(options);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
