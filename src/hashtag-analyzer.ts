#!/usr/bin/env npx tsx
/**
 * Hashtag Analyzer & Trending Finder
 *
 * Analyzes hashtag performance and finds trending tags
 * Agent-agnostic: works with any posting system
 */

import Surreal from 'surrealdb';

// ═══════════════════════════════════════════════════════════════
// HASHTAG CATEGORIES & NICHES
// ═══════════════════════════════════════════════════════════════

const HASHTAG_NICHES = {
  // Music Production (broad reach)
  music_production: {
    primary: ['#musicproducer', '#beatmaker', '#producerlife', '#studiolife', '#musicproduction'],
    secondary: ['#electronicmusic', '#producer', '#beats', '#musicstudio', '#makingmusic'],
    niche: ['#dawless', '#synthesizer', '#modular', '#ableton', '#flstudio'],
  },

  // Field Recording (tech niche, high respect)
  field_recording: {
    primary: ['#fieldrecording', '#sounddesign', '#binaural', '#ambisonic', '#soundscape'],
    secondary: ['#audioengineering', '#locationrecording', '#soundart', '#ambientrecording'],
    niche: ['#ku100', '#neumann', '#dpa', '#sounddevices', '#zoomrecorders', '#asmr'],
    tech_respect: ['#immersiveaudio', '#spatialAudio', '#3daudio', '#dolbyatmos'],
  },

  // Landscape Photography (artistic)
  landscape_artistic: {
    primary: ['#landscapephotography', '#naturephotography', '#earthpix', '#landscape_captures'],
    secondary: ['#visualsofearth', '#discoverearth', '#earthfocus', '#naturephoto'],
    artistic: ['#fineartphotography', '#minimallandscape', '#moodylandscape', '#atmosphericphotography'],
    niche: ['#longexposure', '#goldenlight', '#bluehour', '#dramaticsky'],
  },

  // Travel/Adventure
  travel: {
    primary: ['#travelgram', '#wanderlust', '#explore', '#adventure', '#travelphotography'],
    secondary: ['#instatravel', '#traveltheworld', '#passportready', '#globetrotter'],
    niche: ['#digitalnomad', '#solotravel', '#offthebeatenpath'],
  },

  // Busking/Street Performance
  busking: {
    primary: ['#busking', '#streetmusic', '#streetperformer', '#livemusic'],
    secondary: ['#acousticmusic', '#handpan', '#streetart', '#publicperformance'],
    niche: ['#hangdrum', '#pantam', '#steelpan', '#worldmusic'],
  },
};

// ═══════════════════════════════════════════════════════════════
// TRENDING HASHTAG STRATEGIES
// ═══════════════════════════════════════════════════════════════

const HASHTAG_STRATEGIES = {
  // Mix of hashtag sizes for optimal reach
  optimal_mix: {
    large: 3,      // >1M posts (broad reach, high competition)
    medium: 7,     // 100K-1M posts (good reach, moderate competition)
    small: 10,     // 10K-100K posts (niche, lower competition)
    micro: 5,      // <10K posts (very niche, can dominate)
  },

  // For field recording (tech niche)
  field_recording_focus: {
    large: 2,
    medium: 5,
    small: 8,
    micro: 10,   // More micro tags for tech niche
  },
};

// ═══════════════════════════════════════════════════════════════
// BEST PRACTICES
// ═══════════════════════════════════════════════════════════════

export const BEST_PRACTICES = {
  general: [
    'Use 20-25 hashtags per post (not 30 - looks spammy)',
    'Mix hashtag sizes: large (3), medium (7), small (10), micro (5)',
    'Put hashtags in first comment, not caption (cleaner look)',
    'Rotate hashtags - dont use same set every post',
    'Use location-specific tags for local reach',
    'Include 2-3 brand/personal hashtags consistently',
  ],

  field_recording: [
    'Focus on tech-specific tags: #ku100 #sounddevices #binauralrecording',
    'Tag gear manufacturers for potential reposts',
    'Use #sounddesign to reach film/game audio community',
    'Include location of recording for context',
    'Cross-post to audio engineering communities',
  ],

  landscape_artistic: [
    'Use #fineartphotography for gallery-style shots',
    'Tag camera/lens for gear community engagement',
    'Include location tags for travel community',
    'Use moody/atmospheric tags for artistic shots',
    'Submit to feature accounts with their hashtags',
  ],

  music_production: [
    'Tag DAW/software used',
    'Include genre-specific tags',
    'Tag collaborators for cross-promotion',
    'Use #studiolife for behind-the-scenes',
    'Include release-related tags when promoting tracks',
  ],
};

