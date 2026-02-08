#!/usr/bin/env npx tsx
/**
 * Build Graph Relations in SurrealDB
 * Connects: gigs → venues → similar venues → pitch targets
 * Creates a navigable knowledge graph for AI agents
 */

import Surreal from 'surrealdb';

async function main() {
  console.log('🔗 Building Graph Relations\n');

  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  // ============================================
  // 1. Add Flutur's key gigs if not present
  // ============================================
  console.log('📍 Adding key gigs...\n');

  const keyGigs = [
    {
      name: 'Greece Got Talent 2021',
      type: 'tv_appearance',
      date: '2021-03-15',
      city: 'Athens',
      country: 'Greece',
      description: '4 YES from judges, reached semifinals',
      story_context: 'Started with €30, busked 5 months in Astypalea, got discovered',
      key_moment: 'Standing ovation from judges',
      tier: 1,
      tags: ['breakthrough', 'tv', 'talent_show', 'viral'],
    },
    {
      name: 'Villa Porta Summer Sessions',
      type: 'residency',
      date: '2019-07-01',
      city: 'Lake Maggiore',
      country: 'Italy',
      venue_name: 'Villa Porta',
      description: '4 years of summer residency at luxury lakeside venue',
      story_context: 'Sunset sessions with Rav Vast overlooking the lake',
      key_moment: 'Repeat booking every summer',
      tier: 1,
      tags: ['luxury', 'sunset', 'ambient', 'residency', 'repeat_client'],
    },
    {
      name: 'Denver Street to Stage',
      type: 'busking',
      date: '2023-01-20',
      city: 'Denver',
      country: 'USA',
      description: 'Busking in downtown Denver, invited to perform at venue',
      story_context: 'Cold winter day, played for hours, venue owner stopped by',
      key_moment: 'Spontaneous invitation to headline show',
      tier: 2,
      tags: ['busking', 'discovery', 'winter', 'usa'],
    },
    {
      name: 'Lanzarote Sound Journey',
      type: 'performance',
      date: '2025-01-08',
      city: 'Lanzarote',
      country: 'Spain',
      description: 'Field recording and busking sessions in volcanic landscape',
      story_context: 'Capturing the sound of the island with KU100',
      key_moment: 'Binaural recording at sunrise',
      tier: 1,
      tags: ['field_recording', 'binaural', 'volcanic', 'canary_islands'],
    },
    {
      name: 'Astypalea Busking Season',
      type: 'busking',
      date: '2021-06-01',
      city: 'Astypalea',
      country: 'Greece',
      description: '5 months of daily busking on the island',
      story_context: 'Living on €30, playing for survival and passion',
      key_moment: 'Got noticed by talent scout',
      tier: 2,
      tags: ['origin_story', 'greek_islands', 'survival', 'daily_busking'],
    },
    {
      name: 'Ios Summer Sessions',
      type: 'busking',
      date: '2024-05-06',
      city: 'Ios',
      country: 'Greece',
      description: 'Sunset sessions on Greek islands',
      story_context: 'Playing handpan at golden hour spots',
      tier: 2,
      tags: ['greek_islands', 'sunset', 'handpan', 'summer'],
    },
    {
      name: 'Morocco Desert Recording',
      type: 'field_recording',
      date: '2022-09-01',
      city: 'Sahara',
      country: 'Morocco',
      description: 'Field recording expedition in the desert',
      story_context: 'Capturing silence and wind in the dunes',
      tier: 2,
      tags: ['field_recording', 'desert', 'ambient', 'soundscape'],
    },
    {
      name: 'Madeira Levada Sessions',
      type: 'busking',
      date: '2023-09-02',
      city: 'Funchal',
      country: 'Portugal',
      description: 'Playing in the mountains and coastal spots',
      story_context: 'Tropical island vibes with Rav Vast',
      tier: 2,
      tags: ['island', 'nature', 'tropical', 'atlantic'],
    },
  ];

  for (const gig of keyGigs) {
    // Check if exists
    const existing = await db.query(`
      SELECT * FROM gig WHERE name = $name
    `, { name: gig.name });

    if ((existing[0] as any[])?.length === 0) {
      await db.query(`
        CREATE gig SET
          name = $name,
          type = $type,
          date = <datetime>$date,
          city = $city,
          country = $country,
          venue_name = $venue,
          description = $desc,
          story_context = $story,
          key_moment = $moment,
          tier = $tier,
          tags = $tags
      `, {
        name: gig.name,
        type: gig.type,
        date: gig.date + 'T00:00:00Z',
        city: gig.city,
        country: gig.country,
        venue: gig.venue_name || null,
        desc: gig.description,
        story: gig.story_context,
        moment: gig.key_moment,
        tier: gig.tier,
        tags: gig.tags,
      });
      console.log(`   ✅ Added gig: ${gig.name}`);
    } else {
      console.log(`   ⏭️  Gig exists: ${gig.name}`);
    }
  }

  // ============================================
  // 2. Define venue similarity criteria
  // ============================================
  console.log('\n🏷️  Tagging venues by similarity to past gigs...\n');

  // Add similarity tags to venues based on Flutur's proven success patterns
  const similarityRules = [
    // Luxury sunset venues like Villa Porta
    {
      pattern: { type: ['beach_club', 'luxury_resort', 'boutique_hotel'], vibe: ['sunset', 'ambient', 'chill'] },
      similar_to: 'Villa Porta',
      pitch_angle: 'sunset_ambient',
    },
    // Greek islands similar to Astypalea/Ios
    {
      pattern: { country: ['Greece'], type: ['beach_bar', 'restaurant', 'hotel'] },
      similar_to: 'Greek Islands Busking',
      pitch_angle: 'greek_island_vibe',
    },
    // Cultural venues like talent shows
    {
      pattern: { type: ['cultural_venue', 'theater', 'concert_hall'] },
      similar_to: 'Greece Got Talent',
      pitch_angle: 'live_performance',
    },
    // Wellness/retreat centers
    {
      pattern: { type: ['wellness_retreat', 'yoga_center', 'spa'] },
      similar_to: 'Sound Healing Sessions',
      pitch_angle: 'sound_healing',
    },
  ];

  // Update venues with pitch angles based on similarity
  await db.query(`
    UPDATE venue SET pitch_angle = 'sunset_ambient', similar_to_gig = 'Villa Porta'
    WHERE type IN ['beach_club', 'luxury_resort', 'boutique_hotel']
  `);

  await db.query(`
    UPDATE venue SET pitch_angle = 'greek_island_vibe', similar_to_gig = 'Greek Islands'
    WHERE country = 'Greece'
  `);

  await db.query(`
    UPDATE venue SET pitch_angle = 'sound_healing', similar_to_gig = 'Wellness Events'
    WHERE type IN ['wellness_retreat', 'yoga_center', 'spa', 'hot_springs']
  `);

  console.log('   ✅ Tagged venues with pitch angles');

  // ============================================
  // 3. Create relations: gig -> performed_at -> venue
  // ============================================
  console.log('\n🔗 Creating gig-venue relations...\n');

  // Link Villa Porta gig to similar venues
  const villaGig = await db.query(`SELECT id FROM gig WHERE name CONTAINS 'Villa Porta' LIMIT 1`);
  const villaGigId = (villaGig[0] as any)?.[0]?.id;

  if (villaGigId) {
    const luxuryVenues = await db.query(`SELECT id FROM venue WHERE type IN ['beach_club', 'luxury_resort', 'boutique_hotel'] AND tier <= 2`);
    for (const venue of (luxuryVenues[0] as any[]) || []) {
      await db.query(`
        RELATE $gig->similar_venue->$venue SET
          similarity_reason = 'luxury_sunset_ambient',
          pitch_strength = 0.9
      `, { gig: villaGigId, venue: venue.id });
    }
    console.log(`   ✅ Linked Villa Porta to ${(luxuryVenues[0] as any[])?.length || 0} luxury venues`);
  }

  // Link GGT to Greek venues
  const ggtGig = await db.query(`SELECT id FROM gig WHERE name CONTAINS 'Greece Got Talent' LIMIT 1`);
  const ggtGigId = (ggtGig[0] as any)?.[0]?.id;

  if (ggtGigId) {
    const greekVenues = await db.query(`SELECT id FROM venue WHERE country = 'Greece'`);
    for (const venue of (greekVenues[0] as any[]) || []) {
      await db.query(`
        RELATE $gig->similar_venue->$venue SET
          similarity_reason = 'greek_market_proven',
          pitch_strength = 0.95
      `, { gig: ggtGigId, venue: venue.id });
    }
    console.log(`   ✅ Linked GGT to ${(greekVenues[0] as any[])?.length || 0} Greek venues`);
  }

  console.log('   ✅ Created gig-venue similarity relations');

  // ============================================
  // 4. Link content to gigs (photos from those locations/dates)
  // ============================================
  console.log('\n📸 Linking content to gigs...\n');

  // Link Lanzarote photos to Lanzarote gig
  const lanzGig = await db.query(`SELECT id FROM gig WHERE city = 'Lanzarote' LIMIT 1`);
  const lanzGigId = (lanzGig[0] as any)?.[0]?.id;
  if (lanzGigId) {
    const lanzPhotos = await db.query(`SELECT id FROM content WHERE location CONTAINS 'Lanzarote'`);
    for (const photo of (lanzPhotos[0] as any[]) || []) {
      await db.query(`RELATE $photo->taken_at_gig->$gig SET context = 'lanzarote_sound_journey'`, {
        photo: photo.id, gig: lanzGigId
      });
    }
    console.log(`   ✅ Linked ${(lanzPhotos[0] as any[])?.length || 0} Lanzarote photos`);
  }

  // Link Greece photos
  const iosGig = await db.query(`SELECT id FROM gig WHERE city = 'Ios' LIMIT 1`);
  const iosGigId = (iosGig[0] as any)?.[0]?.id;
  if (iosGigId) {
    const greecePhotos = await db.query(`SELECT id FROM content WHERE location CONTAINS 'Greece' OR location CONTAINS 'Ios' OR location CONTAINS 'Amorgos'`);
    for (const photo of (greecePhotos[0] as any[]) || []) {
      await db.query(`RELATE $photo->taken_at_gig->$gig SET context = 'greek_islands_sessions'`, {
        photo: photo.id, gig: iosGigId
      });
    }
    console.log(`   ✅ Linked ${(greecePhotos[0] as any[])?.length || 0} Greece photos`);
  }

  // Link Morocco photos
  const moroccoGig = await db.query(`SELECT id FROM gig WHERE country = 'Morocco' LIMIT 1`);
  const moroccoGigId = (moroccoGig[0] as any)?.[0]?.id;
  if (moroccoGigId) {
    const moroccoPhotos = await db.query(`SELECT id FROM content WHERE location CONTAINS 'Morocco'`);
    for (const photo of (moroccoPhotos[0] as any[]) || []) {
      await db.query(`RELATE $photo->taken_at_gig->$gig SET context = 'desert_recording'`, {
        photo: photo.id, gig: moroccoGigId
      });
    }
    console.log(`   ✅ Linked ${(moroccoPhotos[0] as any[])?.length || 0} Morocco photos`);
  }

  console.log('   ✅ Linked content to gigs by location');

  // ============================================
  // 5. Define the similar_venue relation type
  // ============================================
  console.log('\n📐 Creating relation schema...\n');

  await db.query(`
    DEFINE TABLE IF NOT EXISTS similar_venue TYPE RELATION IN gig OUT venue;
    DEFINE FIELD similarity_reason ON similar_venue TYPE option<string>;
    DEFINE FIELD pitch_strength ON similar_venue TYPE option<float>;
  `);

  await db.query(`
    DEFINE TABLE IF NOT EXISTS similar_artist TYPE RELATION IN artist_profile OUT venue;
    DEFINE FIELD connection_type ON similar_artist TYPE option<string>;
    DEFINE FIELD notes ON similar_artist TYPE option<string>;
  `);

  console.log('   ✅ Relation schemas defined');

  // ============================================
  // 6. Show graph summary
  // ============================================
  console.log('\n📊 Graph Summary:\n');

  const gigCount = await db.query(`SELECT count() FROM gig GROUP ALL`);
  const venueCount = await db.query(`SELECT count() FROM venue GROUP ALL`);
  const contentCount = await db.query(`SELECT count() FROM content GROUP ALL`);
  const relationCount = await db.query(`
    SELECT
      (SELECT count() FROM similar_venue GROUP ALL)[0].count as similar_venue,
      (SELECT count() FROM taken_at_gig GROUP ALL)[0].count as taken_at_gig,
      (SELECT count() FROM analyzed_in GROUP ALL)[0].count as analyzed_in
  `);

  console.log(`   Gigs: ${(gigCount[0] as any)?.[0]?.count || 0}`);
  console.log(`   Venues: ${(venueCount[0] as any)?.[0]?.count || 0}`);
  console.log(`   Content: ${(contentCount[0] as any)?.[0]?.count || 0}`);
  console.log(`\n   Relations:`);
  const rels = (relationCount[0] as any)?.[0] || {};
  console.log(`   - similar_venue: ${rels.similar_venue || 0}`);
  console.log(`   - taken_at_gig: ${rels.taken_at_gig || 0}`);
  console.log(`   - analyzed_in: ${rels.analyzed_in || 0}`);

  // Show traversal example
  console.log('\n🔍 Example graph traversal:');
  console.log('   "Find venues similar to where I\'ve had success"\n');

  const traversal = await db.query(`
    SELECT
      name as gig_name,
      city,
      country,
      (SELECT out.name, out.country, similarity_reason FROM ->similar_venue LIMIT 3) as similar_venues
    FROM gig
    WHERE tier = 1
    LIMIT 3
  `);

  for (const gig of (traversal[0] as any[]) || []) {
    console.log(`   ${gig.gig_name} (${gig.city}, ${gig.country})`);
    if (gig.similar_venues?.length > 0) {
      for (const v of gig.similar_venues.slice(0, 2)) {
        console.log(`      → ${v.name} (${v.country}) [${v.similarity_reason}]`);
      }
    }
  }

  await db.close();
  console.log('\n✅ Graph relations built successfully');
}

main().catch(console.error);
