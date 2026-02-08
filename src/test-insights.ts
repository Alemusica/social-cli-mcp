#!/usr/bin/env npx tsx
/**
 * Test Instagram Insights API
 */

import { loadConfig } from './utils/config.js';
import { InstagramClient } from './clients/instagram.js';

async function main() {
  const config = loadConfig();

  if (!config.instagram) {
    console.error('❌ Instagram not configured');
    process.exit(1);
  }

  const instagram = new InstagramClient(config.instagram);

  // Test connection
  console.log('\n📡 Testing connection...');
  const connected = await instagram.testConnection();
  if (!connected) {
    console.error('❌ Connection failed');
    process.exit(1);
  }

  // Get account insights
  console.log('\n📊 Account Insights (last 28 days):');
  const account = await instagram.getAccountInsights('day');
  if (account) {
    console.log(`   Followers: ${account.followerCount}`);
    console.log(`   Posts: ${account.mediaCount}`);
    console.log(`   Reach: ${account.reach ?? 'N/A'}`);
    console.log(`   Profile Views: ${account.profileViews ?? 'N/A'}`);
    console.log(`   Website Clicks: ${account.websiteClicks ?? 'N/A'}`);
  }

  // Get recent posts insights
  console.log('\n📸 Recent Posts (last 5):');
  const posts = await instagram.getRecentMediaInsights(5);
  for (const post of posts) {
    console.log(`\n   ${post.mediaType} - ${post.timestamp}`);
    console.log(`   ❤️  ${post.likes || 0} | 💬 ${post.comments || 0} | 🔖 ${post.saved || 0}`);
    console.log(`   👁️  Reach: ${post.reach || 'N/A'} | Impressions: ${post.impressions || 'N/A'}`);
    if (post.permalink) console.log(`   🔗 ${post.permalink}`);
  }

  // Get audience insights
  console.log('\n👥 Audience Insights:');
  const audience = await instagram.getAudienceInsights();
  if (audience) {
    console.log('   Top Cities:');
    audience.topCities.slice(0, 5).forEach(c => console.log(`     - ${c.city}: ${c.count}`));

    console.log('   Top Countries:');
    audience.topCountries.slice(0, 5).forEach(c => console.log(`     - ${c.country}: ${c.count}`));

    console.log('   Age/Gender:');
    audience.ageGender.forEach(g => console.log(`     - ${g.ageRange}: M=${g.male} F=${g.female}`));
  } else {
    console.log('   (Need 100+ followers for demographics)');
  }

  // Best posting times
  console.log('\n⏰ Best Posting Times:');
  const bestTimes = await instagram.getBestPostingTimes();
  if (bestTimes.length) {
    bestTimes.forEach((t, i) => console.log(`   ${i + 1}. ${t.day} at ${t.hour} (${t.followers} followers online)`));
  } else {
    console.log('   (Not enough data)');
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
