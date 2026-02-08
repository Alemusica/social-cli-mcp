#!/usr/bin/env npx tsx
/**
 * Archive Instagram insights to SurrealDB
 */

import { insightsArchiver } from '../src/core/insights-archiver.js';

async function main() {
  console.log('📊 Archiving Instagram insights to SurrealDB...\n');
  
  const result = await insightsArchiver.archiveAndAnalyze();
  
  if (result.snapshot) {
    console.log('\n📸 Snapshot saved:');
    console.log(`   Followers: ${result.snapshot.followers}`);
    console.log(`   Posts: ${result.snapshot.posts_count}`);
    console.log(`   Reach (28d): ${result.snapshot.reach_28d}`);
    console.log(`   Top Countries: ${result.snapshot.top_countries.slice(0, 3).map(c => `${c.country}:${c.count}`).join(', ')}`);
  }
  
  if (result.evolution) {
    console.log('\n📈 Evolution insights:');
    result.evolution.insights.forEach(i => console.log(`   ${i}`));
  }
  
  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach(r => console.log(`   ${r}`));
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
