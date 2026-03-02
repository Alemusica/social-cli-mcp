/**
 * FLUTUR ARTIST CONFIG
 * =====================
 * Single source of truth for landing page content.
 * Agents can update this file to change any content.
 */

export const ARTIST = {
  name: 'Flutur',
  fullName: 'Alessio Ivoy Cazzaniga',
  tagline: 'From silence, layer by layer',
  shortBio: 'FLUTUR builds living sound from silence — voice, guitar, RAV Vast, live looping, one-man orchestra. From €35 and a psychiatric crisis to Greece\'s Got Talent, main stage Aspen, and a 4-year lakeside residency. Self-contained. No backline. The butterfly unfolds.',

  // Contact
  email: 'alessio.cazzaniga87@gmail.com',
  bookingEmail: 'alessio.cazzaniga87@gmail.com',
  whatsapp: 'https://wa.me/message/BT7I47SK2I6FK1',

  // Social
  instagram: 'https://instagram.com/flutur_8',
  youtube: 'https://youtube.com/@flutur8i8',
  spotify: 'https://open.spotify.com/artist/3GzIadwrlZW8GjMVRROoE9',
  soundcloud: 'https://soundcloud.com/realscape',
  bandcamp: 'https://fluturbandcamp.bandcamp.com',
  facebook: 'https://www.facebook.com/flutur8',
};

/**
 * THE JOURNEY - Timeline for storytelling
 */
export const JOURNEY = [
  {
    year: '2021',
    title: 'The Beginning',
    description: '€30 in pocket, 5 months busking on Greek islands',
    location: 'Astypalea, Greece',
  },

  {
    year: '2022',
    title: "Greece's Got Talent",
    description: '4 YES votes on national television',
    location: 'Athens, Greece',
    highlight: true,
  },
  {
    year: '2022–25',
    title: 'Villa Porta Residency',
    description: '4-year Friday sunset sessions at luxury hotel',
    location: 'Lake Maggiore, Italy',
    highlight: true,
  },
  {
    year: '2023',
    title: 'Drishti Beats Main Stage',
    description: 'Solo main stage set at Drishti Beats Festival — RAV Vast, live looping, Ableton Push',
    location: 'Snowmass Village (Aspen), Colorado',
    highlight: true,
  },
  {
    year: '2024',
    title: 'Kailash 2.0 with Equanimous',
    description: 'Collaboration with Equanimous (100M+ streams, Gravitas Recordings)',
    location: 'Remote / Studio',
    highlight: true,
  },
  {
    year: '2025',
    title: 'Materia Festival + Rocca Session',
    description: 'Festival performance at Materia + rooftop DJ+instruments session at Rocca',
    location: 'Varese, Italy',
  },
  {
    year: '2026',
    title: 'Now Booking',
    description: 'Available for venues, festivals, and retreats worldwide',
    location: 'Worldwide',
    current: true,
  },
];

/**
 * CREDENTIALS - Social proof
 */
export const CREDENTIALS = [
  {
    text: 'Drishti Beats Festival — Main Stage',
    year: '2023',
    highlight: true,
  },
  {
    text: "Greece's Got Talent — 4 YES",
    year: '2022',
    highlight: true,
  },
  {
    text: 'Equanimous collab — Kailash 2.0',
    year: '2024',
    highlight: true,
  },
  {
    text: 'Villa Porta — 4 Year Residency',
    year: '2022–25',
    highlight: true,
  },
  {
    text: 'Opened for IHF — Denver + Drishti Beats Festival',
    year: '2023',
    highlight: false,
  },
  {
    text: 'RAV Vast Endorsed Artist',
    year: '2022',
    highlight: false,
  },
  {
    text: 'Materia Festival 2025',
    year: '2025',
    highlight: false,
  },
];

/**
 * TECHNIQUE - What is live looping?
 */
export const TECHNIQUE = {
  title: 'The Sound',
  description: 'Every performance starts from silence. Voice, guitar, RAV Vast, drum pad, synth — each layer is a clone, built live in real time. The music grows the way nature grows: not architecture, but an ecosystem unfolding.',
  instruments: ['Voice', 'Guitar', 'RAV Vast', 'Ableton Push 3', 'Haken Continuum', 'Drum Pad', 'Shaker'],
  format: 'From silence to full ecosystem — the process IS the show',
};

/**
 * PAST VENUES - Social proof for bookers
 */
