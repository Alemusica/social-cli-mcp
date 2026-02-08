#!/usr/bin/env npx tsx
/**
 * Daily Brief Generator - Intelligent Content Orchestration
 *
 * ENHANCED: Now includes:
 * - Editorial Plan awareness (reads week4_schedule)
 * - Post History tracking (avoids consecutive same pillar)
 * - Auto-posting capability (--post flag)
 *
 * Usage:
 *   npx tsx src/agents/daily-brief.ts           # Generate brief
 *   npx tsx src/agents/daily-brief.ts --post    # Generate and post
 *   npx tsx src/agents/daily-brief.ts --week    # Week overview
 */

import { getDb } from '../db/client.js';
import { InstagramClient } from '../clients/instagram.js';
import { loadCredentialsToEnv, getFromKeychain } from '../core/credentials.js';
import { BRAND_PILLARS, type PillarKey } from '../core/pillar-helpers.js';
import { insightsArchiver } from '../core/insights-archiver.js';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface PerformanceSignal {
  bestFormat: string;
  bestEngagementRate: number;
  recentReach: number;
  trendDirection: 'up' | 'down' | 'stable';
}

interface AudienceSignal {
  totalFollowers: number;
  itCorridor: number;
  grCorridor: number;
  corridorPct: number;
  primaryAge: string;
  topCities: string[];
}

interface StrategySignal {
  pillarNeeded: PillarKey;
  pillarDeficit: number;
  weeklyTarget: Record<PillarKey, number>;
  weeklyActual: Record<PillarKey, number>;
}

interface PostHistorySignal {
  lastPostDate: string | null;
  lastPostPillar: PillarKey | null;
  consecutiveSamePillar: number;
  recentPillars: PillarKey[];
}

interface ScheduledPost {
  pillar: PillarKey;
  post: string;
  title?: string;
  folder?: string;
  post_id?: number;
  time: string;
  status: string;
}

interface ContentOption {
  id: string;
  title: string;
  pillar: PillarKey;
  format: string;
  folder?: string;
  caption?: string;
  hashtags?: string[];
  matchScore: number;
  reasons: string[];
  isScheduledToday: boolean;
  scheduledTime?: string;
}

interface DailyBrief {
  date: string;
  dayOfWeek: string;
  scheduledPost: ScheduledPost | null;
  recommendation: ContentOption | null;
  alternatives: ContentOption[];
  signals: {
    performance: PerformanceSignal;
    audience: AudienceSignal;
    strategy: StrategySignal;
    history: PostHistorySignal;
  };
  timing: {
    suggestedTime: string;
    reason: string;
  };
  warnings: string[];
  actions: string[];
}

// Day names
const DAYS_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Get Instagram client
 */
function getInstagramClient(): InstagramClient | null {
  loadCredentialsToEnv();
  const accessToken = getFromKeychain('INSTAGRAM_ACCESS_TOKEN');
  const businessAccountId = getFromKeychain('INSTAGRAM_BUSINESS_ACCOUNT_ID');

  if (!accessToken || !businessAccountId) {
    return null;
  }

  return new InstagramClient({
    accessToken,
    businessAccountId,
    facebookPageId: getFromKeychain('FACEBOOK_PAGE_ID') || '',
  });
}

/**
 * Get today's scheduled post from editorial plan
 */
function getTodayScheduledPost(): ScheduledPost | null {
  const basePath = '/Users/alessioivoycazzaniga/Projects/social-cli-mcp/content';
  const jsonPath = path.join(basePath, 'instagram-posts-ready.json');

  if (!fs.existsSync(jsonPath)) return null;

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const week4 = data.week4_schedule;

  if (!week4?.schedule) return null;

  const now = new Date();
  const day = now.getDate();
  const dayName = DAYS_EN[now.getDay()];

  // Find matching key (e.g., "thursday_23_14")
  for (const [key, value] of Object.entries(week4.schedule)) {
    const match = key.match(/^(\w+)_(\d+)_(\d+)$/);
    if (match) {
      const [, scheduledDay, scheduledDate, scheduledHour] = match;
      if (scheduledDay === dayName && parseInt(scheduledDate) === day) {
        const post = value as any;
        return {
          pillar: post.pillar as PillarKey,
          post: post.post || post.title,
          title: post.title,
          folder: post.folder,
          post_id: post.post_id,
          time: `${scheduledHour}:00`,
          status: post.status,
        };
      }
    }
  }

  return null;
}

