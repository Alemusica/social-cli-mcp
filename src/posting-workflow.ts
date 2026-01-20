#!/usr/bin/env npx tsx
/**
 * Smart Instagram Posting Workflow
 * - Auto-generates hashtags based on category/location
 * - Suggests people to tag
 * - Tracks performance in SurrealDB
 */

import Surreal from 'surrealdb';

// ═══════════════════════════════════════════════════════════════
// HASHTAG STRATEGY
// ═══════════════════════════════════════════════════════════════

const HASHTAGS = {
  // By category
  landscape: ['#landscapephotography', '#naturephotography', '#earthpix', '#landscape_captures', '#visualsofearth'],
  sunset: ['#sunset', '#goldenhour', '#sunsetlovers', '#sunset_pics', '#skylovers'],
  busking: ['#busking', '#streetmusic', '#livemusic', '#handpan', '#streetperformer'],
  studio: ['#musicproduction', '#producerlife', '#studiolife', '#beatmaker', '#musicstudio'],
  urban: ['#streetphotography', '#urbanphotography', '#citylife', '#architecture', '#urbanexplorer'],
  tour: ['#tourlife', '#ontheroad', '#musicianlife', '#livemusic', '#gigging'],
  portrait: ['#portrait', '#portraitphotography', '#selfie', '#travelportrait'],
  adventure: ['#adventure', '#explore', '#travelgram', '#wanderlust', '#adventuretime'],
  street: ['#streetlife', '#streetscene', '#documentaryphotography', '#everydaylife'],
  social: ['#goodvibes', '#friends', '#beachclub', '#summervibes'],
  field_recording: ['#fieldrecording', '#sounddesign', '#binaural', '#ku100', '#ambientrecording', '#audioengineering', '#soundscape', '#immersiveaudio', '#spatialAudio', '#3daudio'],
  artistic: ['#fineartphotography', '#minimallandscape', '#moodylandscape', '#atmosphericphotography', '#artphotography', '#visualart', '#photoart'],

  // By location
  'Lanzarote, Canary Islands': ['#lanzarote', '#canaryislands', '#visitcanarias', '#timanfaya', '#islascanarias'],
  'Morocco': ['#morocco', '#maroc', '#visitmorocco', '#essaouira', '#taghazout', '#surfmorocco'],
  'Lago Maggiore, Italy': ['#lagomaggiore', '#italy', '#lakeporn', '#italianlandscape', '#piemonte'],
  'Ios/Amorgos, Greece': ['#greekislands', '#cyclades', '#greece', '#aegeansea', '#visitgreece'],
  'Venezia, Italy': ['#venice', '#venezia', '#visitvenice', '#italy', '#venicecanals'],
  'Denver, Colorado': ['#denver', '#colorado', '#milehighcity', '#coloradolive', '#denvermusic'],
  'Napoli, Italy': ['#napoli', '#naples', '#visitnaples', '#italy', '#southitaly'],
  'Madeira, Portugal': ['#madeira', '#portugal', '#visitmadeira', '#madeiraIsland', '#atlantic'],
  'Lisbon, Portugal': ['#lisbon', '#lisboa', '#portugal', '#visitlisbon', '#ponte25deabril'],
  'Milano, Italy': ['#milan', '#milano', '#milanocity', '#arcodellapace', '#italy'],
  'Sicilia, Italy': ['#sicily', '#sicilia', '#visitsicily', '#italy', '#mediterraneo'],

  // Always include (brand)
  brand: ['#flutur', '#electronicmusic', '#producer'],
};

// ═══════════════════════════════════════════════════════════════
// COLLABORATORS TO TAG
// ═══════════════════════════════════════════════════════════════

const COLLABORATORS: Record<string, string[]> = {
  // Studio sessions - identify people and their handles
  studio: [], // Add collaborator handles here: ['@producer_name', '@guitarist']
  busking: [],
  social: [],
};

// ═══════════════════════════════════════════════════════════════
// CAPTION TEMPLATES
// ═══════════════════════════════════════════════════════════════

