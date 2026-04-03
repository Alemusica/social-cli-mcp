// src/config/credentials.ts
import { execSync } from "child_process";
import { createLogger } from "../lib/logger.js";

const log = createLogger("credentials");

const SERVICE = "social-cli-mcp";

export const CREDENTIAL_KEYS = [
  "TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET",
  "INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID",
  "FACEBOOK_PAGE_ID", "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET",
  "GMAIL_USER", "GMAIL_APP_PASSWORD",
  "ANTHROPIC_API_KEY",
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_USER_ID",
  "LINKEDIN_ACCESS_TOKEN",
  "YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID",
  "TIKTOK_ACCESS_TOKEN",
  "SUPABASE_URL", "SUPABASE_ANON_KEY",
] as const;

export type CredentialKey = (typeof CREDENTIAL_KEYS)[number];

export interface PlatformStatus {
  configured: boolean;
  missing: string[];
  available: string[];
}

export const PLATFORM_REQUIREMENTS: Record<string, CredentialKey[]> = {
  twitter: ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET"],
  instagram: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
  facebook: ["FACEBOOK_PAGE_ID", "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
  gmail: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_USER_ID"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN"],
  youtube: ["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"],
  tiktok: ["TIKTOK_ACCESS_TOKEN"],
  anthropic: ["ANTHROPIC_API_KEY"],
  supabase: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
};

export function getFromKeychain(key: string): string | null {
  try {
    const result = execSync(
      `security find-generic-password -s "${SERVICE}" -a "${key}" -w 2>/dev/null`,
      { encoding: "utf-8" },
    ).trim();
    return result || null;
  } catch {
    return null;
  }
}

export function setInKeychain(key: string, value: string): void {
  try {
    execSync(`security delete-generic-password -s "${SERVICE}" -a "${key}" 2>/dev/null`);
  } catch { /* may not exist */ }
  execSync(`security add-generic-password -s "${SERVICE}" -a "${key}" -w "${value}"`);
}

export function loadCredentialsToEnv(): number {
  const uniqueKeys = [...new Set(CREDENTIAL_KEYS)];
  let loaded = 0;
  for (const key of uniqueKeys) {
    if (process.env[key]) { loaded++; continue; }
    const value = getFromKeychain(key);
    if (value) {
      process.env[key] = value;
      loaded++;
    }
  }
  log.info("credentials loaded", { count: loaded, total: uniqueKeys.length });
  return loaded;
}

export async function getCredentialsStatus(): Promise<{
  platforms: Record<string, PlatformStatus>;
  summary: { configured: number; total: number };
}> {
  const platforms: Record<string, PlatformStatus> = {};
  let configured = 0;

  for (const [platform, keys] of Object.entries(PLATFORM_REQUIREMENTS)) {
    const missing: string[] = [];
    const available: string[] = [];
    for (const key of keys) {
      if (process.env[key] || getFromKeychain(key)) {
        available.push(key);
      } else {
        missing.push(key);
      }
    }
    const isConfigured = missing.length === 0;
    if (isConfigured) configured++;
    platforms[platform] = { configured: isConfigured, missing, available };
  }

  return { platforms, summary: { configured, total: Object.keys(PLATFORM_REQUIREMENTS).length } };
}

export const credentials = { get: getFromKeychain, set: setInKeychain, loadToEnv: loadCredentialsToEnv, getStatus: getCredentialsStatus };
