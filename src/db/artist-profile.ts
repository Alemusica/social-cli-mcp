/**
 * Artist Profile for FLUTUR
 * This file defines who you are so future agents know immediately
 */

export const ARTIST_PROFILE = {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  name: 'Alessio',
  stage_name: 'Flutur',
  pronouns: 'he/him',
  based_in: 'Italy',
  languages: ['Italian', 'English', 'Spanish'],

  // ═══════════════════════════════════════════════════════════════
  // MUSIC & PERFORMANCE
  // ═══════════════════════════════════════════════════════════════
  instruments: [
    { name: 'Rav Vast', role: 'primary', note: 'ENDORSER - tag @ravvast in all posts' },
    { name: 'Guitar', role: 'primary' },
    { name: 'Handpan', role: 'secondary' },
    { name: 'Synthesizers/Keys', role: 'electronic' },
  ],

  genres: [
    'Ambient',
    'Electronic',
    'World Music',
    'Meditative',
    'Live Looping',
  ],

  performance_types: [
    { type: 'DJ Set', setting: 'clubs, beach clubs, festivals' },
    { type: 'Live Performance', setting: 'concerts, venues, retreats' },
    { type: 'Busking', setting: 'streets, squares, markets' },
    { type: 'Sound Bath', setting: 'wellness retreats, yoga studios' },
    { type: 'Ambient Sets', setting: 'hotels, rooftops, restaurants' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // TECH & SKILLS
  // ═══════════════════════════════════════════════════════════════
  technical_skills: [
    'Field Recording (Neumann KU100 binaural head)',
    'Sound Design',
    'Live Looping',
    'Music Production',
    'Software Development (jsOM)',
  ],

  equipment: {
    field_recording: ['Neumann KU100', 'Sound Devices'],
    performance: ['Rav Vast', 'Guitar', 'Looper', 'Synths'],
  },

  // ═══════════════════════════════════════════════════════════════
  // STORY & ACHIEVEMENTS
  // ═══════════════════════════════════════════════════════════════
  story: {
    origin: 'Started with €30 in Greece, busked for 5 months in Astypalea',
    breakthrough: 'Greece Got Talent 2021 - 4 ΝΑΙ (YES) votes on national TV',
    milestone: 'Became Rav Vast endorser after returning from Greece',
    press: 'VareseNews: "From street music on Lake Maggiore to Denver concerts"',
    tours: ['Denver 2023', 'Greece 2021'],
  },

  endorsements: [
    { brand: 'Rav Vast', handle: '@ravvast', type: 'instrument' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // USA FESTIVAL CIRCUIT 2023 (KEY CREDENTIAL FOR GATEKEEPERS)
  // ═══════════════════════════════════════════════════════════════
  usa_festival_2023: {
    your_moms_house_denver: {
      date: 'January 2023',
      role: 'Main support for IHF',
      ihf_credentials: 'Coachella, Electric Forest, Lightning in a Bottle',
      how_booked: 'Booking agent found Flutur busking in Milan',
    },
    drishti_beats_festival: {
      date: 'July 2023',
      location: 'Snowmass Village (Aspen), Colorado',
      role: 'MAIN STAGE - solo set + guest in IHF set',
      setup: 'RAV Vast + live looping + guitar + bass + Ableton Push + vocoder',
      how_booked: 'IHF invited after liking Denver opening set',
      materials: ['interview', 'photos', 'festival IG posts', 'board with name'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // COLLABS & RELEASES (LIMITED - FOCUS ON LIVE)
  // ═══════════════════════════════════════════════════════════════
  releases: {
    kailash_2_0: {
      collab: 'Equanimous',
      collab_streams: '100M+',
      label: 'Gravitas Recordings',
      plays: 65000,
    },
    efthymia: { plays: 2000 },
    spotify_monthly_listeners: 683,
    note: 'FLUTUR is a LIVE ACT, not a producer. Focus on performance, not releases.',
  },

  // ═══════════════════════════════════════════════════════════════
  // LIVE SETUP (CONTEXT-DEPENDENT)
  // ═══════════════════════════════════════════════════════════════
  live_setup: {
    core: ['vocals', 'acoustic_guitar', 'rav_vast', 'looper'],
    optional: ['electric_guitar', 'drums', 'drum_pad', 'haken_continuum', 'ableton_push_3'],
    minimum: 'Voce + Chitarra + RAV Vast + Looper',
    full_orchestra: 'All of the above - one-man orchestra',
  },

  // ═══════════════════════════════════════════════════════════════
  // SOUND HEALING
  // ═══════════════════════════════════════════════════════════════
  sound_healing: {
    background: 'self_taught',
    years_experience: 4,
    context: 'Sunset ceremonies for luxury hospitality guests at Villa Porta',
    certified: false,
    note: 'Genuine experience and positive feedback, not certificated',
  },

  // ═══════════════════════════════════════════════════════════════
  // OUTREACH RULES (CRITICAL FOR EMAIL GENERATION)
  // ═══════════════════════════════════════════════════════════════
  outreach_rules: {
    never_say: ["I'll be in [place]", 'Passing through', "I'll be there"],
    always_say: ['Available for 2026 booking', 'Seeking opportunities'],
    positioning_by_venue: {
      wellness_retreats: 'Sound Journey Facilitator',
      festivals: 'Workshop + Performance combo',
      venues: 'Versatile setup (minimal to full orchestra)',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // CREDENTIALS SUMMARY (USE THIS FOR ALL OUTREACH)
  // ═══════════════════════════════════════════════════════════════
  credentials_for_outreach: [
    'Main stage at Drishti Beats Festival 2023 (yoga+music, Aspen/Colorado)',
    'Main support for IHF (Coachella, Electric Forest, Lightning in a Bottle artist)',
    'Collab with Equanimous (100M+ streams, Gravitas Recordings)',
    '4-year residency at Villa Porta, Lake Maggiore (sunset ceremonies)',
    'RAV Vast Endorsed Artist',
    "Greece's Got Talent - 4 YES votes",
  ],

  // ═══════════════════════════════════════════════════════════════
  // SOCIAL MEDIA
  // ═══════════════════════════════════════════════════════════════
  social: {
    instagram: '@flutur_8',
    twitter: '@flutur_8',
    youtube: 'Flutur',
    website: null,
  },

  brand_hashtags: ['#flutur', '#ravvast', '#streetmusic', '#fieldrecording'],

  // ═══════════════════════════════════════════════════════════════
  // IDEAL VENUES & SETTINGS
  // ═══════════════════════════════════════════════════════════════
  ideal_venues: {
    types: [
      'Beach clubs (sunset sessions)',
      'Rooftop bars (ambient sets)',
      'Wellness retreats (sound baths)',
      'Boutique hotels (lobby/pool music)',
      'Yoga studios (meditation sessions)',
      'Festivals (world music, ambient stages)',
      'Art galleries (vernissage events)',
      'Private events (weddings, corporate)',
    ],
    regions_priority: [
      { region: 'Greece', reason: 'Strong story connection, islands', tier: 1 },
      { region: 'Portugal', reason: 'Growing music scene, beach clubs', tier: 1 },
      { region: 'Canary Islands', reason: 'Year-round season, wellness tourism', tier: 1 },
      { region: 'Italy', reason: 'Home base, Lake Maggiore connection', tier: 2 },
      { region: 'Spain (Balearics)', reason: 'Ibiza/Mallorca scene', tier: 2 },
      { region: 'Morocco', reason: 'Previous visits, photo content', tier: 3 },
    ],
    vibe: ['chill', 'sunset', 'meditative', 'organic', 'boutique'],
    avoid: ['loud clubs', 'mainstream EDM', 'corporate chains'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTENT PILLARS
  // ═══════════════════════════════════════════════════════════════
  content_pillars: [
    {
      name: 'tech',
      description: 'jsOM, AI tools, build-in-public, GitHub, developer content',
      frequency: '2x/week',
      hashtags: ['buildinpublic', 'AI', 'jsOM', 'opensource'],
      platforms: ['Twitter', 'LinkedIn', 'YouTube'],
    },
    {
      name: 'music_production',
      description: 'Ableton, ClyphX scripting, live looping workflow - BRIDGE pillar',
      frequency: '2x/week',
      hashtags: ['ableton', 'musicproduction', 'livelooping'],
      platforms: ['Twitter', 'Instagram', 'TikTok'],
    },
    {
      name: 'live_performance',
      description: 'RAV Vast, busking, sunset sessions, stage shows, performances',
      frequency: '3x/week',
      hashtags: ['busker', 'ravvast', 'handpan', 'flutur'],
      platforms: ['Instagram', 'TikTok', 'YouTube'],
    },
    {
      name: 'nature_authentic',
      description: 'Field recording, BTS, reflections, travel, authentic moments',
      frequency: '2x/week',
      hashtags: ['fieldrecording', 'musicianlife', 'behindthescenes'],
      platforms: ['Instagram', 'Twitter'],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // PHOTO LIBRARY CATEGORIES
  // ═══════════════════════════════════════════════════════════════
  photo_categories: {
    busking: 'Street performance moments',
    busking_ggt_2021: 'Greece Got Talent journey photos',
    tour: 'Denver and other tour stops',
    landscape_lanzarote: 'Volcanic landscapes, field recording locations',
    landscape_athens: 'Acropolis, Athens night shots',
    artistic_greece_2021: 'Greek church series, silhouettes',
    field_recording: 'KU100, equipment, recording sessions',
    sunset: 'Morocco, Madeira, Venice sunsets',
  },

  // ═══════════════════════════════════════════════════════════════
  // M-SHAPED MIND (Dual Identity)
  // ═══════════════════════════════════════════════════════════════
  dual_identity: {
    music: {
      brand: 'Flutur',
      focus: 'Ambient, Rav Vast, field recording, live performance',
    },
    software: {
      brand: 'jsOM',
      focus: 'Software development (separate from music)',
      note: 'Keep separate on social unless explicitly combined',
    },
  },
};

/**
 * Insert profile into SurrealDB
 */
export async function insertArtistProfile(db: any) {
  // Store as a single profile document
  await db.query(`
    DELETE FROM artist_profile WHERE name = 'Flutur';
    INSERT INTO artist_profile $profile;
  `, { profile: ARTIST_PROFILE });

  console.log('✅ Artist profile inserted into SurrealDB');
}
