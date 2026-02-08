/**
 * Editorial Intelligence
 *
 * Connects audience insights with content strategy to produce
 * cohesive editorial decisions. This is the "brain" that makes
 * planning feel coherent.
 *
 * Key functions:
 * - Analyze audience data to inform content direction
 * - Suggest narrative arcs based on audience composition
 * - Connect brand pillars with audience interests
 * - Generate contextual content briefs
 *
 * Usage:
 *   import { getContentBrief, suggestNarrativeArc } from './core/editorial-intelligence.js';
 *
 *   const brief = await getContentBrief('instagram', 'story');
 *   // Returns: { audience, theme, tone, suggestions, avoid }
 */

import { getDb } from '../db/client.js';
import { getLatestAudienceSnapshot, getCorridorAnalysis } from './insights-archiver.js';
import type { AudienceSnapshotRecord } from './insights-archiver.js';

// Brand pillars from CLAUDE.md
const BRAND_PILLARS = [
  {
    id: 'tech',
    name: 'Tech Innovation',
    hashtags: ['buildinpublic', 'AI', 'jsOM'],
    platforms: ['twitter', 'linkedin', 'youtube'],
    audience_fit: ['developers', 'tech_enthusiasts'],
    best_times: ['09:00-11:00'],
    tone: 'informative, authentic, process-focused',
  },
  {
    id: 'music_production',
    name: 'Music Production (BRIDGE)',
    hashtags: ['ableton', 'musicproduction', 'livelooping'],
    platforms: ['twitter', 'instagram', 'tiktok'],
    audience_fit: ['musicians', 'producers', 'tech_curious'],
    best_times: ['12:00-14:00', '18:00-20:00'],
    tone: 'educational, behind-the-scenes, passionate',
  },
  {
    id: 'live_performance',
    name: 'Live Performance',
    hashtags: ['busker', 'ravvast', 'handpan', 'flutur'],
    platforms: ['instagram', 'tiktok', 'youtube'],
    audience_fit: ['music_lovers', 'wellness', 'travel'],
    best_times: ['18:00-21:00'],
    tone: 'emotional, visual, immersive',
  },
  {
    id: 'nature_authentic',
    name: 'Nature & Authentic',
    hashtags: ['fieldrecording', 'musicianlife'],
    platforms: ['instagram', 'twitter'],
    audience_fit: ['mindful', 'nature_lovers', 'seekers'],
    best_times: ['07:00-09:00', '21:00-23:00'],
    tone: 'reflective, poetic, intimate',
  },
];

export interface ContentBrief {
  platform: string;
  content_type: string;
  audience: {
    primary_countries: { country: string; pct: number }[];
    primary_age: string;
    corridor_insight: string;
  };
  recommended_pillar: string;
  theme_suggestion: string;
  tone: string;
  hashtags: string[];
  best_time: string;
  avoid: string[];
  context: string;
}

export interface NarrativeArc {
  name: string;
  theme: string;
  duration_days: number;
  audience_rationale: string;
  daily_beats: {
    day: string;
    platform: string;
    content_type: string;
    brief: string;
    pillar: string;
  }[];
  crossover_moment: string;
}

/**
 * Get content brief based on audience data
 */
export async function getContentBrief(
  platform: string,
  contentType: string,
  options?: {
    pillar?: string;
    theme?: string;
  }
): Promise<ContentBrief | null> {
  const audience = await getLatestAudienceSnapshot();
  const corridor = await getCorridorAnalysis();

  if (!audience) {
    console.warn('⚠️ No audience data available. Run archiveAudienceInsights() first.');
    return null;
  }

  // Determine best pillar for platform
  const platformPillars = BRAND_PILLARS.filter(p =>
    p.platforms.includes(platform)
  );

  const recommendedPillar = options?.pillar
    ? BRAND_PILLARS.find(p => p.id === options.pillar)!
    : platformPillars[0];

  // Build audience summary
  const topCountries = audience.top_countries.slice(0, 3).map(c => ({
    country: c.country,
    pct: Math.round((c.count / audience.followers) * 100),
  }));

  const primaryAge = audience.age_gender.length > 0
    ? audience.age_gender.sort((a, b) => (b.male + b.female) - (a.male + a.female))[0].ageRange
    : 'unknown';

  // Generate theme based on corridor
  let themeSuggestion = options?.theme || '';
  if (!themeSuggestion && corridor) {
    if (corridor.corridorPct > 60) {
      themeSuggestion = 'Il ponte: storie che connettono Italia e Grecia';
    } else {
      themeSuggestion = 'Layer su layer: dal sunrise in Grecia al codice AI';
    }
  }

  // Determine best time
  const now = new Date();
  const hour = now.getHours();
  let bestTime = recommendedPillar.best_times[0];
  if (platform === 'instagram' && contentType === 'story') {
    bestTime = '19:00-21:00'; // Peak for stories
  }

  // Things to avoid
  const avoid = [
    'Contenuti generici senza connessione personale',
    'Poll/quiz senza contesto (pubblico non ancora maturo)',
    'Richieste di engagement forzate',
    'Hashtag spam (max 3-5 rilevanti)',
  ];

  // Context based on day
  const dayOfWeek = now.getDay();
  let context = '';
  if (dayOfWeek === 6) { // Saturday
    context = '🌉 Sabato = Crossover day. Connetti tech e music.';
  } else if (dayOfWeek === 0) { // Sunday
    context = '☀️ Domenica = Reflection. Contenuto intimo/poetico.';
  } else if (dayOfWeek >= 3 && dayOfWeek <= 5) { // Wed-Fri
    context = '📈 Peak engagement days. Contenuto di valore.';
  }

  return {
    platform,
    content_type: contentType,
    audience: {
      primary_countries: topCountries,
      primary_age: primaryAge,
      corridor_insight: corridor?.insight || 'No corridor data',
    },
    recommended_pillar: recommendedPillar.name,
    theme_suggestion: themeSuggestion,
    tone: recommendedPillar.tone,
    hashtags: recommendedPillar.hashtags,
    best_time: bestTime,
    avoid,
    context,
  };
}