export const PAST_VENUES = [
  {
    name: 'Drishti Beats Festival',
    type: 'Festival — Main Stage',
    location: 'Snowmass Village (Aspen), Colorado',
    period: 'July 2023',
    description: 'Solo main stage set + guest in IHF set',
  },
  {
    name: 'Relais Villa Porta',
    type: 'Boutique Hotel',
    location: 'Lake Maggiore, Italy',
    period: '2022–2025',
    description: '4-year Friday sunset ceremony residency',
  },
  {
    name: "Your Mom's House",
    type: 'Concert Venue',
    location: 'Denver, Colorado',
    period: 'January 2023',
    description: 'Opened for IHF at Your Mom\'s House, Denver',
  },
  {
    name: 'Materia Festival',
    type: 'Festival',
    location: 'Varese, Italy',
    period: 'March 2025',
    description: 'Live performance + workshop',
  },
  {
    name: 'Rocca Discotheque',
    type: 'Rooftop',
    location: 'Arona, Lake Maggiore',
    period: 'September 2025',
    description: 'Live instruments + electronic set rooftop session',
  },
  {
    name: 'Greek Islands Busking',
    type: 'Street & Beach',
    location: 'Astypalea, Ios, Amorgos',
    period: '2021–2022',
    description: '5 months busking circuit',
  },
];

/**
 * PHOTOS - Gallery images from media/music/images/
 * Copied to public/images/ for static export
 */
export const PHOTOS = [
  // Performance photos first — this is what booking agents need to see
  {
    id: 'rocca-rav-devotional',
    src: '/images/optimized/rocca-rav-devotional.webp',
    alt: 'FLUTUR playing RAV Vast at golden hour rooftop session',
    location: 'Rocca, Lake Maggiore',
    category: 'performance',
  },
  {
    id: 'denver-ihf-electric',
    src: '/images/optimized/denver-ihf-electric.webp',
    alt: 'FLUTUR live on stage with electric guitar and smoke at IHF show',
    location: 'Denver, Colorado',
    category: 'performance',
  },
  {
    id: 'rocca-full-rig',
    src: '/images/optimized/rocca-full-rig.webp',
    alt: 'FLUTUR full one-man orchestra setup — RAV, guitar, Push, DJ controller',
    location: 'Rocca, Lake Maggiore',
    category: 'performance',
  },
  {
    id: 'denver-ihf-rav',
    src: '/images/optimized/denver-ihf-rav.webp',
    alt: 'FLUTUR playing RAV Vast on stage with teal psychedelic lighting',
    location: 'Denver, Colorado',
    category: 'performance',
  },
  {
    id: 'rocca-guitar-golden',
    src: '/images/optimized/rocca-guitar-golden.webp',
    alt: 'FLUTUR acoustic guitar at golden hour',
    location: 'Rocca, Lake Maggiore',
    category: 'performance',
  },
  {
    id: 'rocca-silhouette',
    src: '/images/optimized/rocca-silhouette.webp',
    alt: 'FLUTUR silhouette at sunrise — ethereal atmosphere',
    location: 'Rocca, Lake Maggiore',
    category: 'atmosphere',
  },
];

/**
 * PRESS - Third party validation
 * Structured for better UX: quote is text, link is separate action
 */
export const PRESS = [
  {
    outlet: 'RAV Vast',
    quote: 'Endorsed Artist',
    context: 'Official instrument endorsement',
    date: '2022',
    hasLink: false,
    url: '',
  },
  {
    outlet: 'VareseNews',
    quote: 'Un sorprendente viaggio musicale tra suono e anima',
    context: 'Materia Festival 2025 feature',
    date: 'March 2025',
    hasLink: true,
    url: 'https://www.varesenews.it/2025/03/flutur-a-materia-un-sorprendente-viaggio-musicale-tra-suono-e-anima/2180487/',
  },
  {
    outlet: 'VareseNews',
    quote: 'Dalla musica di strada sul Lago Maggiore ai concerti di Denver',
    context: 'Denver tour coverage',
    date: 'May 2023',
    hasLink: true,
    url: 'https://www.varesenews.it/2023/05/flutur-dalla-musica-di-strada-sul-lago-maggiore-ai-concerti-nelle-venue-di-denver/1607555/',
  },
];

/**
 * TESTIMONIALS - Written endorsements from collaborators
 * σ₂: Formal reference letters — verified, quotable, contactable upon request
 */
