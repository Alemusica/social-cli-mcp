#!/usr/bin/env npx tsx
/**
 * Test video intelligence module — generates full report + example recommendations.
 */

import { recommendVideo, getMarketStrategy, getProductionGaps, getVideoIntelligenceReport } from '../src/analysis/video-intelligence.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  // 1. Full report
  const report = await getVideoIntelligenceReport();
  console.log(report);

  // 2. Specific recommendations
  console.log('\n\n═══ EXAMPLE RECOMMENDATIONS ═══\n');

  const examples = [
    { venueType: 'wellness_retreat', country: 'Indonesia', tier: 2, bookingStage: 'cold' as const },
    { venueType: 'beach_club', country: 'Italy', tier: 2, season: 'summer' as const, bookingStage: 'cold' as const },
    { venueType: 'spa_hotel', country: 'Qatar', tier: 1, season: 'winter' as const, bookingStage: 'cold' as const },
    { venueType: 'tech_venue', country: 'Japan', tier: 2, bookingStage: 'cold' as const },
    { venueType: 'beach_club', country: 'Portugal', tier: 2, season: 'summer' as const, bookingStage: 'warm' as const },
  ];

  for (const ctx of examples) {
    const rec = await recommendVideo(ctx);
    console.log(`📎 ${ctx.venueType} in ${ctx.country} (tier ${ctx.tier}, ${ctx.bookingStage}):`);
    console.log(`   → ${rec.strategy}`);
    console.log(`   Alternatives: ${rec.alternatives.map(a => `${a.video.title} (${a.score.toFixed(1)})`).join(', ')}`);
    console.log();
  }

  // 3. Production gaps
  console.log('\n═══ PRODUCTION GAPS ═══\n');
  const gaps = getProductionGaps();
  for (const gap of gaps) {
    console.log(`[${gap.priority.toUpperCase()}] ${gap.title} (${gap.market})`);
    console.log(`  ${gap.rationale}\n`);
  }

  await closeDb();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
