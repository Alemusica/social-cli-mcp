/**
 * Outreach Dashboard - Show venues ready for contact
 */

import { ALL_VENUES } from '../src/db/venues-database.js';

const withEmail = ALL_VENUES.filter(v => v.email);
const tier1WithEmail = withEmail.filter(v => v.tier === 1);
const tier2WithEmail = withEmail.filter(v => v.tier === 2);

console.log('═══════════════════════════════════════════════════════════════');
console.log('FLUTUR OUTREACH DASHBOARD');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('📊 READY FOR OUTREACH (have email):');
console.log('   Tier 1 (Dream venues): ' + tier1WithEmail.length);
console.log('   Tier 2 (Priority): ' + tier2WithEmail.length);
console.log('   Total with contacts: ' + withEmail.length);
console.log('');
console.log('🎯 TIER 1 VENUES WITH EMAIL - READY TO GO:');
console.log('─'.repeat(60));

// Group by country
const byCountry: Record<string, typeof tier1WithEmail> = {};
tier1WithEmail.forEach(v => {
  if (!byCountry[v.country]) byCountry[v.country] = [];
  byCountry[v.country].push(v);
});

Object.keys(byCountry).sort().forEach(country => {
  console.log('');
  console.log('🌍 ' + country.toUpperCase());
  byCountry[country].forEach(v => {
    console.log('   • ' + v.name + ' (' + v.city + ')');
    console.log('     📧 ' + v.email);
    console.log('     🎨 ' + (v.vibe || []).join(', '));
  });
});

// Strategy recommendations by type
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 STRATEGIC APPROACH BY VENUE TYPE');
console.log('═══════════════════════════════════════════════════════════════');

const byType: Record<string, typeof tier1WithEmail> = {};
tier1WithEmail.forEach(v => {
  const type = v.type;
  if (!byType[type]) byType[type] = [];
  byType[type].push(v);
});

const strategies: Record<string, string> = {
  'beach_club': '🏖️ SUNSET SESSIONS - Lead with Rocca di Arona video, Villa Porta residency',
  'wellness_retreat': '🧘 SOUND HEALING - Lead with Efthymia video, meditation/yoga angle',
  'conscious_venue': '🌙 TRANSFORMATIONAL - Lead with spiritual journey, Greece Got Talent story',
  'boutique_hotel': '🏨 INTIMATE EVENTS - Lead with Buddha Bar style, 4-year residency proof',
  'jazz_club': '🎷 WORLD MUSIC - Lead with live looping innovation, multi-instrument mastery',
  'music_venue': '🎵 ECLECTIC LIVE - Lead with Greece Got Talent, Denver experience',
  'rooftop_bar': '🌅 SUNSET APERITIVO - Lead with sunset sessions expertise, Villa Porta',
  'spa_hotel': '💆 WELLNESS SPA - Lead with healing sound, meditation experience',
  'festival': '🎪 FESTIVAL STAGE - Lead with journey story, transformational aspect',
};

Object.keys(byType).sort().forEach(type => {
  const venues = byType[type];
  const strategy = strategies[type] || '📌 Custom approach needed';
  console.log('');
  console.log(`${type.toUpperCase()} (${venues.length} venues)`);
  console.log(`   Strategy: ${strategy}`);
  venues.forEach(v => {
    console.log(`   → ${v.name} (${v.country})`);
  });
});
