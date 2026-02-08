import { google } from 'googleapis';
import * as fs from 'fs';

async function main() {
  const creds = JSON.parse(fs.readFileSync('gmail-credentials.json', 'utf-8'));
  const token = JSON.parse(fs.readFileSync('gmail-token.json', 'utf-8'));
  const { client_id, client_secret } = creds.installed || creds.web;
  const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456');
  auth.setCredentials(token);

  const gmail = google.gmail({ version: 'v1', auth });
  try {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log('OK:', profile.data.emailAddress, '| Messages:', profile.data.messagesTotal);

    // Test: list last 5 messages
    const list = await gmail.users.messages.list({ userId: 'me', maxResults: 5 });
    console.log('Last 5 message IDs:', list.data.messages?.map(m => m.id));
  } catch (e: any) {
    if (e.message?.includes('invalid_grant') || e.message?.includes('Token has been expired')) {
      // Try refresh
      try {
        console.log('Token expired, attempting refresh...');
        const { credentials: newToken } = await auth.refreshAccessToken();
        if (!newToken.refresh_token) newToken.refresh_token = token.refresh_token;
        fs.writeFileSync('gmail-token.json', JSON.stringify(newToken, null, 2));
        console.log('Token refreshed. Re-testing...');

        const gmail2 = google.gmail({ version: 'v1', auth });
        const profile = await gmail2.users.getProfile({ userId: 'me' });
        console.log('OK after refresh:', profile.data.emailAddress);
      } catch (e2: any) {
        console.log('REFRESH FAILED — need full re-auth: npx tsx scripts/refresh-gmail-token.ts');
        console.log('Error:', e2.message?.substring(0, 200));
      }
    } else {
      console.log('ERROR:', e.message?.substring(0, 200));
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