/**
 * Get post history from Instagram API
 */
async function getPostHistorySignals(): Promise<PostHistorySignal> {
  const client = getInstagramClient();

  const defaultSignal: PostHistorySignal = {
    lastPostDate: null,
    lastPostPillar: null,
    consecutiveSamePillar: 0,
    recentPillars: [],
  };

  if (!client) return defaultSignal;

  try {
    const recentMedia = await client.getRecentMediaInsights(5);
    if (recentMedia.length === 0) return defaultSignal;

    // Analyze recent posts to determine pillar pattern
    const recentPillars: PillarKey[] = [];

    for (const post of recentMedia) {
      // Infer pillar from caption/hashtags
      const caption = (post as any).caption?.toLowerCase() || '';
      let pillar: PillarKey = 'nature_authentic';

      if (caption.includes('#buildinpublic') || caption.includes('jsom') || caption.includes('code')) {
        pillar = 'tech';
      } else if (caption.includes('#ableton') || caption.includes('production') || caption.includes('looping')) {
        pillar = 'music_production';
      } else if (caption.includes('#busker') || caption.includes('#ravvast') || caption.includes('performance')) {
        pillar = 'live_performance';
      }

      recentPillars.push(pillar);
    }

    // Calculate consecutive same pillar
    let consecutive = 1;
    if (recentPillars.length >= 2) {
      for (let i = 1; i < recentPillars.length; i++) {
        if (recentPillars[i] === recentPillars[0]) {
          consecutive++;
        } else {
          break;
        }
      }
    }

    return {
      lastPostDate: recentMedia[0]?.timestamp || null,
      lastPostPillar: recentPillars[0] || null,
      consecutiveSamePillar: consecutive,
      recentPillars,
    };
  } catch (e) {
    return defaultSignal;
  }
}

/**
 * Get performance signals from Instagram API
 */
async function getPerformanceSignals(): Promise<PerformanceSignal> {
  const client = getInstagramClient();
  if (!client) {
    return {
      bestFormat: 'CAROUSEL',
      bestEngagementRate: 0,
      recentReach: 0,
      trendDirection: 'stable',
    };
  }

  const recentMedia = await client.getRecentMediaInsights(10);

  const formatStats: Record<string, { totalEng: number; totalReach: number; count: number }> = {};

  for (const post of recentMedia) {
    const format = post.mediaType || 'IMAGE';
    if (!formatStats[format]) {
      formatStats[format] = { totalEng: 0, totalReach: 0, count: 0 };
    }

    const engagement = (post.likes || 0) + (post.comments || 0);
    formatStats[format].totalEng += engagement;
    formatStats[format].totalReach += post.reach || 0;
    formatStats[format].count++;
  }

  let bestFormat = 'CAROUSEL_ALBUM';
  let bestRate = 0;

  for (const [format, stats] of Object.entries(formatStats)) {
    if (stats.totalReach > 0) {
      const rate = (stats.totalEng / stats.totalReach) * 100;
      if (rate > bestRate) {
        bestRate = rate;
        bestFormat = format;
      }
    }
  }

  const firstHalf = recentMedia.slice(0, 5);
  const secondHalf = recentMedia.slice(5, 10);

  const firstReach = firstHalf.reduce((sum, p) => sum + (p.reach || 0), 0);
  const secondReach = secondHalf.reduce((sum, p) => sum + (p.reach || 0), 0);

  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (firstReach > secondReach * 1.2) trendDirection = 'up';
  else if (firstReach < secondReach * 0.8) trendDirection = 'down';

  return {
    bestFormat,
    bestEngagementRate: bestRate,
    recentReach: firstReach,
    trendDirection,
  };
}

