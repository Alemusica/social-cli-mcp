/**
 * Video Intelligence — Content Analysis Department
 *
 * Combines:
 *   - Outreach reply rates (learning.ts)
 *   - YouTube geographic analytics (yt_video_country)
 *   - Video metadata (videos-database.ts)
 *   - Venue/market context (agent memory)
 *
 * Provides:
 *   1. Multi-dimensional video scoring for targets
 *   2. Video production roadmap (what to make next)
 *   3. Market-specific video strategy
 */

import { ALL_VIDEOS, type VideoData } from '../db/videos-database.js';
import { getDb } from '../db/client.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface VideoScore {
  video: VideoData;
  score: number;         // 0-10
  reasons: string[];
  outreachRate?: number; // Reply rate from cold emails
  ytViews?: number;      // YouTube views in this market
  ytAvgDuration?: number; // Average watch time
}

export interface VideoRecommendation {
  primary: VideoScore;
  alternatives: VideoScore[];
  strategy: string;      // One-line recommendation
}

export interface ProductionGap {
  id: string;
  title: string;
  market: string;        // Which market needs this
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  estimatedImpact: string;
}

export interface MarketVideoStrategy {
  market: string;
  currentBest: VideoScore | null;
  gaps: ProductionGap[];
  seasonalNotes: string;
}

// ═══════════════════════════════════════════════════════════════
// OUTREACH PERFORMANCE DATA (from tracking.json)
// ═══════════════════════════════════════════════════════════════

// Hardcoded from verified data as of Feb 7, 2026
// These update when learning.ts runs — for now, baked in.
const OUTREACH_PERFORMANCE: Record<string, { sent: number; replied: number }> = {
  efthymia:                 { sent: 10, replied: 1 },
  fatherOcean:              { sent: 72, replied: 0 },  // old batch overused
  fatherOceanHighlight:     { sent: 9,  replied: 0 },  // new batch, too few
  chaseTheSun:              { sent: 5,  replied: 0 },
  transcendence:            { sent: 3,  replied: 0 },
  ggt:                      { sent: 2,  replied: 0 },
  whoIsFlutur:              { sent: 1,  replied: 0 },
};

// ═══════════════════════════════════════════════════════════════
// YOUTUBE PERFORMANCE (from persist-youtube-analytics.ts)
// ═══════════════════════════════════════════════════════════════

interface YTVideoCountry {
  video_title: string;
  country: string;
  views: number;
  avg_duration_sec: number;
  month: string;
}

