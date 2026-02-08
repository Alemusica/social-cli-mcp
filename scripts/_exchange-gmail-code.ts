import { google } from 'googleapis';
import * as fs from 'fs';

const code = process.argv[2];
if (!code) { console.error('Usage: npx tsx scripts/_exchange-gmail-code.ts <code>'); process.exit(1); }

const creds = JSON.parse(fs.readFileSync('gmail-credentials.json', 'utf-8'));
const { client_id, client_secret } = creds.installed || creds.web;
const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456');

const { tokens } = await auth.getToken(code);
fs.writeFileSync('gmail-token.json', JSON.stringify(tokens, null, 2));
console.log('Token saved!');
console.log('Scopes:', tokens.scope);
console.log('Has refresh_token:', Boolean(tokens.refresh_token));

auth.setCredentials(tokens);
const gmail = google.gmail({ version: 'v1', auth });
const profile = await gmail.users.getProfile({ userId: 'me' });
console.log('Connected as:', profile.data.emailAddress);
console.log('Total messages:', profile.data.messagesTotal);
process.exit(0);
