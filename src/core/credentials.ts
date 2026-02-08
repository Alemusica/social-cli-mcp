/**
 * FLUTUR Credentials Manager
 *
 * Centralized credentials status for all agents.
 * Loads from macOS Keychain and tracks what's available.
 */

import { execSync } from 'child_process';
import { getDb } from '../db/client.js';

// Service name in Keychain
const KEYCHAIN_SERVICE = 'social-cli-mcp';

// All possible credentials
export type CredentialKey =
  | 'TWITTER_API_KEY'
  | 'TWITTER_API_SECRET'
  | 'TWITTER_ACCESS_TOKEN'
  | 'TWITTER_ACCESS_SECRET'
  | 'INSTAGRAM_ACCESS_TOKEN'
  | 'INSTAGRAM_BUSINESS_ACCOUNT_ID'
  | 'FACEBOOK_PAGE_ID'
  | 'FACEBOOK_APP_ID'
  | 'FACEBOOK_APP_SECRET'
  | 'GMAIL_USER'
  | 'GMAIL_APP_PASSWORD'
  | 'ANTHROPIC_API_KEY'
  | 'TELEGRAM_BOT_TOKEN'
  | 'TELEGRAM_USER_ID'
  | 'LINKEDIN_ACCESS_TOKEN'
  | 'YOUTUBE_API_KEY'
  | 'YOUTUBE_CHANNEL_ID'
  | 'TIKTOK_ACCESS_TOKEN'
  | 'SUPABASE_URL'
  | 'SUPABASE_ANON_KEY';

// Platform groupings
export interface PlatformStatus {
  platform: string;
  configured: boolean;
  missingKeys: string[];
  availableKeys: string[];
}

// Full credentials status
export interface CredentialsStatus {
  platforms: {
    twitter: PlatformStatus;
    instagram: PlatformStatus;
    facebook: PlatformStatus;
    gmail: PlatformStatus;
    telegram: PlatformStatus;
    linkedin: PlatformStatus;
    youtube: PlatformStatus;
    tiktok: PlatformStatus;
    anthropic: PlatformStatus;
    supabase: PlatformStatus;
  };
  summary: {
    total: number;
    configured: number;
    missing: number;
    configuredPlatforms: string[];
    missingPlatforms: string[];
  };
  lastChecked: string;
}

// Platform requirements
const PLATFORM_REQUIREMENTS: Record<string, CredentialKey[]> = {
  twitter: ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'],
  instagram: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'], // For token refresh
  gmail: ['GMAIL_USER', 'GMAIL_APP_PASSWORD'],
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_USER_ID'],
  linkedin: ['LINKEDIN_ACCESS_TOKEN'],
  youtube: ['YOUTUBE_API_KEY', 'YOUTUBE_CHANNEL_ID'],
  tiktok: ['TIKTOK_ACCESS_TOKEN'],
  anthropic: ['ANTHROPIC_API_KEY'],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
};

/**
 * Get a secret from macOS Keychain
 */
export function getFromKeychain(key: string): string | null {
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

/**
 * Set a secret in macOS Keychain
 */
export function setInKeychain(key: string, value: string): boolean {
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

/**
 * Load all credentials to process.env
 */
export function loadCredentialsToEnv(): number {
  let loaded = 0;
  const allKeys: CredentialKey[] = Object.values(PLATFORM_REQUIREMENTS).flat() as CredentialKey[];
  const uniqueKeys = [...new Set(allKeys)];

  for (const key of uniqueKeys) {
    const value = getFromKeychain(key);
    if (value) {
      process.env[key] = value;
      loaded++;
    }
  }

  return loaded;
}

/**
 * Check status of a single platform
 */
function checkPlatformStatus(platform: string): PlatformStatus {
  const required = PLATFORM_REQUIREMENTS[platform] || [];
  const available: string[] = [];
  const missing: string[] = [];

  for (const key of required) {
    const value = getFromKeychain(key);
    if (value) {
      available.push(key);
    } else {
      missing.push(key);
    }
  }

  return {
    platform,
    configured: missing.length === 0 && available.length > 0,
    missingKeys: missing,
    availableKeys: available,
  };
}

/**
 * Get full credentials status
 */
export function getCredentialsStatus(): CredentialsStatus {
  const platforms = {
    twitter: checkPlatformStatus('twitter'),
    instagram: checkPlatformStatus('instagram'),
    facebook: checkPlatformStatus('facebook'),
    gmail: checkPlatformStatus('gmail'),
    telegram: checkPlatformStatus('telegram'),
    linkedin: checkPlatformStatus('linkedin'),
    youtube: checkPlatformStatus('youtube'),
    tiktok: checkPlatformStatus('tiktok'),
    anthropic: checkPlatformStatus('anthropic'),
    supabase: checkPlatformStatus('supabase'),
  };

  const configuredPlatforms = Object.entries(platforms)
    .filter(([_, status]) => status.configured)
    .map(([name]) => name);

  const missingPlatforms = Object.entries(platforms)
    .filter(([_, status]) => !status.configured)
    .map(([name]) => name);

  return {
    platforms,
    summary: {
      total: Object.keys(platforms).length,
      configured: configuredPlatforms.length,
      missing: missingPlatforms.length,
      configuredPlatforms,
      missingPlatforms,
    },
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Save credentials status to SurrealDB
 */
export async function syncCredentialsToDb(): Promise<void> {
  const status = getCredentialsStatus();
  const db = await getDb();

  await db.query(`
    DELETE FROM credentials_status WHERE id = credentials_status:current;
    CREATE credentials_status:current SET
      platforms = $platforms,
      summary = $summary,
      checked_at = time::now()
  `, {
    platforms: status.platforms,
    summary: status.summary,
  });
}

/**
 * Print credentials status to console
 */
export function printCredentialsStatus(): void {
  const status = getCredentialsStatus();

  console.log('\n🔐 Credentials Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const [name, platform] of Object.entries(status.platforms)) {
    const icon = platform.configured ? '✅' : '❌';
    const keys = platform.configured
      ? `(${platform.availableKeys.length} keys)`
      : `missing: ${platform.missingKeys.join(', ')}`;
    console.log(`${icon} ${name.padEnd(12)} ${keys}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total: ${status.summary.configured}/${status.summary.total} platforms configured`);
  console.log('');
}

// Export for direct use
export const credentials = {
  get: getFromKeychain,
  set: setInKeychain,
  loadToEnv: loadCredentialsToEnv,
  getStatus: getCredentialsStatus,
  syncToDb: syncCredentialsToDb,
  print: printCredentialsStatus,
};
