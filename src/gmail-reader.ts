/**
 * Gmail API Reader - OAuth2 based inbox reading
 * For searching venue booking emails and follow-ups
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { URL } from 'url';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'gmail-token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'gmail-credentials.json');

interface Credentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface VenueEmail {
  id: string;
  threadId: string;
  subject: string;
  to: string;
  from: string;
  date: string;
  snippet: string;
  body?: string;
}

/**
 * Load credentials from file
 */
function loadCredentials(): Credentials {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client(credentials: Credentials) {
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

/**
 * Get new token via browser authorization
 */
async function getNewToken(oAuth2Client: any): Promise<any> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 Authorize this app by visiting this URL:\n');
  console.log(authUrl);
  console.log('\n⏳ Waiting for authorization...\n');

  // Start local server to receive the callback
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost`);
        const code = url.searchParams.get('code');

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>✅ Authorization successful!</h1><p>You can close this window.</p>');

          server.close();

          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);

          // Save token for future use
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          console.log('✅ Token saved to', TOKEN_PATH);

          resolve(oAuth2Client);
        }
      } catch (error) {
        reject(error);
      }
    });

    server.listen(80, () => {
      console.log('📡 Listening on http://localhost for OAuth callback...');
    });

    // Try port 3000 if port 80 fails
    server.on('error', () => {
      server.listen(3000, () => {
        console.log('📡 Listening on http://localhost:3000 for OAuth callback...');
      });
    });
  });
}

/**
 * Authorize and get Gmail client
 */
async function authorize(): Promise<any> {
  const credentials = loadCredentials();
  const oAuth2Client = createOAuth2Client(credentials);

  // Check if we have a saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
    console.log('✅ Using saved token');
    return oAuth2Client;
  }

  // Get new token
  return getNewToken(oAuth2Client);
}

/**
 * Search emails with query
 */
async function searchEmails(auth: any, query: string, maxResults = 50): Promise<VenueEmail[]> {
  const gmail = google.gmail({ version: 'v1', auth });

  console.log(`\n🔍 Searching: "${query}"\n`);

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  const messages = res.data.messages || [];
  console.log(`📧 Found ${messages.length} emails\n`);

  const emails: VenueEmail[] = [];

  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: message.id!,
      format: 'full',
    });

    const headers = msg.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    emails.push({
      id: message.id!,
      threadId: message.threadId!,
      subject: getHeader('subject'),
      to: getHeader('to'),
      from: getHeader('from'),
      date: getHeader('date'),
      snippet: msg.data.snippet || '',
    });
  }

  return emails;
}

/**
 * Get full email body
 */
async function getEmailBody(auth: any, messageId: string): Promise<string> {
  const gmail = google.gmail({ version: 'v1', auth });

  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const payload = msg.data.payload;
  let body = '';

  function decodeBase64(data: string): string {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  }

  function extractBody(part: any): string {
    if (part.body?.data) {
      return decodeBase64(part.body.data);
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        const content = extractBody(subPart);
        if (content) return content;
      }
    }
    return '';
  }

  body = extractBody(payload);
  return body;
}

/**
 * Search for venue booking emails from September
 */
async function findVenueEmails(): Promise<VenueEmail[]> {
  const auth = await authorize();

  // Search for emails sent by me in September about venues/booking/gigs
  const queries = [
    'from:me after:2025/09/01 before:2025/10/01 (venue OR booking OR gig OR concert OR live OR performance)',
    'from:me after:2025/09/01 before:2025/10/01 (locale OR concerto OR esibizione OR prenotazione)',
  ];

  const allEmails: VenueEmail[] = [];
  const seenIds = new Set<string>();

  for (const query of queries) {
    const emails = await searchEmails(auth, query);
    for (const email of emails) {
      if (!seenIds.has(email.id)) {
        seenIds.add(email.id);
        allEmails.push(email);
      }
    }
  }

  return allEmails;
}

/**
 * Save venue contacts to file
 */
function saveVenueContacts(emails: VenueEmail[], outputPath: string) {
  const contacts = emails.map(e => ({
    to: e.to,
    subject: e.subject,
    date: e.date,
    snippet: e.snippet,
  }));

  fs.writeFileSync(outputPath, JSON.stringify(contacts, null, 2));
  console.log(`\n💾 Saved ${contacts.length} venue contacts to ${outputPath}`);
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'venues':
      console.log('🎵 Searching for venue booking emails from September...\n');
      const venueEmails = await findVenueEmails();

      console.log('\n📋 Venue Emails Found:\n');
      for (const email of venueEmails) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📧 To: ${email.to}`);
        console.log(`📌 Subject: ${email.subject}`);
        console.log(`📅 Date: ${email.date}`);
        console.log(`💬 ${email.snippet.substring(0, 100)}...`);
      }

      saveVenueContacts(venueEmails, 'content/outreach/venue-contacts-sept.json');
      break;

    case 'search':
      const query = process.argv.slice(3).join(' ');
      if (!query) {
        console.log('Usage: npx ts-node src/gmail-reader.ts search <query>');
        process.exit(1);
      }
      const auth = await authorize();
      const results = await searchEmails(auth, query);

      for (const email of results) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📧 From: ${email.from}`);
        console.log(`📌 Subject: ${email.subject}`);
        console.log(`📅 Date: ${email.date}`);
        console.log(`💬 ${email.snippet.substring(0, 150)}...`);
      }
      break;

    case 'auth':
      console.log('🔐 Starting OAuth authorization...');
      await authorize();
      console.log('✅ Authorization complete!');
      break;

    default:
      console.log(`
Gmail Reader - Venue Email Search

Commands:
  npx ts-node src/gmail-reader.ts auth      - Authorize with Google
  npx ts-node src/gmail-reader.ts venues    - Find September venue emails
  npx ts-node src/gmail-reader.ts search <query> - Custom email search

Examples:
  npx ts-node src/gmail-reader.ts search "from:me venue booking"
  npx ts-node src/gmail-reader.ts search "after:2025/08/01 before:2025/09/01 gig"
      `);
  }
}

main().catch(console.error);
