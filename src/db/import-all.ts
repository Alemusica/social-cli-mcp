/**
 * Import all existing data into SurrealDB
 * Creates the connected knowledge graph
 */

import { getDb, closeDb } from './client.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content');
const OUTREACH_DIR = path.join(CONTENT_DIR, 'outreach');
const MEDIA_DIR = path.join(PROJECT_ROOT, 'media');

// ═══════════════════════════════════════════════════════════════
// IMPORT CONTENT PILLARS
// ═══════════════════════════════════════════════════════════════

async function importContentPillars() {
  console.log('\n📊 Importing content pillars...');
  const db = await getDb();

  const pillars = [
    {
      name: 'tech',
      description: 'jsOM, AI tools, build-in-public, GitHub, developer content',
      hashtags: ['#buildinpublic', '#AI', '#jsOM', '#opensource', '#coding'],
      target_audience: ['developers', 'founders', 'AI_enthusiasts', 'tech'],
      posting_frequency: '2x/week',
      best_formats: ['thread', 'carousel', 'demo_video'],
    },
    {
      name: 'music_production',
      description: 'Ableton, ClyphX scripting, live looping workflow - BRIDGE pillar connecting tech and music',
      hashtags: ['#ableton', '#musicproduction', '#livelooping', '#musictech', '#workflow'],
      target_audience: ['producers', 'musicians', 'tech_musicians', 'live_loopers'],
      posting_frequency: '2x/week',
      best_formats: ['reel', 'carousel', 'thread'],
    },
    {
      name: 'live_performance',
      description: 'RAV Vast, busking, sunset sessions, stage shows, performances',
      hashtags: ['#busker', '#ravvast', '#handpan', '#flutur', '#livemusic'],
      target_audience: ['music_lovers', 'buskers', 'handpan_community', 'travel', 'wellness'],
      posting_frequency: '3x/week',
      best_formats: ['reel', 'single', 'story'],
    },
    {
      name: 'nature_authentic',
      description: 'Field recording, BTS, reflections, travel, authentic moments, family stories',
      hashtags: ['#fieldrecording', '#musicianlife', '#behindthescenes', '#travel', '#authentic'],
      target_audience: ['musicians', 'travel', 'sound_designers', 'storytelling'],
      posting_frequency: '2x/week',
      best_formats: ['single', 'carousel', 'story'],
    },
  ];

  for (const pillar of pillars) {
    await db.query(`
      INSERT INTO content_pillar (name, description, hashtags, target_audience, posting_frequency, best_formats)
      VALUES ($name, $description, $hashtags, $target_audience, $posting_frequency, $best_formats)
      ON DUPLICATE KEY UPDATE description = $description
    `, pillar);
  }

  console.log(`  ✅ Imported ${pillars.length} content pillars`);
}

// ═══════════════════════════════════════════════════════════════
// IMPORT BEST PRACTICES (Instagram 2026)
// ═══════════════════════════════════════════════════════════════

async function importBestPractices() {
  console.log('\n📚 Importing best practices...');
  const db = await getDb();

  const practices = [
    {
      title: 'Shares/Sends are top signal',
      platform: 'instagram',
      category: 'engagement',
      insight: 'Content that sparks real connection and gets shared to DMs ranks highest in 2026 algorithm',
      source: 'buffer.com/resources/instagram-algorithms',
    },
    {
      title: 'Watch time critical in first 3 seconds',
      platform: 'instagram',
      category: 'format',
      insight: '60%+ retention in first 3 seconds is critical for Reels performance',
      source: 'hootsuite.com/instagram-algorithm',
    },
    {
      title: 'Saves indicate value',
      platform: 'instagram',
      category: 'engagement',
      insight: 'Saves are a high-weight signal indicating content worth returning to',
      source: 'buffer.com/resources/instagram-algorithms',
    },
    {
      title: '3-5 hashtags maximum',
      platform: 'instagram',
      category: 'hashtags',
      insight: 'Instagram 2026 penalizes hashtag spam. Use 3-5 hyper-relevant tags only',
      source: 'hootsuite.com/instagram-algorithm',
    },
    {
      title: 'Carousel reach vs Reels reach',
      platform: 'instagram',
      category: 'format',
      insight: 'Reels: 30.81% reach (2x carousels). Carousels: better engagement & saves. Mix both.',
      source: 'hootsuite.com/experiment-carousels-vs-reels',
    },
    {
      title: 'Optimal posting times',
      platform: 'instagram',
      category: 'timing',
      insight: 'Feed posts: 18:00-21:00 CET. Reels: 9:00-12:00 or 20:00-23:00. Best days: Tue-Thu.',
      source: 'buffer.com/resources/how-often-to-post-on-instagram',
    },
    {
      title: 'Caption dwell time matters',
      platform: 'instagram',
      category: 'engagement',
      insight: 'Longer captions that keep users reading signal value to the algorithm',
      source: 'buffer.com/resources/instagram-algorithms',
    },
    {
      title: 'Non-followers discovery',
      platform: 'instagram',
      category: 'growth',
      insight: 'Reels reach 55% non-followers for discovery. Carousels reach 30%.',
      source: 'creatorsjet.com/blog/instagram-reels-vs-carousels-vs-images',
    },
  ];

  for (const practice of practices) {
    await db.create('best_practice', practice);
  }

  console.log(`  ✅ Imported ${practices.length} best practices`);
}