/**
 * Get audience signals from SurrealDB snapshot
 */
async function getAudienceSignals(): Promise<AudienceSignal> {
  const snapshot = await insightsArchiver.getLatest();

  if (!snapshot) {
    return {
      totalFollowers: 0,
      itCorridor: 0,
      grCorridor: 0,
      corridorPct: 0,
      primaryAge: 'unknown',
      topCities: [],
    };
  }

  const it = snapshot.top_countries.find(c => c.country === 'IT')?.count || 0;
  const gr = snapshot.top_countries.find(c => c.country === 'GR')?.count || 0;

  const primaryAge = snapshot.age_gender.length > 0
    ? snapshot.age_gender.sort((a, b) => (b.male + b.female) - (a.male + a.female))[0].ageRange
    : 'unknown';

  return {
    totalFollowers: snapshot.followers,
    itCorridor: it,
    grCorridor: gr,
    corridorPct: snapshot.followers > 0 ? ((it + gr) / snapshot.followers) * 100 : 0,
    primaryAge,
    topCities: snapshot.top_cities.slice(0, 3).map(c => c.city),
  };
}

/**
 * Get strategy signals - pillar balance
 */
async function getStrategySignals(): Promise<StrategySignal> {
  const db = await getDb();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const result = await db.query(`
    SELECT pillar, count() as count
    FROM platform_content
    WHERE scheduled_time >= $weekStart
      AND scheduled_time < $weekEnd
      AND status != 'cancelled'
    GROUP BY pillar
  `, { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() });

  const counts: Record<string, number> = {};
  for (const row of (result[0] as any[]) || []) {
    counts[row.pillar] = row.count;
  }

  const targets: Record<PillarKey, number> = {
    tech: 2,
    music_production: 2,
    live_performance: 3,
    nature_authentic: 2,
  };

  const actual: Record<PillarKey, number> = {
    tech: counts['tech'] || 0,
    music_production: counts['music_production'] || 0,
    live_performance: counts['live_performance'] || 0,
    nature_authentic: counts['nature_authentic'] || 0,
  };

  let maxDeficit = 0;
  let needsPillar: PillarKey = 'live_performance';

  for (const [pillar, target] of Object.entries(targets)) {
    const deficit = target - (actual[pillar as PillarKey] || 0);
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      needsPillar = pillar as PillarKey;
    }
  }

  return {
    pillarNeeded: needsPillar,
    pillarDeficit: maxDeficit,
    weeklyTarget: targets,
    weeklyActual: actual,
  };
}

/**
 * Get ready content with full details
 */