async function getYTPerformance(): Promise<YTVideoCountry[]> {
  try {
    const db = await getDb();
    const [results] = await db.query('SELECT * FROM yt_video_country');
    return (results as YTVideoCountry[]) || [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Score a video for a specific target context.
 */
function scoreVideo(
  video: VideoData,
  context: {
    venueType: string;
    country: string;
    tier?: number;        // 1=premium, 2=mid, 3=grassroots
    season?: string;      // 'winter' | 'spring' | 'summer' | 'autumn'
    bookingStage?: string; // 'cold' | 'warm' | 'decision'
  },
  ytData: YTVideoCountry[],
): VideoScore {
  let score = 5; // baseline
  const reasons: string[] = [];

  const vt = context.venueType.toLowerCase();
  const ct = context.country.toLowerCase();

  // 1. Venue type match (from bestFor metadata)
  const venueMatch = video.bestFor.some(b => vt.includes(b) || b.includes(vt));
  if (venueMatch) {
    score += 2;
    reasons.push(`Venue type match: ${vt}`);
  }

  // 2. Outreach reply rate
  const outreach = OUTREACH_PERFORMANCE[video.id] || OUTREACH_PERFORMANCE[toCamelCase(video.id)];
  let outreachRate: number | undefined;
  if (outreach && outreach.sent >= 3) {
    outreachRate = (outreach.replied / outreach.sent) * 100;
    if (outreachRate >= 10) {
      score += 2;
      reasons.push(`${outreachRate.toFixed(0)}% outreach reply rate (proven)`);
    } else if (outreachRate === 0 && outreach.sent >= 5) {
      score -= 2;
      reasons.push(`0% on ${outreach.sent} sends — underperforming`);
    }
  }

  // 3. YouTube performance in this country
  const countryCode = countryToCode(ct);
  const ytVideoMap: Record<string, string[]> = {
    'efthymia': ['Efthymia'],
    'rocca-father-ocean-rav': ['Father Ocean FULL'],
    'rocca-transcendence-rav': [],
    'rocca-chase-the-sun': [],
    'rocca-intro-monkey-safari': [],
    'who-is-flutur': [],
    'greeces-got-talent': [],
    'rocca-full-set': [],
  };
  const matchTitles = ytVideoMap[video.id] || [];
  const ytMatch = ytData.filter(yt =>
    yt.country === countryCode &&
    matchTitles.some(t => yt.video_title === t)
  );
  let ytViews: number | undefined;
  let ytAvgDuration: number | undefined;
  if (ytMatch.length > 0) {
    ytViews = ytMatch.reduce((sum, m) => sum + m.views, 0);
    ytAvgDuration = ytMatch.reduce((sum, m) => sum + m.avg_duration_sec, 0) / ytMatch.length;
    if (ytViews > 100) {
      score += 1;
      reasons.push(`${ytViews} YT views in ${ct}`);
    }
    if (ytAvgDuration > 120) {
      score += 1;
      reasons.push(`${ytAvgDuration.toFixed(0)}s avg watch time (deep engagement)`);
    } else if (ytAvgDuration < 30) {
      score -= 0.5;
      reasons.push(`${ytAvgDuration.toFixed(0)}s avg watch (Shorts-level)`);
    }
  }

  // 4. Country-specific cultural context
  if (ct.includes('ital') && video.id === 'rocca-chase-the-sun') {
    score += 1.5;
    reasons.push('Planet Funk nostalgia factor for Italian audience');
  }
  if (ct.includes('ital') && video.id === 'rocca-father-ocean-rav') {
    score += 1; // Father Ocean = Italy's top YT video
    reasons.push('Top YT video in Italy (530 views, 123s avg)');
  }
  if ((ct.includes('japan') || ct.includes('jp')) && video.id === 'efthymia') {
    score += 2;
    reasons.push('Only video watched in Japan, 260s avg (71% retention)');
  }

  // 5. Tier adjustment
  if (context.tier === 1 && video.id === 'who-is-flutur') {
    score += 1;
    reasons.push('EPK-style video appropriate for premium tier');
  }
  if (context.tier === 3 && video.duration && parseInt(video.duration) > 180) {
    score -= 1;
    reasons.push('Long video less effective for grassroots tier');
  }

  // 6. Booking stage
  if (context.bookingStage === 'cold' && video.id.includes('full-set')) {
    score -= 1.5;
    reasons.push('Full set too long for cold outreach');
  }
  if (context.bookingStage === 'warm') {
    score += 0.5; // any video works better warm
  }

  // 7. Season
  if (context.season === 'winter' && (vt.includes('wellness') || vt.includes('retreat'))) {
    if (video.id === 'efthymia' || video.id === 'rocca-transcendence-rav') {
      score += 1;
      reasons.push('Wellness videos peak in winter booking season');
    }
  }
  if (context.season === 'summer' && (vt.includes('beach') || vt.includes('sunset'))) {
    if (video.id.includes('father-ocean') || video.id.includes('chase-the-sun')) {
      score += 0.5;
      reasons.push('Beach videos for summer season');
    }
  }

  return {
    video,
    score: Math.max(0, Math.min(10, score)),
    reasons,
    outreachRate,
    ytViews,
    ytAvgDuration,
  };
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Get ranked video recommendation for a target.
 */
export async function recommendVideo(context: {
  venueType: string;
  country: string;
  tier?: number;
  season?: string;
  bookingStage?: string;
}): Promise<VideoRecommendation> {
  const ytData = await getYTPerformance();

  const scores = ALL_VIDEOS
    .filter(v => v.id !== 'rocca-full-set') // artist doesn't like it
    .map(v => scoreVideo(v, context, ytData))
    .sort((a, b) => b.score - a.score);

  const primary = scores[0];
  const alternatives = scores.slice(1, 4);

  const strategy = `Use ${primary.video.title} (score: ${primary.score.toFixed(1)}/10). ` +
    `${primary.reasons.slice(0, 2).join('. ')}.`;

  return { primary, alternatives, strategy };
}

/**
 * Get video strategy for an entire market.
 */
export async function getMarketStrategy(market: string): Promise<MarketVideoStrategy> {
  const ytData = await getYTPerformance();
  const gaps = getProductionGaps(market);

  // Score all videos for this market's typical venue types
  const typicalVenue = MARKET_VENUE_MAP[market.toLowerCase()] || 'beach_club';
  const scores = ALL_VIDEOS
    .filter(v => v.id !== 'rocca-full-set')
    .map(v => scoreVideo(v, {
      venueType: typicalVenue,
      country: market,
      bookingStage: 'cold',
    }, ytData))
    .sort((a, b) => b.score - a.score);

  return {
    market,
    currentBest: scores[0] || null,
    gaps,
    seasonalNotes: getSeasonalNote(market),
  };
}

/**
 * Get all production gaps — videos that should be made.
 */
export function getProductionGaps(market?: string): ProductionGap[] {
  const all: ProductionGap[] = [
    {
      id: 'ableton-api-demo',
      title: 'Ableton API / ClyphX Scripting Live Demo',
      market: 'japan',
      priority: 'high',
      rationale: 'Zero Ableton Certified Training Centers in Japan. MUTEK.JP x Ableton 2025 = proven demand. Only market where tech+music convergence is valued.',
      estimatedImpact: 'Opens workshop revenue stream (¥5,000-8,000/person × 10-15)',
    },
    {
      id: 'minimal-setup-loop',
      title: 'Minimal Setup: RAV + Guitar + Loop Station (60-90s)',
      market: 'global',
      priority: 'high',
      rationale: 'No short "proof of concept" video exists. Beach clubs want to see 60s of product, not 6 minutes.',
      estimatedImpact: 'Replaces Father Ocean overuse. Better for cold outreach (short attention).',
    },
    {
      id: 'sound-healing-session',
      title: 'Sound Healing / RAV Vast Ceremony (3-5 min)',
      market: 'gulf',
      priority: 'medium',
      rationale: 'Banana Island Anantara + Zulal already do sound healing. Current Efthymia is studio recording, not ceremony-style.',
      estimatedImpact: 'Direct proof for wellness/hotel residency market (AED 8K-15K/month).',
    },
    {
      id: 'tech-bts-workflow',
      title: 'Build-in-Public: Live Setup Walkthrough (2 min)',
      market: 'global',
      priority: 'medium',
      rationale: 'Self-contained setup is KEY selling point but no video shows the tech. EPK text says it but doesn\'t prove it.',
      estimatedImpact: 'Trust builder for venues worried about technical requirements.',
    },
    {
      id: 'italian-sunset-session',
      title: 'Italian Sunset Session (Lake Maggiore or similar)',
      market: 'italy',
      priority: 'low',
      rationale: 'Father Ocean works for Italy (530 YT views) but was filmed at Rocca. An Italy-specific setting would strengthen local credential.',
      estimatedImpact: 'Incremental — Father Ocean already works.',
    },
  ];

  if (market) {
    return all.filter(g => g.market === market.toLowerCase() || g.market === 'global');
  }
  return all;
}

/**
 * Summary report — for agents and human review.
 */
export async function getVideoIntelligenceReport(): Promise<string> {
  const ytData = await getYTPerformance();
  const lines: string[] = ['# Video Intelligence Report', `Date: ${new Date().toISOString().slice(0, 10)}`, ''];

  // Per-video performance
  lines.push('## Video Performance');
  for (const video of ALL_VIDEOS.filter(v => v.id !== 'rocca-full-set')) {
    const op = OUTREACH_PERFORMANCE[video.id] || OUTREACH_PERFORMANCE[toCamelCase(video.id)];
    const opStr = op ? `Outreach: ${op.replied}/${op.sent} (${((op.replied / op.sent) * 100).toFixed(0)}%)` : 'No outreach data';
    const yt = ytData.filter(y => video.title.toLowerCase().includes(y.video_title.toLowerCase().split(' ')[0]));
    const ytStr = yt.length > 0
      ? yt.map(y => `${y.country}: ${y.views} views, ${y.avg_duration_sec}s avg`).join(' | ')
      : 'No YT geo data';
    lines.push(`- **${video.title}** [${video.id}]`);
    lines.push(`  ${opStr} | YT: ${ytStr}`);
  }

  // Market strategies
  lines.push('', '## Market Strategies');
  for (const market of ['Italy', 'Japan', 'Qatar', 'UAE', 'Portugal', 'Indonesia']) {
    const strategy = await getMarketStrategy(market);
    lines.push(`### ${market}`);
    if (strategy.currentBest) {
      lines.push(`  Best: ${strategy.currentBest.video.title} (${strategy.currentBest.score.toFixed(1)}/10)`);
    }
    if (strategy.gaps.length > 0) {
      lines.push(`  Gaps: ${strategy.gaps.map(g => g.title).join(', ')}`);
    }
    lines.push(`  Season: ${strategy.seasonalNotes}`);
  }

  // Production roadmap
  lines.push('', '## Production Roadmap');
  const gaps = getProductionGaps();
  for (const gap of gaps) {
    lines.push(`- [${gap.priority.toUpperCase()}] **${gap.title}** — ${gap.market}`);
    lines.push(`  ${gap.rationale}`);
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const MARKET_VENUE_MAP: Record<string, string> = {
  japan: 'tech_venue',
  qatar: 'spa_hotel',
  uae: 'beach_club',
  saudi: 'wellness_retreat',
  italy: 'beach_club',
  portugal: 'beach_club',
  indonesia: 'wellness_retreat',
  greece: 'beach_club',
};

function getSeasonalNote(market: string): string {
  const m = market.toLowerCase();
  if (m === 'japan') return 'Late Oct–mid Nov optimal. Avoid Golden Week (late Apr–early May).';
  if (m.includes('qatar') || m.includes('uae') || m.includes('saudi') || m.includes('gulf'))
    return 'Oct–Apr season. Ramadan (Feb 19 – Mar 20, 2026) = suhoor opportunity.';
  if (m === 'italy') return 'May–Sept peak. Book by March for summer season.';
  if (m === 'portugal') return 'Jun–Sept peak. Comporta cluster = summer only.';
  if (m === 'indonesia') return 'Apr–Oct dry season. Year-round for Bali wellness.';
  if (m === 'greece') return 'Jun–Sept. Island venues open May–Oct only.';
  return 'Research seasonal patterns for this market.';
}

function countryToCode(country: string): string {
  const map: Record<string, string> = {
    italy: 'IT', italia: 'IT', japan: 'JP', qatar: 'QA',
    uae: 'AE', 'united arab emirates': 'AE', saudi: 'SA',
    'saudi arabia': 'SA', portugal: 'PT', indonesia: 'ID',
    greece: 'GR', germany: 'DE', usa: 'US', uk: 'GB',
  };
  return map[country.toLowerCase()] || country.toUpperCase().slice(0, 2);
}

function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
