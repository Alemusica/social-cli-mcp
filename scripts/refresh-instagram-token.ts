#!/usr/bin/env npx tsx
/**
 * Instagram/Facebook Token Refresh Utility
 *
 * Refreshes long-lived Instagram/Facebook tokens before they expire.
 * Long-lived tokens are valid for 60 days and can be refreshed if:
 * - Token is at least 24 hours old
 * - Token hasn't expired yet
 *
 * Usage:
 *   npx tsx scripts/refresh-instagram-token.ts          # Check and refresh if needed
 *   npx tsx scripts/refresh-instagram-token.ts --force  # Force refresh
 *   npx tsx scripts/refresh-instagram-token.ts --check  # Just check token status
 */

import { execSync } from 'child_process';

const KEYCHAIN_SERVICE = 'social-cli-mcp';
const GRAPH_API_VERSION = 'v24.0';

interface TokenDebugResponse {
  data?: {
    app_id?: string;
    type?: string;
    application?: string;
    data_access_expires_at?: number;
    expires_at?: number;
    is_valid?: boolean;
    scopes?: string[];
    user_id?: string;
    error?: {
      message: string;
      code: number;
    };
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface TokenRefreshResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

function getFromKeychain(key: string): string | null {
  try {
    const value = execSync(
      `security find-generic-password -a "${key}" -s "${KEYCHAIN_SERVICE}" -w 2>/dev/null`,
      { encoding: 'utf-8' }
    ).trim();
    return value || null;
  } catch {
    return null;
  }
}

function setInKeychain(key: string, value: string): boolean {
  try {
    // Delete existing if present
    try {
      execSync(`security delete-generic-password -a "${key}" -s "${KEYCHAIN_SERVICE}" 2>/dev/null`);
    } catch { /* ignore */ }

    // Add new
    execSync(
      `security add-generic-password -a "${key}" -s "${KEYCHAIN_SERVICE}" -w "${value}"`,
      { encoding: 'utf-8' }
    );
    return true;
  } catch {
    return false;
  }
}

async function debugToken(token: string): Promise<TokenDebugResponse['data'] | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`
    );
    const data = await response.json() as TokenDebugResponse;

    if (data.error) {
      console.error('❌ Token debug error:', data.error.message);
      return null;
    }

    return data.data || null;
  } catch (error: any) {
    console.error('❌ Failed to debug token:', error.message);
    return null;
  }
}

async function refreshToken(
  currentToken: string,
  appId: string,
  appSecret: string
): Promise<string | null> {
  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${currentToken}`;

    const response = await fetch(url);
    const data = await response.json() as TokenRefreshResponse;

    if (data.error) {
      console.error('❌ Token refresh error:', data.error.message);
      return null;
    }

    return data.access_token || null;
  } catch (error: any) {
    console.error('❌ Failed to refresh token:', error.message);
    return null;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function daysUntil(timestamp: number): number {
  const now = Date.now() / 1000;
  return Math.floor((timestamp - now) / (24 * 60 * 60));
}

async function main() {
  const args = process.argv.slice(2);
  const forceRefresh = args.includes('--force');
  const checkOnly = args.includes('--check');

  console.log('🔑 Instagram/Facebook Token Manager\n');

  // Get current token
  const currentToken = getFromKeychain('INSTAGRAM_ACCESS_TOKEN');
  if (!currentToken) {
    console.error('❌ No INSTAGRAM_ACCESS_TOKEN found in Keychain');
    console.log('\nRun this to add your token:');
    console.log('  security add-generic-password -s "social-cli-mcp" -a "INSTAGRAM_ACCESS_TOKEN" -w "YOUR_TOKEN" -U');
    process.exit(1);
  }

  // Debug current token
  console.log('📊 Checking current token status...\n');
  const tokenInfo = await debugToken(currentToken);

  if (!tokenInfo) {
    console.error('❌ Failed to get token info. Token may be invalid or expired.');
    process.exit(1);
  }

  if (!tokenInfo.is_valid) {
    console.error('❌ Token is invalid:', tokenInfo.error?.message || 'Unknown error');
    process.exit(1);
  }

  // Display token info
  console.log('✅ Token is valid');
  console.log(`   App: ${tokenInfo.application || 'Unknown'}`);
  console.log(`   Type: ${tokenInfo.type || 'Unknown'}`);
  console.log(`   User ID: ${tokenInfo.user_id || 'Unknown'}`);

  if (tokenInfo.expires_at) {
    const expiresAt = tokenInfo.expires_at;
    const daysLeft = daysUntil(expiresAt);
    const expiresDate = formatDate(expiresAt);

    console.log(`   Expires: ${expiresDate} (${daysLeft} days left)`);

    if (daysLeft <= 0) {
      console.log('\n⚠️  Token has expired!');
    } else if (daysLeft <= 7) {
      console.log('\n⚠️  Token expires soon - recommend refreshing');
    } else if (daysLeft <= 30) {
      console.log('\n📅 Token expires in less than a month');
    } else {
      console.log('\n✅ Token has plenty of time left');
    }
  } else {
    console.log('   Expires: Never (Page token or System User token)');
    console.log('\n✅ Token does not expire');

    if (checkOnly) {
      process.exit(0);
    }
    return;
  }

  if (tokenInfo.data_access_expires_at) {
    const dataAccessExpires = formatDate(tokenInfo.data_access_expires_at);
    console.log(`   Data access expires: ${dataAccessExpires}`);
  }

  if (tokenInfo.scopes?.length) {
    console.log(`   Scopes: ${tokenInfo.scopes.join(', ')}`);
  }

  if (checkOnly) {
    process.exit(0);
  }

  // Check if refresh is needed
  const daysLeft = tokenInfo.expires_at ? daysUntil(tokenInfo.expires_at) : Infinity;

  if (!forceRefresh && daysLeft > 30) {
    console.log('\n📌 No refresh needed (token valid for more than 30 days)');
    console.log('   Use --force to refresh anyway');
    process.exit(0);
  }

  // Get App credentials for refresh
  const appId = getFromKeychain('FACEBOOK_APP_ID');
  const appSecret = getFromKeychain('FACEBOOK_APP_SECRET');

  if (!appId || !appSecret) {
    console.error('\n❌ Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET in Keychain');
    console.log('\nTo enable token refresh, add your app credentials:');
    console.log('  security add-generic-password -s "social-cli-mcp" -a "FACEBOOK_APP_ID" -w "YOUR_APP_ID" -U');
    console.log('  security add-generic-password -s "social-cli-mcp" -a "FACEBOOK_APP_SECRET" -w "YOUR_APP_SECRET" -U');
    console.log('\nFind these in Facebook Developers → Your App → Settings → Basic');
    process.exit(1);
  }

  // Refresh token
  console.log('\n🔄 Refreshing token...');
  const newToken = await refreshToken(currentToken, appId, appSecret);

  if (!newToken) {
    console.error('❌ Failed to refresh token');
    process.exit(1);
  }

  // Verify new token
  console.log('🔍 Verifying new token...');
  const newTokenInfo = await debugToken(newToken);

  if (!newTokenInfo?.is_valid) {
    console.error('❌ New token appears to be invalid');
    process.exit(1);
  }

  // Save new token
  console.log('💾 Saving new token to Keychain...');
  if (!setInKeychain('INSTAGRAM_ACCESS_TOKEN', newToken)) {
    console.error('❌ Failed to save new token to Keychain');
    console.log('\nNew token (save manually):');
    console.log(newToken);
    process.exit(1);
  }

  // Display new token info
  if (newTokenInfo.expires_at) {
    const newExpiresDate = formatDate(newTokenInfo.expires_at);
    const newDaysLeft = daysUntil(newTokenInfo.expires_at);
    console.log(`\n✅ Token refreshed successfully!`);
    console.log(`   New expiration: ${newExpiresDate} (${newDaysLeft} days)`);
  } else {
    console.log('\n✅ Token refreshed successfully!');
  }

  console.log('\n💡 Tip: Run this script periodically (e.g., weekly) to keep tokens fresh');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
