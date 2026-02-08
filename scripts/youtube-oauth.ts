/**
 * YouTube OAuth Flow
 * Run: npx tsx scripts/youtube-oauth.ts
 */

import * as http from 'http';
import * as url from 'url';
import { exec } from 'child_process';
import * as fs from 'fs';

// Read credentials from JSON file
const credsPath = './youtube-credentials.json';
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
const CLIENT_ID = creds.installed.client_id;
const CLIENT_SECRET = creds.installed.client_secret;

const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

async function main() {
  // Build authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\n🎬 YouTube OAuth Flow\n');
  console.log('Opening browser for authorization...\n');

  // Open browser
  exec(`open "${authUrl.toString()}"`);

  // Start local server to receive callback
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);

    if (parsedUrl.pathname === '/callback') {
      const code = parsedUrl.query.code as string;

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful!</h1><p>You can close this window.</p>');

        // Exchange code for tokens
        console.log('Exchanging code for tokens...\n');

        try {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET,
              redirect_uri: REDIRECT_URI,
              grant_type: 'authorization_code',
            }),
          });

          const tokens = await tokenResponse.json() as any;

          if (tokens.error) {
            console.error('Error:', tokens.error_description || tokens.error);
          } else {
            console.log('✅ Success! Save these to Keychain:\n');
            console.log('─'.repeat(60));
            console.log(`YOUTUBE_ACCESS_TOKEN=${tokens.access_token}`);
            console.log('');
            console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('─'.repeat(60));

            // Save to file for convenience
            fs.writeFileSync('./youtube-tokens.json', JSON.stringify(tokens, null, 2));
            console.log('\nTokens also saved to youtube-tokens.json');

            // Auto-save to Keychain
            console.log('\nSaving to Keychain...');
            exec(`security add-generic-password -s "social-cli-mcp" -a "YOUTUBE_ACCESS_TOKEN" -w "${tokens.access_token}" -U`);
            if (tokens.refresh_token) {
              exec(`security add-generic-password -s "social-cli-mcp" -a "YOUTUBE_REFRESH_TOKEN" -w "${tokens.refresh_token}" -U`);
            }
            console.log('✅ Saved to Keychain!');
          }
        } catch (error) {
          console.error('Error exchanging code:', error);
        }

        server.close();
        process.exit(0);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No authorization code received</h1>');
      }
    }
  });

  server.listen(3333, () => {
    console.log('Waiting for authorization callback on http://localhost:3333...\n');
  });
}

main().catch(console.error);
