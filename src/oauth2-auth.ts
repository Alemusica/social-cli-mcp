#!/usr/bin/env node
/**
 * OAuth 2.0 PKCE Authentication for Twitter/X
 * Run this script to get an OAuth 2.0 access token
 */

import { TwitterApi } from 'twitter-api-v2';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
import 'dotenv/config';

const CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const CALLBACK_URL = 'http://localhost:3000/callback';

if (!CLIENT_ID) {
  console.error('❌ Missing TWITTER_CLIENT_ID in .env');
  console.log('\nAdd these to your .env file:');
  console.log('TWITTER_CLIENT_ID=your_client_id');
  console.log('TWITTER_CLIENT_SECRET=your_client_secret');
  process.exit(1);
}

async function main() {
  console.log('🔐 Starting OAuth 2.0 Authentication...\n');

  // Create client with OAuth 2.0 credentials
  const client = new TwitterApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });

  // Generate OAuth 2.0 auth link with PKCE
  const { url: authUrl, codeVerifier, state } = client.generateOAuth2AuthLink(
    CALLBACK_URL,
    {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
    }
  );

  console.log('📋 Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n⏳ Waiting for authorization...\n');

  // Start local server to receive callback
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);

    if (parsedUrl.pathname === '/callback') {
      const code = parsedUrl.query.code as string;
      const returnedState = parsedUrl.query.state as string;

      if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ State mismatch - possible CSRF attack</h1>');
        server.close();
        return;
      }

      try {
        // Exchange code for tokens
        const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
          code,
          codeVerifier,
          redirectUri: CALLBACK_URL,
        });

        console.log('✅ Authentication successful!\n');
        console.log('Add these to your .env file:\n');
        console.log(`TWITTER_OAUTH2_ACCESS_TOKEN=${accessToken}`);
        if (refreshToken) {
          console.log(`TWITTER_OAUTH2_REFRESH_TOKEN=${refreshToken}`);
        }
        console.log(`\n⏰ Token expires in: ${expiresIn} seconds`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>✅ Authorization Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
              <p>Copy the tokens from the terminal to your .env file.</p>
            </body>
          </html>
        `);
      } catch (error: any) {
        console.error('❌ Error exchanging code:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>❌ Error: ${error.message}</h1>`);
      }

      server.close();
    }
  });

  server.listen(3000, () => {
    console.log('🌐 Local server listening on http://localhost:3000');
    console.log('   Waiting for callback...\n');

    // Try to open browser automatically
    const platform = process.platform;

    if (platform === 'darwin') {
      exec(`open "${authUrl}"`);
    } else if (platform === 'win32') {
      exec(`start "${authUrl}"`);
    } else {
      exec(`xdg-open "${authUrl}"`);
    }
  });
}

main().catch(console.error);
