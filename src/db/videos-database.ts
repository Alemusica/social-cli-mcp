/**
 * FLUTUR VIDEO DATABASE
 * Video assets with metadata for intelligent pitch matching
 *
 * Each video has:
 * - Technical data (BPM, mood, instruments)
 * - Best use cases (venue types, pitch angles)
 * - Cultural context (recognition factor)
 */

export interface VideoData {
  id: string;
  url: string;
  title: string;
  description: string;

  // Technical
  bpm?: number;
  mood: string[];
  instruments: string[];
  style: string[];

  // Matching
  bestFor: string[];        // venue types
  pitchAngle: string;       // one-line pitch
  culturalContext?: string; // recognition/nostalgia factor

  // Source
  source: string;           // e.g., "Rocca Sunrise Set", "Greece TV"
  duration?: string;
}

// ═══════════════════════════════════════════════════════════════
// ROCCA SUNRISE SET - Segmented Videos
// ═══════════════════════════════════════════════════════════════

export const ROCCA_SET_VIDEOS: VideoData[] = [
  {
    id: 'rocca-intro-monkey-safari',
    url: 'https://youtu.be/isQZmMt0rW0',
    title: 'Rocca Sunrise - Intro (Monkey Safari - Safe)',
    description: 'Opening of the sunrise set on Monkey Safari "Safe" - atmospheric intro',
    bpm: 120,
    mood: ['atmospheric', 'building', 'cinematic', 'safe'],
    instruments: ['synth', 'console', 'effects'],
    style: ['melodic_house', 'electronic', 'progressive'],
    bestFor: ['beach_club', 'rooftop_bar', 'boutique_hotel', 'festival'],
    pitchAngle: 'Atmospheric melodic house opening sets',
    culturalContext: 'Monkey Safari = respected in melodic house scene, Diynamic/Einmusika vibe',
    source: 'Rocca Sunrise Set 2025'
  },
  {
    id: 'rocca-transcendence-rav',
    url: 'https://youtu.be/q1mTTMnQCvo',
    title: 'Rocca Sunrise - Transcendence (RAV + Jarl Flamar)',
    description: 'RAV Vast solo building into Jarl Flamar mashup - the transcendent moment',
    bpm: 105,
    mood: ['transcendent', 'spiritual', 'building', 'emotional'],
    instruments: ['rav_vast', 'live_looping'],
    style: ['organic_house', 'world_music', 'ambient'],
    bestFor: ['conscious_venue', 'wellness_retreat', 'festival', 'spa_hotel'],
    pitchAngle: 'Transcendent sound journeys with RAV Vast',
    culturalContext: 'Jarl Flamar style = recognized in handpan/organic house scene',
    source: 'Rocca Sunrise Set 2025'
  },
  {
    id: 'rocca-chase-the-sun',
    url: 'https://youtu.be/UH6sPB8zvBA',
    title: 'Rocca Sunrise - Chase The Sun (Percussive Guitar)',
    description: 'Percussive acoustic guitar on Planet Funk "Chase The Sun" - 120 BPM energy',
    bpm: 120,
    mood: ['energetic', 'nostalgic', 'uplifting', 'danceable'],
    instruments: ['acoustic_guitar', 'percussive_guitar', 'live_looping'],
    style: ['house', 'nu_disco', 'live_remix'],
    bestFor: ['beach_club', 'rooftop_bar', 'sunset_bar', 'music_venue'],
    pitchAngle: 'Live guitar remixes of classic anthems',
    culturalContext: 'Planet Funk = HUGE recognition in Italy, nostalgia factor for 30-45 crowd, venue owners grew up with this',
    source: 'Rocca Sunrise Set 2025'
  },
  {
    id: 'rocca-father-ocean-rav',
    url: 'https://youtu.be/Ba8HiRS4hjc',
    title: 'Rocca Sunrise - Father Ocean (RAV on Anjunadeep)',
    description: 'RAV Vast with huge reverb + dotted delay on Ben Böhmer remix of Monolink',
    bpm: 118,
    mood: ['deep', 'emotional', 'melodic', 'hypnotic'],
    instruments: ['rav_vast', 'effects', 'reverb'],
    style: ['melodic_house', 'anjunadeep', 'organic_house'],
    bestFor: ['beach_club', 'rooftop_bar', 'boutique_hotel', 'sunset_bar'],
    pitchAngle: 'RAV Vast meets melodic house - perfect golden hour sound',
    culturalContext: 'Ben Böhmer / Anjunadeep = premium beach club sound, recognized worldwide',
    source: 'Rocca Sunrise Set 2025'
  }
];