/**
 * Suggest a narrative arc based on audience and available content
 */
export async function suggestNarrativeArc(
  duration: 'week' | 'month' = 'week',
  theme?: string
): Promise<NarrativeArc> {
  const corridor = await getCorridorAnalysis();
  const db = await getDb();

  // Get available content from Greece
  const greeceContent = await db.query(`
    SELECT * FROM content
    WHERE location CONTAINS 'Greece' OR location CONTAINS 'Astypalea'
    ORDER BY taken_at DESC
    LIMIT 20
  `);

  // Build arc based on IT-GR corridor
  const arcTheme = theme || (corridor && corridor.corridorPct > 50
    ? 'Il Ponte: Storie dal corridoio IT↔GR'
    : 'Layer su Layer: Dal sunrise al codice');

  const audienceRationale = corridor
    ? `${corridor.italians} italiani (${Math.round((corridor.italians / (corridor.italians + corridor.greeks)) * 100)}%) + ${corridor.greeks} greci. ${corridor.insight}`
    : 'Analizza il pubblico per una strategia più mirata.';

  // Weekly beats
  const dailyBeats = [
    {
      day: 'Lunedì',
      platform: 'instagram',
      content_type: 'story',
      brief: 'Setup: Anticipa la settimana. Teaser emotivo.',
      pillar: 'nature_authentic',
    },
    {
      day: 'Martedì',
      platform: 'twitter',
      content_type: 'thread',
      brief: 'Tech: jsOM update o build-in-public moment.',
      pillar: 'tech',
    },
    {
      day: 'Mercoledì',
      platform: 'instagram',
      content_type: 'carousel',
      brief: 'Music production: Behind-the-scenes, process.',
      pillar: 'music_production',
    },
    {
      day: 'Giovedì',
      platform: 'instagram',
      content_type: 'reel',
      brief: 'Performance: Moment live, snippet RAV Vast.',
      pillar: 'live_performance',
    },
    {
      day: 'Venerdì',
      platform: 'twitter',
      content_type: 'tweet',
      brief: 'Tech + anticipation: Demo video o reflection.',
      pillar: 'tech',
    },
    {
      day: 'Sabato',
      platform: 'instagram',
      content_type: 'carousel',
      brief: '🌉 CROSSOVER: Tech meets Music. Il ponte.',
      pillar: 'music_production',
    },
    {
      day: 'Domenica',
      platform: 'instagram',
      content_type: 'story',
      brief: 'Reflection: Moment poetico, sunset, gratitude.',
      pillar: 'nature_authentic',
    },
  ];

  return {
    name: arcTheme,
    theme: arcTheme,
    duration_days: duration === 'week' ? 7 : 30,
    audience_rationale: audienceRationale,
    daily_beats: dailyBeats,
    crossover_moment: 'Sabato: mostra come il codice (jsOM) e la musica sono lo stesso linguaggio creativo.',
  };
}

/**
 * Get story prompt for today based on audience and calendar
 */
export async function getTodayStoryPrompt(): Promise<{
  platform: string;
  suggested_content: string;
  audience_context: string;
  tone_guidance: string;
  avoid: string[];
}> {
  const brief = await getContentBrief('instagram', 'story');
  const corridor = await getCorridorAnalysis();

  if (!brief) {
    return {
      platform: 'instagram',
      suggested_content: 'Racconta qualcosa di autentico dalla tua giornata.',
      audience_context: 'No audience data - archive insights first.',
      tone_guidance: 'Authentic, personal, no forced engagement.',
      avoid: ['Polls without context', 'Generic content'],
    };
  }

  // Generate specific prompt based on corridor
  let suggestedContent = '';
  if (corridor && corridor.corridorPct > 60) {
    suggestedContent = `
Il tuo pubblico è ${corridor.italians} italiani + ${corridor.greeks} greci.
Parla di ciò che connette queste due culture nella tua esperienza.
La Grecia ti ha insegnato qualcosa? L'Italia ti ha formato?
Racconta quel ponte. Non chiedere engagement - offrilo.
    `.trim();
  } else {
    suggestedContent = `
"Layer su layer" - dal personale all'universale.
Cosa stai creando oggi? Cosa ti ha ispirato?
Condividi il processo, non il prodotto.
    `.trim();
  }

  return {
    platform: 'instagram',
    suggested_content: suggestedContent,
    audience_context: brief.audience.corridor_insight,
    tone_guidance: brief.tone,
    avoid: brief.avoid,
  };
}

/**
 * Save a story arc to the database
 */
export async function saveNarrativeArc(arc: NarrativeArc): Promise<string | null> {
  const db = await getDb();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const result = await db.query(`
    CREATE story_arc SET
      name = $name,
      theme = $theme,
      week_start = $week_start,
      week_end = $week_end,
      pillars = $pillars,
      status = 'planned',
      crossover_concept = $crossover
  `, {
    name: arc.name,
    theme: arc.theme,
    week_start: weekStart.toISOString(),
    week_end: weekEnd.toISOString(),
    pillars: [...new Set(arc.daily_beats.map(b => b.pillar))],
    crossover: arc.crossover_moment,
  });

  const savedArc = (result[0] as any)?.[0];
  return savedArc?.id || null;
}

// Export for direct use
export const editorialIntelligence = {
  getContentBrief,
  suggestNarrativeArc,
  getTodayStoryPrompt,
  saveNarrativeArc,
  BRAND_PILLARS,
};