// ═══════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getHashtagsForCategory(category: string, location?: string): {
  hashtags: string[];
  strategy: string;
} {
  let hashtags: string[] = [];
  let strategy = 'optimal_mix';

  // Get category-specific hashtags
  const niche = HASHTAG_NICHES[category as keyof typeof HASHTAG_NICHES];
  if (niche) {
    hashtags = [
      ...niche.primary,
      ...niche.secondary,
      ...(niche.niche || []),
      ...((niche as any).artistic || []),
      ...((niche as any).tech_respect || []),
    ];

    if (category === 'field_recording') {
      strategy = 'field_recording_focus';
    }
  }

  // Add location hashtags
  if (location) {
    const locationTags = getLocationHashtags(location);
    hashtags = [...hashtags, ...locationTags];
  }

  // Add brand tags
  hashtags = [...hashtags, '#flutur', '#electronicmusic'];

  // Dedupe and limit
  hashtags = [...new Set(hashtags)].slice(0, 25);

  return { hashtags, strategy };
}

function getLocationHashtags(location: string): string[] {
  const locationMap: Record<string, string[]> = {
    'Lanzarote, Canary Islands': ['#lanzarote', '#canaryislands', '#timanfaya'],
    'Morocco': ['#morocco', '#maroc', '#visitmorocco'],
    'Ios/Amorgos, Greece': ['#greekislands', '#cyclades', '#greece'],
    'Lago Maggiore, Italy': ['#lagomaggiore', '#italy', '#lakeporn'],
    'Venezia, Italy': ['#venice', '#venezia', '#visitvenice'],
    'Denver, Colorado': ['#denver', '#colorado', '#milehighcity'],
    'Madeira, Portugal': ['#madeira', '#portugal', '#atlantic'],
  };
  return locationMap[location] || [];
}

// Save hashtag performance to DB for learning
export async function trackHashtagPerformance(
  hashtags: string[],
  engagement: { likes: number; comments: number; reach: number }
): Promise<void> {
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  const engagementScore = engagement.likes + engagement.comments * 2;

  for (const tag of hashtags) {
    await db.query(`
      UPDATE hashtag SET
        total_uses = (total_uses OR 0) + 1,
        total_engagement = (total_engagement OR 0) + $engagement,
        avg_engagement = ((avg_engagement OR 0) * (total_uses OR 0) + $engagement) / ((total_uses OR 0) + 1)
      WHERE name = $tag
    `, { tag: tag.replace('#', ''), engagement: engagementScore });
  }

  await db.close();
}

// Get top performing hashtags from DB
export async function getTopHashtags(limit = 20): Promise<any[]> {
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  const result = await db.query(`
    SELECT name, total_uses, avg_engagement
    FROM hashtag
    WHERE total_uses > 0
    ORDER BY avg_engagement DESC
    LIMIT $limit
  `, { limit });

  await db.close();
  return (result[0] as any[]) || [];
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('📊 HASHTAG ANALYZER\n');
  console.log('═'.repeat(60) + '\n');

  // Show best practices
  console.log('📋 BEST PRACTICES:\n');
  for (const practice of BEST_PRACTICES.general) {
    console.log(`  • ${practice}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n🎙️ FIELD RECORDING (Tech Niche):\n');
  for (const practice of BEST_PRACTICES.field_recording) {
    console.log(`  • ${practice}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n🏔️ LANDSCAPE ARTISTIC:\n');
  for (const practice of BEST_PRACTICES.landscape_artistic) {
    console.log(`  • ${practice}`);
  }

  // Show hashtag recommendations
  console.log('\n' + '═'.repeat(60));
  console.log('\n🏷️ RECOMMENDED HASHTAGS BY CATEGORY:\n');

  const categories = ['field_recording', 'landscape_artistic', 'music_production', 'busking'];

  for (const cat of categories) {
    const { hashtags } = getHashtagsForCategory(cat);
    console.log(`\n${cat.toUpperCase()}:`);
    console.log(`  ${hashtags.slice(0, 15).join(' ')}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Use these strategies for optimal Instagram growth!\n');
}

main().catch(console.error);
