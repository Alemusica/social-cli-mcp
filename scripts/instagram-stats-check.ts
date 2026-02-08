#!/usr/bin/env tsx
/**
 * Instagram Stats Check - API v24
 * Comprehensive report of all Instagram metrics
 */

import { bootstrap } from '../src/core/index.js';
import { InstagramClient } from '../src/clients/instagram.js';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 INSTAGRAM STATS CHECK - API v24');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await bootstrap({ verbose: false });

  const client = new InstagramClient({
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN!,
    businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!,
  });

  // Test connection
  console.log('🔌 Testing connection...');
  const connected = await client.testConnection();
  if (!connected) {
    console.error('❌ Connection failed');
    process.exit(1);
  }
  console.log('');

  // 1. Account Insights
  console.log('📈 Fetching account insights (28 days)...');
  const account = await client.getAccountInsights('days_28');
  console.log('\n📊 ACCOUNT INSIGHTS (Last 28 Days)');
  console.log('─'.repeat(60));
  if (account) {
    console.log(`Followers:      ${account.followerCount?.toLocaleString()}`);
    console.log(`Total Posts:    ${account.mediaCount?.toLocaleString()}`);
    console.log(`Reach:          ${account.reach?.toLocaleString()} accounts`);
    console.log(`Profile Views:  ${account.profileViews?.toLocaleString()}`);
    console.log(`Website Clicks: ${account.websiteClicks?.toLocaleString()}`);
  } else {
    console.log('⚠️  No data available');
  }

  // 2. Audience Demographics
  console.log('\n\n👥 Fetching audience demographics...');
  const audience = await client.getAudienceInsights();
  console.log('\n👥 AUDIENCE DEMOGRAPHICS');
  console.log('─'.repeat(60));
  if (audience) {
    if (audience.ageGender?.length) {
      console.log('\n📊 Age & Gender:');
      for (const g of audience.ageGender) {
        const total = g.male + g.female;
        const mPct = Math.round((g.male / total) * 100);
        const fPct = Math.round((g.female / total) * 100);
        console.log(`   ${g.ageRange.padEnd(10)} → M: ${g.male} (${mPct}%), F: ${g.female} (${fPct}%)`);
      }
    }

    if (audience.topCities?.length) {
      console.log('\n🏙️  Top 10 Cities:');
      for (const c of audience.topCities.slice(0, 10)) {
        console.log(`   ${c.city.padEnd(30)} → ${c.count.toLocaleString()} followers`);
      }
    }

    if (audience.topCountries?.length) {
      console.log('\n🌍 All Countries:');
      for (const c of audience.topCountries) {
        console.log(`   ${c.country.padEnd(30)} → ${c.count.toLocaleString()} followers`);
      }

      // IT+GR corridor analysis
      const italy = audience.topCountries.find(c => c.country === 'IT');
      const greece = audience.topCountries.find(c => c.country === 'GR');
      if (italy && greece) {
        const total = audience.topCountries.reduce((sum, c) => sum + c.count, 0);
        const corridorCount = italy.count + greece.count;
        const corridorPercent = Math.round((corridorCount / total) * 100);
        console.log(`\n   🔗 IT↔GR Corridor: ${corridorCount.toLocaleString()} (${corridorPercent}% of audience)`);
        console.log(`      Italy:  ${italy.count.toLocaleString()}`);
        console.log(`      Greece: ${greece.count.toLocaleString()}`);
      }
    }

    if (audience.onlineFollowers?.length) {
      console.log('\n⏰ Top 10 Active Times:');
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      for (const slot of audience.onlineFollowers.slice(0, 10)) {
        const day = days[slot.day];
        const hour = slot.hour.toString().padStart(2, '0');
        console.log(`   ${day.padEnd(10)} ${hour}:00 → ${slot.count.toLocaleString()} followers online`);
      }
    }
  } else {
    console.log('⚠️  No data available (requires 100+ followers)');
  }

  // 3. Recent Media Insights
  console.log('\n\n📱 Fetching recent media insights (last 10 posts)...');
  const media = await client.getRecentMediaInsights(10);
  console.log('\n📱 RECENT MEDIA INSIGHTS (Last 10 Posts)');
  console.log('─'.repeat(60));
  if (media?.length) {
    console.log('');
    for (const m of media) {
      const date = new Date(m.timestamp).toLocaleDateString('it-IT');
      const engagement = (m.likes || 0) + (m.comments || 0);
      const saveRate = m.reach ? ((m.saved || 0) / m.reach * 100).toFixed(1) : '0.0';
      const shareRate = m.reach ? ((m.shares || 0) / m.reach * 100).toFixed(1) : '0.0';

      console.log(`   ${date} - ${m.mediaType}`);
      console.log(`     👍 ${(m.likes || 0).toLocaleString()} likes | 💬 ${(m.comments || 0).toLocaleString()} comments | 📊 ${engagement.toLocaleString()} engagement`);
      console.log(`     📥 ${m.saved || 0} saves (${saveRate}%) | 🔄 ${m.shares || 0} shares (${shareRate}%)`);
      console.log(`     📈 Reach: ${(m.reach || 0).toLocaleString()} | Impressions: ${(m.impressions || 0).toLocaleString()}`);
      console.log(`     🔗 ${m.permalink}`);
      console.log('');
    }

    // Calculate averages
    const avgLikes = Math.round(media.reduce((sum, m) => sum + (m.likes || 0), 0) / media.length);
    const avgComments = Math.round(media.reduce((sum, m) => sum + (m.comments || 0), 0) / media.length);
    const avgSaves = Math.round(media.reduce((sum, m) => sum + (m.saved || 0), 0) / media.length);
    const avgShares = Math.round(media.reduce((sum, m) => sum + (m.shares || 0), 0) / media.length);
    const avgReach = Math.round(media.reduce((sum, m) => sum + (m.reach || 0), 0) / media.length);
    const avgImpressions = Math.round(media.reduce((sum, m) => sum + (m.impressions || 0), 0) / media.length);

    console.log(`   📊 AVERAGES (last ${media.length} posts):`);
    console.log(`      Likes: ${avgLikes} | Comments: ${avgComments} | Saves: ${avgSaves} | Shares: ${avgShares}`);
    console.log(`      Reach: ${avgReach.toLocaleString()} | Impressions: ${avgImpressions.toLocaleString()}`);

    // KPIs
    const totalReach = media.reduce((sum, m) => sum + (m.reach || 0), 0);
    const totalSaves = media.reduce((sum, m) => sum + (m.saved || 0), 0);
    const totalShares = media.reduce((sum, m) => sum + (m.shares || 0), 0);
    const saveRateAvg = totalReach ? ((totalSaves / totalReach) * 100).toFixed(1) : '0.0';
    const shareRateAvg = totalReach ? ((totalShares / totalReach) * 100).toFixed(1) : '0.0';

    console.log(`\n   🎯 KEY METRICS:`);
    console.log(`      Save Rate:  ${saveRateAvg}% (target: >5%)`);
    console.log(`      Share Rate: ${shareRateAvg}% (target: >3%)`);
  } else {
    console.log('⚠️  No media data available');
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Stats check complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
});
