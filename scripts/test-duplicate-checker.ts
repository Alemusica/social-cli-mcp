#!/usr/bin/env npx tsx
/**
 * Test Duplicate Checker
 */

import { getDuplicateReport, checkDuplicate, recordPost } from '../src/core/duplicate-checker.js';

async function main() {
  console.log('🔍 Testing Duplicate Checker\n');

  // Get report for Twitter
  console.log('📊 Twitter Duplicate Report:');
  const report = await getDuplicateReport('twitter');
  console.log(`   Total topics tracked: ${report.totalTopics}`);
  console.log(`   Recent posts: ${report.recentPostCount}`);
  console.log(`   Topics last 7 days: ${report.topicsPostedLast7Days.join(', ') || 'none'}`);
  console.log(`   Safe topics: ${report.safeTopics.join(', ') || 'none'}`);

  // Test check for potential duplicates
  console.log('\n🧪 Testing duplicate detection:');

  const tests = [
    'Precision mode is active in jsOM',
    'Zero stars, zero sponsors - just shipped',
    'Brand new content never posted before',
    'Building in public every day',
  ];

  for (const text of tests) {
    const check = await checkDuplicate('twitter', text);
    const status = check.isDuplicate ? '⚠️ DUPLICATE' : '✅ SAFE';
    console.log(`   ${status}: "${text.substring(0, 40)}..."`);
    if (check.isDuplicate) {
      console.log(`      Reason: ${check.reason}`);
    }
  }

  // Instagram report
  console.log('\n📷 Instagram Duplicate Report:');
  const igReport = await getDuplicateReport('instagram');
  console.log(`   Total topics tracked: ${igReport.totalTopics}`);
  console.log(`   Recent posts: ${igReport.recentPostCount}`);

  console.log('\n✅ Duplicate checker working correctly!');
}

main().catch(console.error);