// ═══════════════════════════════════════════════════════════════
// STANDALONE VIDEOS
// ═══════════════════════════════════════════════════════════════

export const STANDALONE_VIDEOS: VideoData[] = [
  {
    id: 'who-is-flutur',
    url: 'https://youtu.be/rmnShcDsBBY',
    title: 'Who Is Flutur',
    description: 'Full journey story: busking Lake Maggiore → Greece Got Talent → Denver stages → Villa Porta residency',
    mood: ['narrative', 'emotional', 'inspiring'],
    instruments: ['rav_vast', 'guitar', 'piano'],
    style: ['documentary', 'storytelling'],
    bestFor: ['festival', 'conscious_venue', 'booking_agent', 'press'],
    pitchAngle: 'The complete artist journey - from street to stage',
    duration: '2:53',
    source: 'EPK Video 2025'
  },
  {
    id: 'greeces-got-talent',
    url: 'https://www.youtube.com/watch?v=NI23tAP0c8U',
    title: "Greece's Got Talent - 4 YES",
    description: 'TV appearance with 4 YES votes from judges - live performance credibility',
    mood: ['impressive', 'credible', 'professional'],
    instruments: ['rav_vast', 'live_looping'],
    style: ['tv_performance', 'live'],
    bestFor: ['jazz_club', 'music_venue', 'press', 'booking_agent'],
    pitchAngle: 'TV-validated live performance talent',
    culturalContext: 'TV talent show = instant credibility, proves stage presence',
    source: 'Greece TV 2022'
  },
  {
    id: 'efthymia',
    url: 'https://youtu.be/I-lpfRHTSG4',
    title: 'Efthymia - RAV Vast Meditation',
    description: 'Pure RAV Vast meditation piece - deep healing tones',
    mood: ['meditative', 'healing', 'peaceful', 'spiritual'],
    instruments: ['rav_vast'],
    style: ['meditation', 'sound_healing', 'ambient'],
    bestFor: ['wellness_retreat', 'spa_hotel', 'yoga_studio', 'conscious_venue'],
    pitchAngle: 'Sound healing and meditation sessions',
    source: 'Studio 2022'
  },
  {
    id: 'rocca-full-set',
    url: 'https://youtu.be/K7oROUjuLGQ',
    title: 'Rocca di Arona - Full Sunrise Set',
    description: 'Complete sunrise session with RAV Vast and live looping',
    mood: ['atmospheric', 'sunrise', 'organic'],
    instruments: ['rav_vast', 'guitar', 'live_looping', 'synth'],
    style: ['organic_house', 'live_looping', 'sunset_session'],
    bestFor: ['beach_club', 'rooftop_bar', 'boutique_hotel'],
    pitchAngle: 'Buddha Bar style sunset/sunrise sessions',
    source: 'Rocca di Arona 2025'
  }
];

// ═══════════════════════════════════════════════════════════════
// ALL VIDEOS
// ═══════════════════════════════════════════════════════════════

export const ALL_VIDEOS: VideoData[] = [
  ...ROCCA_SET_VIDEOS,
  ...STANDALONE_VIDEOS
];

