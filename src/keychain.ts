/**
 * Keychain integration for secure secret storage
 * Uses macOS Keychain to store and retrieve API credentials
 * Falls back to environment variables on non-macOS systems
 */

import { execSync } from 'child_process';
import * as os from 'os';

const SERVICE_NAME = 'social-cli-mcp';
const IS_MACOS = os.platform() === 'darwin';

/**
 * Get a secret from macOS Keychain
 * Returns undefined on non-macOS systems (use env vars instead)
 */
export function getSecret(key: string): string | undefined {
  // On non-macOS, always return undefined to use env vars
  if (!IS_MACOS) {
    return undefined;
  }

  try {
    const value = execSync(
      `security find-generic-password -s "${SERVICE_NAME}" -a "${key}" -w 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Set a secret in macOS Keychain
 */
export function setSecret(key: string, value: string): boolean {
  try {
    // Delete existing entry first
    try {
      execSync(`security delete-generic-password -s "${SERVICE_NAME}" -a "${key}" 2>/dev/null`);
    } catch {
      // Ignore if doesn't exist
    }

    // Add new entry
    execSync(
      `security add-generic-password -s "${SERVICE_NAME}" -a "${key}" -w "${value}" -U`,
      { encoding: 'utf8' }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Load all secrets and set as environment variables
 * Call this at app startup
 */
export function loadSecretsToEnv(): void {
  const secrets = [
    // Twitter
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_SECRET',
    'TWITTER_CLIENT_ID',
    'TWITTER_CLIENT_SECRET',
    // Instagram
    'INSTAGRAM_ACCESS_TOKEN',
    'INSTAGRAM_BUSINESS_ACCOUNT_ID',
    'FACEBOOK_PAGE_ID',
    // Gmail
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    // Anthropic
    'ANTHROPIC_API_KEY',
    // Telegram
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_USER_ID',
  ];

  let loaded = 0;
  for (const key of secrets) {
    // Skip if already set in environment
    if (process.env[key]) continue;

    const value = getSecret(key);
    if (value) {
      process.env[key] = value;
      loaded++;
    }
  }

  if (loaded > 0) {
    console.log(`🔐 Loaded ${loaded} secrets from Keychain`);
  } else if (!IS_MACOS) {
    console.log(`🔐 Using environment variables (non-macOS platform)`);
  }
}

/**
 * Get config object with all secrets
 */
export function getConfig() {
  return {
    twitter: {
      apiKey: getSecret('TWITTER_API_KEY') || process.env.TWITTER_API_KEY || '',
      apiSecret: getSecret('TWITTER_API_SECRET') || process.env.TWITTER_API_SECRET || '',
      accessToken: getSecret('TWITTER_ACCESS_TOKEN') || process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: getSecret('TWITTER_ACCESS_SECRET') || process.env.TWITTER_ACCESS_SECRET || '',
    },
    instagram: {
      accessToken: getSecret('INSTAGRAM_ACCESS_TOKEN') || process.env.INSTAGRAM_ACCESS_TOKEN || '',
      businessAccountId: getSecret('INSTAGRAM_BUSINESS_ACCOUNT_ID') || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
      facebookPageId: getSecret('FACEBOOK_PAGE_ID') || process.env.FACEBOOK_PAGE_ID || '',
    },
    gmail: {
      user: getSecret('GMAIL_USER') || process.env.GMAIL_USER || '',
      appPassword: getSecret('GMAIL_APP_PASSWORD') || process.env.GMAIL_APP_PASSWORD || '',
    },
    anthropic: {
      apiKey: getSecret('ANTHROPIC_API_KEY') || process.env.ANTHROPIC_API_KEY || '',
    },
    telegram: {
      botToken: getSecret('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN || '',
      userId: getSecret('TELEGRAM_USER_ID') || process.env.TELEGRAM_USER_ID || '',
    },
  };
}
