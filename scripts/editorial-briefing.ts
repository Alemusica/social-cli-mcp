#!/usr/bin/env npx tsx
/**
 * Editorial Briefing
 *
 * Generates a content brief for today based on:
 * - Audience insights (IT↔GR corridor)
 * - Day of week
 * - Brand pillars
 *
 * Usage:
 *   npx tsx scripts/editorial-briefing.ts           # Today's brief
 *   npx tsx scripts/editorial-briefing.ts --week    # Weekly arc
 *   npx tsx scripts/editorial-briefing.ts --archive # Archive insights first
 */

import {
  archiveAudienceInsights,
  getLatestAudienceSnapshot,
  getCorridorAnalysis,
  needsFreshInsights,
} from '../src/core/insights-archiver.js';
import {
  getTodayStoryPrompt,
  suggestNarrativeArc,
  getContentBrief,
} from '../src/core/editorial-intelligence.js';

async function main() {
  const args = process.argv.slice(2);
  const shouldArchive = args.includes('--archive');
  const showWeek = args.includes('--week');

  console.log('📋 EDITORIAL BRIEFING\n');
  console.log('━'.repeat(60) + '\n');

  // Check if we need fresh insights
  const needsFresh = await needsFreshInsights(48); // 48 hours

  if (shouldArchive || needsFresh) {
    if (needsFresh && !shouldArchive) {
      console.log('⚠️  Insights older than 48h. Archiving fresh data...\n');
    }
    await archiveAudienceInsights();
    console.log('');
  }

  // Get latest snapshot
  const snapshot = await getLatestAudienceSnapshot();
  if (!snapshot) {
    console.log('❌ No audience data. Run with --archive first.');
    process.exit(1);
  }

  // Show corridor analysis
  const corridor = await getCorridorAnalysis();
  if (corridor) {
    console.log('🌍 AUDIENCE CORRIDOR');
    console.log(`   🇮🇹 Italiani: ${corridor.italians} (${Math.round((corridor.italians / snapshot.followers) * 100)}%)`);
    console.log(`   🇬🇷 Greci: ${corridor.greeks} (${Math.round((corridor.greeks / snapshot.followers) * 100)}%)`);
    console.log(`   📊 Corridor: ${corridor.corridorPct.toFixed(0)}%`);
    console.log(`\n   💡 ${corridor.insight}`);
    console.log('');
  }

  // Show age breakdown
  if (snapshot.age_gender.length > 0) {
    console.log('👥 DEMOGRAPHICS');
    const sorted = [...snapshot.age_gender].sort((a, b) =>
      (b.male + b.female) - (a.male + a.female)
    );
    for (const ag of sorted.slice(0, 3)) {
      const total = ag.male + ag.female;
      const bar = '█'.repeat(Math.round(total / 20));
      console.log(`   ${ag.ageRange.padEnd(6)} ${bar} ${total}`);
    }
    console.log('');
  }

  if (showWeek) {
    // Show weekly arc
    console.log('📅 WEEKLY NARRATIVE ARC');
    console.log('━'.repeat(60) + '\n');

    const arc = await suggestNarrativeArc('week');
    console.log(`   🎭 ${arc.name}\n`);
    console.log(`   📊 Rationale: ${arc.audience_rationale}\n`);

    for (const beat of arc.daily_beats) {
      const emoji = beat.pillar === 'tech' ? '💻' :
                    beat.pillar === 'music_production' ? '🎵' :
                    beat.pillar === 'live_performance' ? '🎸' : '🌿';
      console.log(`   ${beat.day.padEnd(10)} ${emoji} ${beat.platform.padEnd(10)} ${beat.content_type}`);
      console.log(`              ${beat.brief}`);
    }

    console.log(`\n   🌉 CROSSOVER: ${arc.crossover_moment}`);
  } else {
    // Show today's prompt
    console.log('📝 TODAY\'S STORY PROMPT');
    console.log('━'.repeat(60) + '\n');

    const prompt = await getTodayStoryPrompt();
    console.log(prompt.suggested_content);

    console.log('\n   🎯 Tone: ' + prompt.tone_guidance);
    console.log('\n   ⛔ Evita:');
    for (const avoid of prompt.avoid.slice(0, 3)) {
      console.log(`      • ${avoid}`);
    }

    // Also show Instagram brief
    console.log('\n\n📸 INSTAGRAM CONTENT BRIEF');
    console.log('━'.repeat(60) + '\n');

    const brief = await getContentBrief('instagram', 'story');
    if (brief) {
      console.log(`   📌 Pillar: ${brief.recommended_pillar}`);
      console.log(`   ⏰ Best time: ${brief.best_time}`);
      console.log(`   #️⃣  Hashtags: ${brief.hashtags.join(' ')}`);
      if (brief.context) {
        console.log(`\n   ${brief.context}`);
      }
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('Layer su layer 🎵');
}

main().catch(console.error);
