#!/usr/bin/env npx tsx
/**
 * YouTube OAuth2 Setup — Get refresh_token for Analytics API
 *
 * Step 1: Run this script → opens browser for Google consent
 * Step 2: Paste the authorization code back here
 * Step 3: Script saves refresh_token to Keychain
 *
 * Prerequisites:
 *   1. Enable "YouTube Data API v3" AND "YouTube Analytics API" in Google Cloud Console:
 *      https://console.developers.google.com/apis/library
 *   2. youtube-credentials.json exists in project root (already done)
 *
 * Usage:
 *   npx tsx scripts/youtube-oauth-setup.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createServer } from 'http';
import { execSync } from 'child_process';
import { setInKeychain } from '../src/core/credentials.js';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

const REDIRECT_PORT = 8085;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

async function main() {
  console.log('\n🎬 YouTube OAuth2 Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load client credentials
  const credsPath = join(process.cwd(), 'youtube-credentials.json');
  const credsFile = JSON.parse(readFileSync(credsPath, 'utf-8'));
  const installed = credsFile.installed || credsFile.web;

  if (!installed?.client_id || !installed?.client_secret) {
    console.error('❌ youtube-credentials.json missing client_id or client_secret');
    process.exit(1);
  }

  const clientId = installed.client_id;
  const clientSecret = installed.client_secret;

  console.log(`📋 Client ID: ${clientId.slice(0, 20)}...`);
  console.log(`🔒 Scopes: ${SCOPES.join(', ')}`);
  console.log(`🔗 Redirect: ${REDIRECT_URI}\n`);

  // IMPORTANT: Check redirect URI is registered
  console.log('⚠️  BEFORE PROCEEDING:');
  console.log(`   Make sure "${REDIRECT_URI}" is registered as an authorized redirect URI`);
  console.log('   in Google Cloud Console → Credentials → Your OAuth Client → Authorized redirect URIs');
  console.log('   https://console.cloud.google.com/apis/credentials\n');

  // Build auth URL
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to always get refresh_token
  });

  console.log('🌐 Opening browser for authorization...\n');

  // Start local server to catch the redirect
  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
      const authCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (authCode) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful!</h1><p>You can close this tab and return to the terminal.</p>');
        server.close();
        resolve(authCode);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      // Open browser
      try {
        execSync(`open "${authUrl}"`);
      } catch {
        console.log('Could not open browser automatically. Open this URL manually:');
        console.log(authUrl);
      }
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Timeout: no authorization code received within 2 minutes'));
    }, 120000);
  });

  console.log('✅ Authorization code received!\n');
  console.log('🔄 Exchanging for tokens...');

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json() as any;

  if (tokenData.error) {
    console.error(`❌ Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    process.exit(1);
  }

  const { access_token, refresh_token, expires_in } = tokenData;

  if (!refresh_token) {
    console.error('❌ No refresh_token received. Try revoking access and running again:');
    console.error('   https://myaccount.google.com/permissions');
    process.exit(1);
  }

  // Save to Keychain
  console.log('\n💾 Saving tokens to Keychain...');

  setInKeychain('YOUTUBE_ACCESS_TOKEN', access_token);
  console.log('  ✅ YOUTUBE_ACCESS_TOKEN saved');

  setInKeychain('YOUTUBE_REFRESH_TOKEN', refresh_token);
  console.log('  ✅ YOUTUBE_REFRESH_TOKEN saved');

  console.log(`\n📊 Access token expires in ${Math.round(expires_in / 60)} minutes`);
  console.log('   (refresh_token is permanent — youtube-fetcher.ts auto-refreshes)\n');

  // Verify: check channel ID
  console.log('🔍 Verifying connection...');
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const channelData = await channelRes.json() as any;

  if (channelData.items?.[0]) {
    const channel = channelData.items[0];
    const channelId = channel.id;
    const channelTitle = channel.snippet.title;

    console.log(`  ✅ Connected as: ${channelTitle} (${channelId})`);

    // Save channel ID
    setInKeychain('YOUTUBE_CHANNEL_ID', channelId);
    console.log(`  ✅ YOUTUBE_CHANNEL_ID saved: ${channelId}`);
  } else {
    console.log('  ⚠️  Could not fetch channel info. Set YOUTUBE_CHANNEL_ID manually in Keychain.');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ YouTube OAuth setup complete!');
  console.log('\nNext: npx tsx scripts/analytics-snapshot.ts --youtube');
  console.log('');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