export const TESTIMONIALS = [
  {
    name: 'Ben Gorvine',
    role: 'Professional Musician & Producer (IHF / Otherwish)',
    credentials: 'Music licensed by Google and Apple | Coachella, Electric Forest, Lightning in a Bottle',
    quote: 'His musicianship elevated the performance. I hold his work in high regard and would confidently recommend him.',
    context: 'Booked FLUTUR as support act in Denver, later invited on stage at festival',
    year: '2026',
    bestFor: ['music_venue', 'concert', 'festival', 'agency', 'residency'],
  },
  {
    name: 'Jeremy & Lori Lowell',
    role: 'Festival Directors — Drishti Beats LLC (Snowmass Village, CO)',
    credentials: 'ERYT-500, YACEP',
    quote: 'His prowess, in his own art, truly took the live musical experience to another level. We offer our sincerest recommendations.',
    context: 'FLUTUR performed solo main stage at Drishti Beats Festival 2023',
    year: '2026',
    bestFor: ['wellness', 'yoga', 'retreat', 'festival', 'residency'],
  },
];

/**
 * PERFORMANCE FORMATS - What bookers can book
 */
export const FORMATS = [
  {
    name: 'Intimate',
    duration: '60–90 min',
    description: 'Voice, guitar, RAV Vast. Barefoot, sunset. The unfolding at its most direct.',
    bestFor: 'Beach clubs, rooftops, hotels, wellness retreats',
  },
  {
    name: 'The Show',
    duration: '60–90 min',
    description: 'One-man orchestra — full rig, all instruments, everything built from silence in real time.',
    bestFor: 'Festivals, concerts, listening bars, special events',
  },
  {
    name: 'Extended Session',
    duration: '90–120 min',
    description: 'Curated electronic set with live instruments layered on top — RAV Vast, guitar, drums.',
    bestFor: 'Beach clubs, pool parties, rooftop bars',
  },
];

/**
 * PERFORMANCE MODES - The 3 real bookable formats
 * Each mode has a video proof and equipment list
 */
export const PERFORMANCE_MODES = [
  {
    id: 'sunset-ambient',
    name: 'Sunset / Ambient',
    duration: '60–90 min',
    description: 'Soft RAV Vast, gentle guitar, meditative layering. Starts deep and intimate, builds to warm organic textures.',
    equipment: ['RAV Vast', 'Acoustic Guitar', 'Ableton Push 3', 'Vocals'],
    bestFor: ['Beach clubs', 'Rooftop bars', 'Hotels', 'Spas', 'Yoga retreats'],
    videoId: 'transcendence',
  },
  {
    id: 'the-show',
    name: 'The Show (Full Live)',
    duration: '60–90 min',
    description: 'Full energy live looping — everything built in real time. RAV Vast, guitar, drums, synth, vocals layered into a concert-level crescendo.',
    equipment: ['RAV Vast', 'Guitar', 'Drums/Pad', 'Synth', 'Ableton Push 3', 'Vocals', 'Gibraltar Rack'],
    bestFor: ['Festivals', 'Concert halls', 'Listening bars', 'Special events'],
    videoId: 'father-ocean',
  },
  {
    id: 'extended-session',
    name: 'Extended Session',
    duration: '90–120 min',
    description: 'Curated electronic set with live instruments layered on top — RAV Vast, guitar, drums over a curated sonic landscape.',
    equipment: ['DJ Controller', 'RAV Vast', 'Guitar', 'Alesis Drum Pad', 'Vocals'],
    bestFor: ['Beach clubs', 'Pool parties', 'Club openings', 'Rooftop bars'],
    videoId: 'father-ocean',
  },
];

/**
 * TECH RIDER - Venue requirements summary
 */