// ═══════════════════════════════════════════════════════════════
// MATCHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Find best video for a venue type
 */
export function getBestVideoForVenueType(venueType: string, vibe?: string[]): VideoData {
  const vibeStr = (vibe || []).join(' ').toLowerCase();

  // Wellness/Spa → Efthymia or Transcendence
  if (venueType.includes('wellness') || venueType.includes('spa') || vibeStr.includes('yoga') || vibeStr.includes('meditation')) {
    if (vibeStr.includes('conscious') || vibeStr.includes('spiritual')) {
      return ALL_VIDEOS.find(v => v.id === 'rocca-transcendence-rav')!;
    }
    return ALL_VIDEOS.find(v => v.id === 'efthymia')!;
  }

  // Conscious/Transformational → Who Is Flutur or Transcendence
  if (venueType.includes('conscious') || vibeStr.includes('conscious') || vibeStr.includes('transformational')) {
    return ALL_VIDEOS.find(v => v.id === 'who-is-flutur')!;
  }

  // Jazz/Music Venue → Greece's Got Talent
  if (venueType.includes('jazz') || venueType.includes('music_venue')) {
    return ALL_VIDEOS.find(v => v.id === 'greeces-got-talent')!;
  }

  // Italian venues → Chase The Sun (nostalgia factor)
  // This will be handled in the generator based on country

  // Beach Club with organic/melodic vibe → Father Ocean
  if (venueType.includes('beach') && (vibeStr.includes('organic') || vibeStr.includes('melodic'))) {
    return ALL_VIDEOS.find(v => v.id === 'rocca-father-ocean-rav')!;
  }

  // Festival → Who Is Flutur
  if (venueType.includes('festival')) {
    return ALL_VIDEOS.find(v => v.id === 'who-is-flutur')!;
  }

  // Default for beach clubs/rooftops → Father Ocean (Anjuna style)
  if (venueType.includes('beach') || venueType.includes('sunset') || venueType.includes('rooftop')) {
    return ALL_VIDEOS.find(v => v.id === 'rocca-father-ocean-rav')!;
  }

  // Default → Full Rocca set
  return ALL_VIDEOS.find(v => v.id === 'rocca-full-set')!;
}

/**
 * Get video for Italian venues (use Chase The Sun for nostalgia)
 */
export function getBestVideoForItalianVenue(venueType: string, vibe?: string[]): VideoData {
  // For Italian beach clubs/bars → Chase The Sun has huge recognition
  if (venueType.includes('beach') || venueType.includes('bar') || venueType.includes('rooftop')) {
    return ALL_VIDEOS.find(v => v.id === 'rocca-chase-the-sun')!;
  }

  // Otherwise use standard logic
  return getBestVideoForVenueType(venueType, vibe);
}

/**
 * Get multiple videos for a pitch (for EPK/detailed emails)
 */
export function getVideosForPitch(venueType: string, vibe?: string[]): VideoData[] {
  const primary = getBestVideoForVenueType(venueType, vibe);
  const videos = [primary];

  // Add complementary videos
  if (venueType.includes('wellness') || venueType.includes('spa')) {
    videos.push(ALL_VIDEOS.find(v => v.id === 'who-is-flutur')!);
  }

  if (venueType.includes('beach') || venueType.includes('sunset')) {
    videos.push(ALL_VIDEOS.find(v => v.id === 'rocca-intro-monkey-safari')!);
  }

  if (venueType.includes('jazz') || venueType.includes('music')) {
    videos.push(ALL_VIDEOS.find(v => v.id === 'rocca-transcendence-rav')!);
  }

  return videos;
}

// ═══════════════════════════════════════════════════════════════
// LINKTREE DATA
// ═══════════════════════════════════════════════════════════════

export const LINKTREE = {
  url: 'https://linktr.ee/flutur',
  contains: [
    'All music links',
    'Video portfolio',
    'Booking contact',
    'Social profiles'
  ]
};