async function getReadyContent(scheduledPost: ScheduledPost | null): Promise<ContentOption[]> {
  const options: ContentOption[] = [];
  const basePath = '/Users/alessioivoycazzaniga/Projects/social-cli-mcp/content';

  // Check ready-to-post folders
  const readyPath = path.join(basePath, 'ready-to-post');
  if (fs.existsSync(readyPath)) {
    const folders = fs.readdirSync(readyPath).filter(f =>
      fs.statSync(path.join(readyPath, f)).isDirectory()
    );

    for (const folder of folders) {
      const briefPath = path.join(readyPath, folder, 'BRIEF.md');
      if (fs.existsSync(briefPath)) {
        const brief = fs.readFileSync(briefPath, 'utf-8');

        const pillarMatch = brief.match(/pillar[:\s]+[`"]?(\w+)/i);
        const pillar = pillarMatch ? pillarMatch[1] as PillarKey : 'nature_authentic';

        const formatMatch = brief.match(/format[:\s]+(\w+)/i) || brief.match(/tipo[:\s]+(\w+)/i);
        const format = formatMatch ? formatMatch[1].toUpperCase() : 'REEL';

        // Extract caption options
        const captionMatch = brief.match(/Option A[^:]*:\s*\n([\s\S]*?)(?=\n(?:Option B|###|---|$))/i);
        const caption = captionMatch ? captionMatch[1].trim() : undefined;

        // Check if this is today's scheduled post
        const isScheduled = scheduledPost?.folder?.includes(folder) ||
                           scheduledPost?.post?.toLowerCase().includes(folder.replace(/-/g, ' '));

        options.push({
          id: folder,
          title: folder.replace(/^post-\d+-/, '').replace(/-/g, ' '),
          pillar,
          format,
          folder: path.join(readyPath, folder),
          caption,
          matchScore: 0,
          reasons: [],
          isScheduledToday: isScheduled,
          scheduledTime: isScheduled ? scheduledPost?.time : undefined,
        });
      }
    }
  }

  // Check instagram-posts-ready.json
  const jsonPath = path.join(basePath, 'instagram-posts-ready.json');
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    for (const post of data.posts || []) {
      const isScheduled = scheduledPost?.post_id === post.id;

      options.push({
        id: `json-${post.id}`,
        title: post.title,
        pillar: post.pillar as PillarKey,
        format: post.type.toUpperCase(),
        caption: post.caption,
        hashtags: post.hashtags,
        matchScore: 0,
        reasons: [],
        isScheduledToday: isScheduled,
        scheduledTime: isScheduled ? scheduledPost?.time : undefined,
      });
    }
  }

  return options;
}

/**
 * Score content options based on ALL signals including history
 */
function scoreContent(
  options: ContentOption[],
  performance: PerformanceSignal,
  audience: AudienceSignal,
  strategy: StrategySignal,
  history: PostHistorySignal,
  dayOfWeek: number
): ContentOption[] {
  return options.map(option => {
    let score = 50;
    const reasons: string[] = [];

    // HIGHEST PRIORITY: Scheduled in editorial plan
    if (option.isScheduledToday) {
      score += 100;
      reasons.push(`📅 SCHEDULATO OGGI alle ${option.scheduledTime}`);
    }

    // Pillar match
    if (option.pillar === strategy.pillarNeeded) {
      score += 30;
      reasons.push(`✅ Pillar "${option.pillar}" ha deficit -${strategy.pillarDeficit}`);
    }

    // PENALTY: Same pillar as last post (consecutive rule)
    if (history.lastPostPillar === option.pillar) {
      if (history.consecutiveSamePillar >= 2) {
        score -= 50;
        reasons.push(`❌ VIOLAZIONE: "${option.pillar}" postato ${history.consecutiveSamePillar} giorni consecutivi`);
      } else {
        score -= 10;
        reasons.push(`⚠️ Stesso pillar di ieri (${history.lastPostPillar})`);
      }
    }

    // Format performance
    if (option.format === performance.bestFormat) {
      score += 20;
      reasons.push(`📈 Format ${option.format} performa ${performance.bestEngagementRate.toFixed(1)}% eng`);
    }

    // Audience relevance
    const isGreekContent = option.title.toLowerCase().includes('greek') ||
                          option.title.toLowerCase().includes('greece');
    if (isGreekContent && audience.grCorridor > 100) {
      score += 15;
      reasons.push(`🇬🇷 Content GR per ${audience.grCorridor} follower greci`);
    }

    // Day optimization
    if (dayOfWeek === 6 && option.format === 'CAROUSEL') {
      score += 10;
      reasons.push('📅 Sabato = peak engagement per carousel');
    }
    if (dayOfWeek === 0 && option.pillar === 'nature_authentic') {
      score += 10;
      reasons.push('📅 Domenica = mood riflessivo');
    }

    return {
      ...option,
      matchScore: score,
      reasons,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get optimal posting time
 */
function getOptimalTime(dayOfWeek: number, pillar: PillarKey, scheduledTime?: string): { time: string; reason: string } {
  // If scheduled, use that time
  if (scheduledTime) {
    return { time: scheduledTime, reason: 'Da piano editoriale' };
  }

  const timings: Record<string, { time: string; reason: string }> = {
    'tech_weekday': { time: '10:00', reason: 'Tech audience attivo mattina' },
    'live_performance_weekday': { time: '19:00', reason: 'Audience rilassato post-lavoro' },
    'live_performance_saturday': { time: '11:00', reason: 'Sabato mattina = scrolling time' },
    'nature_authentic_sunday': { time: '19:00', reason: 'Domenica sera = mood poetico' },
    'nature_authentic_weekday': { time: '18:00', reason: 'Golden hour = engagement naturale' },
    'music_production_weekday': { time: '14:00', reason: 'Post-pranzo = curiosità tech' },
  };

  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  let key = `${pillar}_weekday`;
  if (isSaturday) key = `${pillar}_saturday`;
  if (isSunday) key = `${pillar}_sunday`;

  return timings[key] || timings[`${pillar}_weekday`] || { time: '19:00', reason: 'Default sera' };
}

/**
 * Generate daily brief
 */
async function generateDailyBrief(): Promise<DailyBrief> {
  const now = new Date();
  const dayOfWeek = now.getDay();

  console.log('🧠 Generando Daily Brief...\n');

  // 1. Check editorial plan first
  console.log('📅 Verificando piano editoriale...');
  const scheduledPost = getTodayScheduledPost();
  if (scheduledPost) {
    console.log(`   → Trovato: "${scheduledPost.post}" alle ${scheduledPost.time}`);
  } else {
    console.log('   → Nessun post schedulato oggi');
  }

  // 2. Gather signals
  console.log('📊 Raccogliendo segnali performance...');
  const performance = await getPerformanceSignals();

  console.log('👥 Analizzando audience...');
  const audience = await getAudienceSignals();

  console.log('🎯 Verificando strategia pillar...');
  const strategy = await getStrategySignals();

  console.log('📜 Analizzando history post...');
  const history = await getPostHistorySignals();
  if (history.lastPostPillar) {
    console.log(`   → Ultimo post: ${history.lastPostPillar} (${history.consecutiveSamePillar} consecutivi)`);
  }

  console.log('📁 Caricando contenuti pronti...');
  const contentOptions = await getReadyContent(scheduledPost);

  // 3. Score and rank
  const scoredContent = scoreContent(contentOptions, performance, audience, strategy, history, dayOfWeek);

  const recommendation = scoredContent[0] || null;
  const alternatives = scoredContent.slice(1, 4);

  // 4. Timing
  const timing = recommendation
    ? getOptimalTime(dayOfWeek, recommendation.pillar, recommendation.scheduledTime)
    : { time: '19:00', reason: 'Default' };

  // 5. Warnings
  const warnings: string[] = [];

  if (performance.trendDirection === 'down') {
    warnings.push('⚠️ Reach in calo - considera contenuto più engaging');
  }

  if (strategy.pillarDeficit > 2) {
    warnings.push(`⚠️ Pillar "${strategy.pillarNeeded}" molto indietro (-${strategy.pillarDeficit})`);
  }

  if (history.consecutiveSamePillar >= 2 && recommendation?.pillar === history.lastPostPillar) {
    warnings.push(`🚫 REGOLA VIOLATA: Max 2 giorni consecutivi stesso pillar`);
  }

  if (!scheduledPost) {
    warnings.push('📅 Nessun post nel piano editoriale per oggi');
  }

  // 6. Actions
  const actions: string[] = [];

  if (recommendation?.folder) {
    actions.push(`📂 Apri: ${recommendation.folder}`);
  }

  actions.push(`⏰ Programma per: ${timing.time}`);

  if (recommendation?.format === 'REEL') {
    actions.push('🎬 Verifica hook nei primi 3 secondi');
  }

  if (recommendation?.caption) {
    actions.push('✏️ Caption pronta (vedi sotto)');
  }

  return {
    date: now.toISOString().split('T')[0],
    dayOfWeek: DAYS_IT[dayOfWeek],
    scheduledPost,
    recommendation,
    alternatives,
    signals: { performance, audience, strategy, history },
    timing,
    warnings,
    actions,
  };
}

/**
 * Format brief for console output
 */
function formatBrief(brief: DailyBrief): string {
  const lines: string[] = [];

  lines.push('═'.repeat(70));
  lines.push(`📋 DAILY BRIEF - ${brief.dayOfWeek} ${brief.date}`);
  lines.push('═'.repeat(70));

  // Editorial plan status
  if (brief.scheduledPost) {
    lines.push('\n📅 PIANO EDITORIALE:');
    lines.push(`   Post: "${brief.scheduledPost.post}"`);
    lines.push(`   Pillar: ${brief.scheduledPost.pillar} | Orario: ${brief.scheduledPost.time}`);
    if (brief.scheduledPost.folder) {
      lines.push(`   Folder: ${brief.scheduledPost.folder}`);
    }
  }

  // Signals summary
  lines.push('\n📊 SEGNALI:');
  lines.push(`   Performance: ${brief.signals.performance.bestFormat} = ${brief.signals.performance.bestEngagementRate.toFixed(1)}% eng (trend: ${brief.signals.performance.trendDirection})`);
  lines.push(`   Audience: ${brief.signals.audience.totalFollowers} followers | IT↔GR: ${brief.signals.audience.corridorPct.toFixed(0)}%`);
  lines.push(`   Strategy: "${brief.signals.strategy.pillarNeeded}" ha bisogno di content (-${brief.signals.strategy.pillarDeficit})`);
  if (brief.signals.history.lastPostPillar) {
    lines.push(`   History: Ultimo = ${brief.signals.history.lastPostPillar} (${brief.signals.history.consecutiveSamePillar} consecutivi)`);
  }

  // Recommendation
  if (brief.recommendation) {
    lines.push('\n🎯 RACCOMANDAZIONE:');
    lines.push(`   "${brief.recommendation.title}"`);
    lines.push(`   Pillar: ${brief.recommendation.pillar} | Format: ${brief.recommendation.format}`);
    lines.push(`   Match Score: ${brief.recommendation.matchScore}/100`);
    lines.push(`   Motivi:`);
    for (const reason of brief.recommendation.reasons) {
      lines.push(`     • ${reason}`);
    }
    if (brief.recommendation.folder) {
      lines.push(`   Folder: ${brief.recommendation.folder}`);
    }
  }

  // Caption preview
  if (brief.recommendation?.caption) {
    lines.push('\n✏️ CAPTION:');
    const captionLines = brief.recommendation.caption.split('\n').slice(0, 5);
    for (const line of captionLines) {
      lines.push(`   ${line}`);
    }
    if (brief.recommendation.caption.split('\n').length > 5) {
      lines.push('   ...(troncata)');
    }
  }

  // Hashtags
  if (brief.recommendation?.hashtags) {
    lines.push('\n#️⃣ HASHTAGS:');
    lines.push(`   ${brief.recommendation.hashtags.join(' ')}`);
  }

  // Timing
  lines.push('\n⏰ TIMING:');
  lines.push(`   Orario: ${brief.timing.time}`);
  lines.push(`   Motivo: ${brief.timing.reason}`);

  // Alternatives
  if (brief.alternatives.length > 0) {
    lines.push('\n🔄 ALTERNATIVE:');
    for (const alt of brief.alternatives) {
      const scheduled = alt.isScheduledToday ? ' [SCHEDULED]' : '';
      lines.push(`   • "${alt.title}" (${alt.pillar}, ${alt.format}) - Score: ${alt.matchScore}${scheduled}`);
    }
  }

  // Warnings
  if (brief.warnings.length > 0) {
    lines.push('\n⚠️ ATTENZIONE:');
    for (const warning of brief.warnings) {
      lines.push(`   ${warning}`);
    }
  }

  // Actions
  if (brief.actions.length > 0) {
    lines.push('\n✅ AZIONI:');
    for (const action of brief.actions) {
      lines.push(`   ${action}`);
    }
  }

  lines.push('\n' + '═'.repeat(70));
  lines.push('💡 Per postare: npx tsx src/agents/daily-brief.ts --post');
  lines.push('═'.repeat(70));

  return lines.join('\n');
}

/**
 * Post content to Instagram
 */
async function postToInstagram(brief: DailyBrief): Promise<boolean> {
  if (!brief.recommendation) {
    console.log('❌ Nessun contenuto da postare');
    return false;
  }

  const client = getInstagramClient();
  if (!client) {
    console.log('❌ Instagram client non configurato');
    return false;
  }

  console.log('\n🚀 Preparando post per Instagram...');
  console.log(`   Contenuto: "${brief.recommendation.title}"`);
  console.log(`   Pillar: ${brief.recommendation.pillar}`);
  console.log(`   Format: ${brief.recommendation.format}`);

  // Check if folder has media
  if (brief.recommendation.folder) {
    const files = fs.readdirSync(brief.recommendation.folder);
    const mediaFiles = files.filter(f =>
      /\.(jpg|jpeg|png|mp4|mov|heic)$/i.test(f)
    );

    if (mediaFiles.length === 0) {
      console.log('❌ Nessun file media trovato nella folder');
      console.log(`   Folder: ${brief.recommendation.folder}`);
      console.log('   Prepara i media e riprova.');
      return false;
    }

    console.log(`   Media trovati: ${mediaFiles.length} file`);
  }

  // For now, just prepare the post details
  console.log('\n📝 POST PRONTO:');
  console.log('─'.repeat(50));

  if (brief.recommendation.caption) {
    console.log('\nCaption:');
    console.log(brief.recommendation.caption);
  }

  if (brief.recommendation.hashtags) {
    console.log('\nHashtags:');
    console.log(brief.recommendation.hashtags.join(' '));
  }

  console.log('─'.repeat(50));
  console.log('\n⚠️ Auto-posting non ancora implementato.');
  console.log('   Copia caption e hashtags sopra per postare manualmente.');

  // Save to posted index
  const indexPath = '/Users/alessioivoycazzaniga/Projects/social-cli-mcp/analytics/posted-instagram-index.json';
  let index: any = { posts: [] };

  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }

  index.posts.push({
    id: brief.recommendation.id,
    title: brief.recommendation.title,
    pillar: brief.recommendation.pillar,
    format: brief.recommendation.format,
    scheduled_time: brief.timing.time,
    date: brief.date,
    status: 'prepared',
  });

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log('\n💾 Salvato in analytics/posted-instagram-index.json');

  return true;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const shouldPost = args.includes('--post');

  const brief = await generateDailyBrief();
  console.log('\n' + formatBrief(brief));

  // Save to SurrealDB
  try {
    const db = await getDb();
    await db.query(`
      CREATE daily_brief SET
        date = $date,
        day_of_week = $dayOfWeek,
        scheduled_post = $scheduledPost,
        recommendation = $recommendation,
        signals = $signals,
        timing = $timing,
        warnings = $warnings,
        actions = $actions,
        created_at = time::now()
    `, {
      date: brief.date,
      dayOfWeek: brief.dayOfWeek,
      scheduledPost: brief.scheduledPost,
      recommendation: brief.recommendation,
      signals: brief.signals,
      timing: brief.timing,
      warnings: brief.warnings,
      actions: brief.actions,
    });
    console.log('\n💾 Brief salvato in SurrealDB');
  } catch (e) {
    // Silent fail
  }

  // Post if requested
  if (shouldPost) {
    await postToInstagram(brief);
  }
}

main().catch(console.error);

export { generateDailyBrief, formatBrief, postToInstagram, type DailyBrief };