export const TECH_RIDER = {
  selfContained: true,
  headline: 'Fully self-contained act — no backline, no sound engineer needed',
  artistEquipment: [
    { item: 'Gibraltar Rack', note: 'Semi-curved, 2 fan sections. Mounts everything compact.' },
    { item: 'RAV Vast × 2', note: 'Contact mic → DI' },
    { item: 'Acoustic Guitar', note: 'Behind rack, pickup → DI' },
    { item: 'Ableton Push 3', note: 'Live looping, sampling, sequencing' },
    { item: 'Pioneer FLX-4', note: 'Controller for Extended Session mode' },
    { item: 'Launchpad / Sample Pad', note: 'Percussion, triggers, mounted on rack' },
    { item: 'Audio Interface (RME)', note: 'Central mixer hub — all sources → stereo main out balanced' },
    { item: 'Vocal Mic', note: 'Dynamic, XLR' },
    { item: 'Own Monitor (optional)', note: 'Linear monitor with stand — brings own if no wedge' },
  ],
  venueNeeds: [
    { item: 'PA System', spec: 'Stereo, min 500W (small) / 1kW+ (large)' },
    { item: 'Main Input', spec: '2× XLR balanced stereo (from artist interface)' },
    { item: 'Vocal Channel', spec: '1× XLR, phantom power OFF (dynamic mic)' },
    { item: 'Monitor', spec: '1 wedge preferred — artist can bring own if unavailable' },
    { item: 'Power', spec: '220V, 2× outlets within 3m (artist brings own strips/extensions)' },
    { item: 'Stage Space', spec: '2m × 2m minimum, 2.5m × 2.5m comfortable (full setup with drum kit)' },
    { item: 'Cover / Shade', spec: 'Required for outdoor daytime (electronics need shade)' },
  ],
  signalFlow: 'All instruments → Audio Interface (internal mix) → Stereo XLR balanced L/R to house PA + 1× Vocal XLR separate',
  setup: '30–45 min',
  soundcheck: '15 min',
  breakdown: '20 min',
  downloadUrl: '/downloads/flutur-tech-rider-2026.pdf',
  promoUrl: '/downloads/flutur-promo-2026.pdf',
};

/**
 * VENUE TYPES - Perfect for section
 */
export const VENUE_TYPES = [
  'Beach Clubs',
  'Wellness Retreats',
  'Boutique Hotels',
  'Jazz Clubs',
  'Rooftop Bars',
  'Festivals',
];

/**
 * VIDEOS - All video content
 */
export const VIDEOS = {
  default: 'transcendence',
  items: [
    {
      id: 'transcendence',
      title: 'RAV Vast + Live Looping',
      subtitle: 'Transcendent sound journey',
      youtube: 'https://youtu.be/q1mTTMnQCvo',
      youtubeId: 'q1mTTMnQCvo',
      bestFor: ['jazz', 'music_venue', 'rooftop', 'boutique_hotel'],
      duration: '4:32',
    },
    {
      id: 'father-ocean',
      title: 'Anjunadeep Style',
      subtitle: 'Golden hour melodic house',
      youtube: 'https://youtu.be/Ba8HiRS4hjc',
      youtubeId: 'Ba8HiRS4hjc',
      bestFor: ['beach', 'sunset', 'melodic', 'organic'],
      duration: '5:18',
    },
    {
      id: 'chase-the-sun',
      title: 'Chase The Sun',
      subtitle: 'Planet Funk live remix',
      youtube: 'https://youtu.be/UH6sPB8zvBA',
      youtubeId: 'UH6sPB8zvBA',
      bestFor: ['italian', 'nostalgia', 'beach_club'],
      duration: '3:45',
    },
    {
      id: 'efthymia',
      title: 'Efthymia — RAV Vast Solo',
      subtitle: 'Sunset session, Astypalea',
      youtube: 'https://youtu.be/I-lpfRHTSG4',
      youtubeId: 'I-lpfRHTSG4',
      bestFor: ['wellness', 'spa', 'yoga', 'meditation'],
      duration: '6:12',
    },
    {
      id: 'rocca-full-set',
      title: 'Extended Session',
      subtitle: 'Full 40-min rooftop session',
      youtube: 'https://www.youtube.com/watch?v=UI7lYdNvSi0',
      youtubeId: 'UI7lYdNvSi0',
      bestFor: ['beach_club', 'dj', 'extended', 'rooftop'],
      duration: '40:00',
    },
    {
      id: 'who-is-flutur',
      title: 'The Journey',
      subtitle: 'Full artist documentary',
      youtube: 'https://youtu.be/rmnShcDsBBY',
      youtubeId: 'rmnShcDsBBY',
      bestFor: ['epk', 'press', 'booking_agent'],
      duration: '2:53',
    },
    {
      id: 'ggt',
      title: "Greece's Got Talent",
      subtitle: '4 YES votes',
      youtube: 'https://youtu.be/NI23tAP0c8U',
      youtubeId: 'NI23tAP0c8U',
      bestFor: ['credibility', 'press'],
      duration: '8:00',
    },
    {
      id: 'materia',
      title: 'Materia Festival',
      subtitle: 'Live at Materia 2025',
      youtube: '',
      youtubeId: '',
      instagram: 'https://www.instagram.com/p/DHgMjnUg0R5/',
      bestFor: ['festival', 'live', 'press'],
      duration: '1:00',
    },
  ],
};

