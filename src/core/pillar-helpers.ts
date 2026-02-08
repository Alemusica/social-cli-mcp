/**
 * Pillar Helpers - Centralized pillar logic
 *
 * All pillar-related functions in one place to maintain consistency.
 */

import { getDb } from '../db/client.js';

export const BRAND_PILLARS = {
  tech: {
    name: 'Tech Innovation',
    description: 'jsOM, AI tools, build-in-public, GitHub, developer content',
    hashtags: ['buildinpublic', 'AI', 'jsOM', 'opensource', 'coding'],
    keywords: ['code', 'tech', 'programming', 'developer', 'jsOM', 'AI', 'build'],
    frequency: '2x/week',
    platforms: ['Twitter', 'LinkedIn', 'YouTube'],
  },
  music_production: {
    name: 'Music Production (BRIDGE)',
    description: 'Ableton, ClyphX scripting, live looping workflow',
    hashtags: ['ableton', 'musicproduction', 'livelooping', 'musictech'],
    keywords: ['ableton', 'production', 'studio', 'workflow', 'looping', 'daw'],
    frequency: '2x/week',
    platforms: ['Twitter', 'Instagram', 'TikTok'],
  },
  live_performance: {
    name: 'Live Performance',
    description: 'RAV Vast, busking, sunset sessions, stage shows',
    hashtags: ['busker', 'ravvast', 'handpan', 'livemusic'],
    keywords: ['performance', 'busking', 'rav', 'handpan', 'stage', 'concert', 'live'],
    frequency: '3x/week',
    platforms: ['Instagram', 'TikTok', 'YouTube'],
  },
  nature_authentic: {
    name: 'Nature & Authentic',
    description: 'Field recording, BTS, reflections, travel, family stories',
    hashtags: ['fieldrecording', 'musicianlife', 'behindthescenes', 'travel'],
    keywords: ['nature', 'sunset', 'travel', 'authentic', 'field', 'family', 'story'],
    frequency: '2x/week',
    platforms: ['Instagram', 'Twitter'],
  },
} as const;

export type PillarKey = keyof typeof BRAND_PILLARS;

/**
 * Get hashtags for a specific pillar (max 5 for Instagram 2026)
 */
export function getPillarHashtags(pillar: string): string[] {
  if (pillar in BRAND_PILLARS) {
    return BRAND_PILLARS[pillar as PillarKey].hashtags.slice(0, 3);
  }
  return [];
}

/**
 * Determine pillar from content tags/keywords
 */
export function determinePillarFromContent(tags: string[], category?: string): PillarKey {
  const allText = [...tags, category || ''].join(' ').toLowerCase();

  // Check each pillar's keywords
  for (const [key, pillar] of Object.entries(BRAND_PILLARS)) {
    if (pillar.keywords.some(kw => allText.includes(kw))) {
      return key as PillarKey;
    }
  }

  // Default based on category
  if (category === 'busking' || category === 'sunset') return 'live_performance';
  if (category === 'behind_scenes') return 'nature_authentic';

  return 'nature_authentic'; // safe default
}

/**
 * Get pillar balance for the week
 * Returns which pillar needs content most urgently
 */
export async function getWeeklyPillarBalance(weekStart: Date): Promise<{
  pillar: PillarKey;
  reason: string;
  deficit: number;
}> {
  const db = await getDb();

  // Get this week's content grouped by pillar
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const result = await db.query(`
    SELECT
      pillar,
      count() as count
    FROM platform_content
    WHERE
      scheduled_time >= $weekStart
      AND scheduled_time < $weekEnd
      AND status != 'cancelled'
    GROUP BY pillar
  `, { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() });

  const counts: Record<string, number> = {};
  for (const row of result[0] || []) {
    counts[row.pillar] = row.count;
  }

  // Calculate deficit based on target frequency
  const targets = {
    tech: 2,
    music_production: 2,
    live_performance: 3,
    nature_authentic: 2,
  };

  let maxDeficit = 0;
  let needsPillar: PillarKey = 'live_performance';
  let reason = '';

  for (const [pillar, target] of Object.entries(targets)) {
    const current = counts[pillar] || 0;
    const deficit = target - current;
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      needsPillar = pillar as PillarKey;
      reason = `Target: ${target}/week, Current: ${current}/week`;
    }
  }

  return {
    pillar: needsPillar,
    reason,
    deficit: maxDeficit,
  };
}

/**
 * Check if posting this pillar would violate "max 2 consecutive days" rule
 */
export async function checkConsecutivePillarRule(
  pillar: PillarKey,
  dayOfWeek: string,
  weekStart: Date
): Promise<{ allowed: boolean; reason?: string }> {
  const db = await getDb();

  // Get last 2 days of content
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const currentIndex = dayOrder.indexOf(dayOfWeek.toLowerCase());

  if (currentIndex < 2) {
    return { allowed: true }; // Not enough previous days to violate
  }

  const prevDay1 = dayOrder[currentIndex - 1];
  const prevDay2 = dayOrder[currentIndex - 2];

  const result = await db.query(`
    SELECT pillar
    FROM platform_content
    WHERE
      scheduled_time >= $weekStart
      AND day_of_week IN [$prevDay1, $prevDay2]
      AND status != 'cancelled'
    ORDER BY day_of_week DESC
  `, {
    weekStart: weekStart.toISOString(),
    prevDay1,
    prevDay2,
  });

  const recentPillars = (result[0] || []).map((r: any) => r.pillar);

  // Check if last 2 days were same pillar
  if (recentPillars.length >= 2 && recentPillars[0] === recentPillars[1] && recentPillars[0] === pillar) {
    return {
      allowed: false,
      reason: `"${pillar}" has been posted for 2 consecutive days. Max rule: 2 consecutive days same pillar.`,
    };
  }

  return { allowed: true };
}

/**
 * Get pillar-specific question angles for content drafting
 */
export function getPillarQuestionAngles(pillar: PillarKey): string[] {
  const angles: Record<PillarKey, string[]> = {
    tech: [
      'What technical problem does this solve?',
      'What did you learn building this?',
      'How does this connect to your music workflow?',
    ],
    music_production: [
      "What's the creative process behind this?",
      'How does tech enhance your music here?',
      'What workflow tip can you share?',
    ],
    live_performance: [
      'What was the energy like in this moment?',
      'How did the audience react?',
      'What made this performance special?',
    ],
    nature_authentic: [
      'What were you feeling in this moment?',
      "What's the story behind this place?",
      'How does this connect your IT↔GR roots?',
    ],
  };

  return angles[pillar];
}