const CAPTION_TEMPLATES = {
  landscape: [
    '{description}\n\n📍 {location}\n\n{hashtags}',
    'Lost in the beauty of {location} ✨\n\n{hashtags}',
  ],
  sunset: [
    'Golden hour magic ☀️\n\n{description}\n📍 {location}\n\n{hashtags}',
    'Chasing sunsets in {location} 🌅\n\n{hashtags}',
  ],
  busking: [
    'Music in the streets 🎵\n\n{description}\n📍 {location}\n\n{hashtags}',
    'When the city becomes your stage 🎶\n\n{hashtags}',
  ],
  studio: [
    'Studio vibes 🎛️\n\n{description}\n\n{collaborators}\n\n{hashtags}',
    'Creating something special... 🎵\n\n{collaborators}\n\n{hashtags}',
  ],
  tour: [
    'On the road 🚗\n\n{description}\n📍 {location}\n\n{hashtags}',
    'Tour life moments ✈️\n\n{hashtags}',
  ],
  urban: [
    'City views 🏙️\n\n{description}\n📍 {location}\n\n{hashtags}',
  ],
  portrait: [
    '{description}\n📍 {location}\n\n{hashtags}',
  ],
  adventure: [
    'Adventure awaits 🌍\n\n{description}\n📍 {location}\n\n{hashtags}',
  ],
  street: [
    'Street stories 📸\n\n{description}\n📍 {location}\n\n{hashtags}',
  ],
  social: [
    'Good times ✨\n\n{description}\n\n{collaborators}\n\n{hashtags}',
  ],
  field_recording: [
    'Capturing sounds 🎙️\n\n{description}\n📍 {location}\n\n{hashtags}',
    'Sound hunting in {location} 🔊\n\n{hashtags}',
  ],
  artistic: [
    '{description}\n\n📍 {location}\n\n{hashtags}',
    'Visual poetry from {location} ✨\n\n{hashtags}',
  ],
};

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

interface ContentItem {
  id: string;
  file_name: string;
  file_path: string;
  category: string;
  description: string;
  location: string;
  taken_at: string;
}

function generateHashtags(category: string, location: string): string[] {
  const tags = new Set<string>();

  // Add brand tags
  HASHTAGS.brand.forEach(t => tags.add(t));

  // Add category tags
  const catTags = HASHTAGS[category as keyof typeof HASHTAGS];
  if (Array.isArray(catTags)) {
    catTags.forEach(t => tags.add(t));
  }

  // Add location tags
  const locTags = HASHTAGS[location as keyof typeof HASHTAGS];
  if (Array.isArray(locTags)) {
    locTags.forEach(t => tags.add(t));
  }

  return Array.from(tags).slice(0, 25); // Instagram limit is 30
}

function generateCaption(content: ContentItem): string {
  const templates = CAPTION_TEMPLATES[content.category as keyof typeof CAPTION_TEMPLATES] || ['{description}\n\n{hashtags}'];
  const template = templates[Math.floor(Math.random() * templates.length)];

  const hashtags = generateHashtags(content.category, content.location);
  const collaborators = COLLABORATORS[content.category]?.join(' ') || '';

  return template
    .replace('{description}', content.description || '')
    .replace('{location}', content.location || 'Unknown')
    .replace('{hashtags}', hashtags.join(' '))
    .replace('{collaborators}', collaborators)
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
}

async function getReadyToPostContent(): Promise<ContentItem[]> {
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  const result = await db.query(`
    SELECT *
    FROM content
    WHERE category IS NOT NONE
    AND description IS NOT NONE
    AND description != 'null'
    AND (used_count = 0 OR used_count IS NONE)
    ORDER BY rand()
    LIMIT 10
  `);

  await db.close();
  return (result[0] as ContentItem[]) || [];
}

async function markAsPosted(contentId: string, platform: string, postUrl: string): Promise<void> {
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  // Update used count
  await db.query(`UPDATE $id SET used_count = (used_count OR 0) + 1`, { id: contentId });

  // Create post record
  await db.query(`
    CREATE post SET
      platform = $platform,
      external_id = $postUrl,
      content = $contentId,
      posted_at = time::now()
  `, { platform, postUrl, contentId });

  await db.close();
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('📱 INSTAGRAM POSTING WORKFLOW\n');
  console.log('═'.repeat(60) + '\n');

  const content = await getReadyToPostContent();

  if (content.length === 0) {
    console.log('❌ No content ready to post. Add descriptions to photos first.');
    return;
  }

  console.log(`Found ${content.length} photos ready to post:\n`);

  for (const item of content) {
    console.log('─'.repeat(60));
    console.log(`\n📸 ${item.file_name}`);
    console.log(`📍 ${item.location || 'Unknown'}`);
    console.log(`🏷️  ${item.category}`);
    console.log(`\n📝 SUGGESTED CAPTION:\n`);

    const caption = generateCaption(item);
    console.log(caption);

    console.log(`\n🖼️  File: ${item.file_path}`);
    console.log();
  }

  console.log('═'.repeat(60));
  console.log('\n✅ Ready to post! Use Telegram bot or CLI to publish.\n');
}

main().catch(console.error);

export { generateCaption, generateHashtags, getReadyToPostContent, markAsPosted };