/**
 * UTM → VIDEO MAPPING
 */
export const UTM_VIDEO_MAP: Record<string, string> = {
  'jazz': 'transcendence',
  'music': 'transcendence',
  'rooftop': 'transcendence',
  'beach': 'father-ocean',
  'sunset': 'father-ocean',
  'melodic': 'father-ocean',
  'wellness': 'efthymia',
  'spa': 'efthymia',
  'yoga': 'efthymia',
  'meditation': 'efthymia',
  'festival': 'who-is-flutur',
  'press': 'who-is-flutur',
  'italian': 'chase-the-sun',
  'greece': 'ggt',
  'greek': 'ggt',
};

/**
 * MUSIC LINKS
 */
export const MUSIC_LINKS = [
  { name: 'Spotify', url: 'https://open.spotify.com/artist/3GzIadwrlZW8GjMVRROoE9' },
  { name: 'YouTube', url: 'https://youtube.com/@flutur8i8' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/realscape' },
  { name: 'Bandcamp', url: 'https://fluturbandcamp.bandcamp.com' },
];

/**
 * SOCIAL LINKS - Connect channels
 */
export const SOCIAL_LINKS = [
  { name: 'Instagram', url: 'https://instagram.com/flutur_8', icon: 'instagram' },
  { name: 'Facebook', url: 'https://www.facebook.com/flutur8', icon: 'facebook' },
  { name: 'WhatsApp', url: 'https://wa.me/message/BT7I47SK2I6FK1', icon: 'whatsapp' },
  { name: 'Telegram', url: 'https://t.me/flutur_8', icon: 'telegram' },
  { name: 'Viber (+39 351 698 6198)', url: 'viber://chat?number=%2B393516986198', icon: 'viber' },
];

/**
 * BOOKING CONFIG
 */
export const BOOKING = {
  available: '2026 Season',
  regions: ['Europe', 'Mediterranean', 'USA'],
  minDuration: '60 min',
  techRequirements: 'PA system, 2 DI inputs',
};

/**
 * Helper: Get video by UTM campaign
 */
export function getVideoForCampaign(utmCampaign?: string | null): typeof VIDEOS.items[0] {
  if (!utmCampaign) {
    return VIDEOS.items.find(v => v.id === VIDEOS.default)!;
  }

  const campaignLower = utmCampaign.toLowerCase();
  for (const [keyword, videoId] of Object.entries(UTM_VIDEO_MAP)) {
    if (campaignLower.includes(keyword)) {
      return VIDEOS.items.find(v => v.id === videoId) || VIDEOS.items[0];
    }
  }

  return VIDEOS.items.find(v => v.id === VIDEOS.default)!;
}

/**
 * BRAND IDENTITY — σ₂ Declaration
 * The truth about who FLUTUR is. Read by agents before generating output.
 * Full record in SurrealDB: brand_identity:flutur
 */
export const BRAND_IDENTITY = {
  concept: 'UNFOLD',
  whoIAm: 'I build living sound from silence, alone, in real time, in front of you. Every loop is a clone of me. The music grows the way nature grows. I carry everything on my back. Self-contained: no backline, no sound engineer. The name FLUTUR was given to me at home by someone who loved me. Butterfly in Albanian. I am, period.',
  whoIAmNot: [
    'Not a producer — a live performer',
    'Not a sound healer — a musician who plays in wellness contexts',
    'Not a DJ — a one-man orchestra that can also DJ',
    'Not a handpan busker — instruments unify into one organism',
  ],
  voice: {
    tone: ['honest', 'poetic', 'behind-the-scenes', 'reflective'],
    neverSay: ['I will be performing in...', 'Book me now!', 'Sound healing session'],
  },
  visualConstant: 'The PROCESS of building — from silence to fullness. This is what the audience sees in every mode.',
};

/**
 * Helper: Check if golden hour (4-7pm local)
 */
export function isGoldenHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 16 && hour <= 19;
}
