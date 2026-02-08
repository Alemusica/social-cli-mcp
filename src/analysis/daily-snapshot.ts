#!/usr/bin/env npx tsx
/**
 * Daily Snapshot Script
 * Captures audience metrics daily for growth tracking
 * Designed to be run via cron job
 */

import { loadConfig } from '../utils/config.js';
import { InstagramClient } from '../clients/instagram.js';
import { getDb, closeDb } from '../db/client.js';
import {
  startSession,
  endSession,
  saveAudienceSnapshot,
} from '../db/queries/index.js';

async function main() {
  const isQuiet = process.argv.includes('--quiet');
  const log = (msg: string) => !isQuiet && console.log(msg);

  log('📊 Daily Snapshot - ' + new Date().toISOString().split('T')[0]);

  // Load config
  const config = loadConfig();
  if (!config.instagram) {
    console.error('ERROR: Instagram not configured');
    process.exit(1);
  }

  const instagram = new InstagramClient(config.instagram);

  // Test connection
  const connected = await instagram.testConnection();
  if (!connected) {
    console.error('ERROR: Instagram connection failed');
    process.exit(1);
  }

  // Initialize database
  await getDb();

  // Start session
  const sessionName = `daily_snapshot_${new Date().toISOString().split('T')[0]}`;
  const sessionId = await startSession(
    sessionName,
    'audience_snapshot',
    'Automated daily audience snapshot'
  );

  try {
    // Get account info
    const account = await instagram.getAccountInsights('day');
    if (!account) {
      throw new Error('Could not get account insights');
    }

    // Get audience demographics
    const audience = await instagram.getAudienceInsights();

    // Save to database
    await saveAudienceSnapshot({
      platform: 'instagram',
      username: 'flutur_8',
      followers: account.followerCount || 0,
      following: 0,
      posts_count: account.mediaCount || 0,
      reach_28d: account.reach,
      profile_views_28d: account.profileViews,
      website_clicks_28d: account.websiteClicks,
      top_countries: audience?.topCountries || [],
      top_cities: audience?.topCities || [],
      age_gender: (audience?.ageGender || []).map(ag => ({
        age: ag.ageRange,
        male: ag.male,
        female: ag.female,
      })),
      engagement_rate: undefined
    }, sessionId);

    await endSession(sessionId, 'Daily snapshot captured successfully');

    log(`✅ Snapshot saved: ${account.followerCount} followers`);

    // Output JSON for logging
    if (isQuiet) {
      console.log(JSON.stringify({
        date: new Date().toISOString(),
        followers: account.followerCount,
        reach_28d: account.reach,
        posts: account.mediaCount
      }));
    }

  } catch (error) {
    console.error('ERROR:', error);
    await endSession(sessionId, `Failed: ${error}`);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