// ═══════════════════════════════════════════════════════════════
// IMPORT GIGS (Historical events)
// ═══════════════════════════════════════════════════════════════

async function importGigs() {
  console.log('\n🎸 Importing gigs...');
  const db = await getDb();

  const gigs = [
    {
      name: 'Greece Got Talent 2021',
      date: '2021-10-15',
      type: 'tv_appearance',
      city: 'Athens',
      country: 'Greece',
      description: '4 ΝΑΙ (YES) votes on national TV talent show',
      story_context: 'Started with €30, busked for 5 months in Astypalea, discovered by Alexandra',
      key_moment: 'The moment all 4 judges said YES',
    },
    {
      name: 'Astypalea Busking Summer 2021',
      date: '2021-07-01',
      type: 'busking',
      city: 'Astypalea',
      country: 'Greece',
      description: '5 months of street performance in the Dodecanese Islands',
      story_context: 'Living on tips, sleeping in hostels, playing Rav Vast and guitar',
      key_moment: 'The €30 tips with handwritten thank you note',
    },
    {
      name: 'Denver Tour 2023',
      date: '2023-01-15',
      type: 'concert',
      city: 'Denver',
      country: 'USA',
      description: 'First US tour stop',
      story_context: 'From street music to Denver concerts - VareseNews coverage',
      key_moment: 'Playing for people who flew in to hear the same sounds',
    },
    {
      name: 'Lanzarote Field Recording',
      date: '2023-06-01',
      type: 'field_recording',
      city: 'Timanfaya',
      country: 'Spain',
      description: 'Binaural recording session at volcanic landscape',
      story_context: 'Capturing the sound of Mars on Earth with KU100',
      key_moment: 'The silence of the volcanic crater',
    },
  ];

  for (const gig of gigs) {
    await db.create('gig', {
      ...gig,
      date: new Date(gig.date).toISOString(),
    });
  }

  console.log(`  ✅ Imported ${gigs.length} gigs`);
}

// ═══════════════════════════════════════════════════════════════
// IMPORT POSTS FROM EDITORIAL PLAN
// ═══════════════════════════════════════════════════════════════

async function importEditorialPosts() {
  console.log('\n📝 Importing editorial posts...');
  const db = await getDb();

  const postsFile = path.join(CONTENT_DIR, 'instagram-posts-ready.json');
  if (!fs.existsSync(postsFile)) {
    console.log('  ⚠️ instagram-posts-ready.json not found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(postsFile, 'utf-8'));
  const posts = [...(data.posts || []), ...(data.future_posts || [])];

  for (const post of posts) {
    await db.create('post', {
      platform: 'instagram',
      external_id: `planned_${post.id}`,
      content: post.caption || '',
      media_paths: post.photos_needed?.map((p: any) => p.file) || [],
      posted_at: new Date(),
      likes: 0,
      comments: 0,
      shares: 0,
      // Extended fields
      title: post.title,
      post_type: post.type,
      target_audience: post.target_audience || [],
      priority: post.priority || 'MEDIUM',
      best_time: post.best_time,
      status: 'planned',
    });

    // Link hashtags
    if (post.hashtags?.length) {
      for (const tag of post.hashtags) {
        const cleanTag = tag.replace('#', '').toLowerCase();
        await db.query(`
          INSERT INTO hashtag (name, total_uses) VALUES ($name, 1)
          ON DUPLICATE KEY UPDATE total_uses += 1
        `, { name: cleanTag });
      }
    }
  }

  console.log(`  ✅ Imported ${posts.length} editorial posts`);
}

// ═══════════════════════════════════════════════════════════════
// IMPORT VENUES FROM OUTREACH
// ═══════════════════════════════════════════════════════════════

async function importVenues() {
  console.log('\n🏢 Importing venues...');
  const db = await getDb();

  const files = [
    'venue-followups.json',
    'new-venues.json',
    'tier1-pending.json',
  ];

  let totalVenues = 0;

  for (const file of files) {
    const filePath = path.join(OUTREACH_DIR, file);
    if (!fs.existsSync(filePath)) continue;

    const venues = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const venue of venues) {
      await db.create('venue', {
        name: venue.venue || venue.name || 'Unknown',
        type: venue.type || 'venue',
        location: venue.location || '',
        country: venue.country || '',
        contact_email: venue.to || venue.email || '',
        contact_name: venue.contact || '',
        website: venue.website || '',
        instagram: venue.instagram || '',
        status: venue.status || 'prospect',
        tier: venue.tier || 2,
        notes: venue.notes || '',
      });
      totalVenues++;
    }
  }

  console.log(`  ✅ Imported ${totalVenues} venues`);
}

// ═══════════════════════════════════════════════════════════════
// IMPORT PHOTOS WITH METADATA
// ═══════════════════════════════════════════════════════════════

async function importPhotos() {
  console.log('\n📸 Importing photos with metadata...');
  const db = await getDb();

  // Categories from instagram-posts-ready.json
  const postsFile = path.join(CONTENT_DIR, 'instagram-posts-ready.json');
  if (!fs.existsSync(postsFile)) {
    console.log('  ⚠️ instagram-posts-ready.json not found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(postsFile, 'utf-8'));
  const mapping = data.photo_file_mapping || {};

  let totalPhotos = 0;

  for (const [category, files] of Object.entries(mapping)) {
    for (const file of files as string[]) {
      // Get metadata with exiftool if available
      let metadata: any = {};
      try {
        const exifJson = execSync(
          `exiftool -json -GPSLatitude -GPSLongitude -DateTimeOriginal -Make -Model "${file}" 2>/dev/null`,
          { encoding: 'utf-8' }
        );
        const exifData = JSON.parse(exifJson)[0];
        metadata = {
          taken_at: exifData.DateTimeOriginal ? new Date(exifData.DateTimeOriginal).toISOString() : null,
          camera: exifData.Make && exifData.Model ? `${exifData.Make} ${exifData.Model}` : null,
          location_lat: parseFloat(exifData.GPSLatitude) || null,
          location_lng: parseFloat(exifData.GPSLongitude) || null,
        };
      } catch {
        // exiftool not available or file not found
      }

      await db.create('content', {
        type: 'image',
        file_path: file,
        file_name: path.basename(file),
        category: category,
        tags: [category],
        used_count: 0,
        ...metadata,
      });
      totalPhotos++;
    }
  }

  console.log(`  ✅ Imported ${totalPhotos} photos`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN IMPORT
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🚀 Starting SurrealDB import...');
  console.log('═'.repeat(50));

  try {
    await importContentPillars();
    await importBestPractices();
    await importGigs();
    await importEditorialPosts();
    await importVenues();
    await importPhotos();

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Import complete! Knowledge graph ready.');
    console.log('\nQueries you can run:');
    console.log('  SELECT * FROM content_pillar;');
    console.log('  SELECT * FROM best_practice WHERE platform = "instagram";');
    console.log('  SELECT * FROM gig ORDER BY date DESC;');
    console.log('  SELECT * FROM venue WHERE status = "prospect";');
    console.log('  SELECT * FROM content WHERE category = "busking";');

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await closeDb();
  }
}

main();
