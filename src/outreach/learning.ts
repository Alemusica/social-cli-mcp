/**
 * Outreach Learning — Pattern analysis and self-improvement
 *
 * Analyzes which videos, countries, strategies, categories get replies.
 * Saves insights to SurrealDB for the intelligence dashboard.
 */

import { loadTracking, getFunnelBy, getPipelineStats, type TrackingEntry } from './pipeline.js';

export interface LearningInsight {
  type: 'positive' | 'negative' | 'warning';
  dimension: string;
  message: string;
  data: { sent: number; replied: number; rate: number };
}

export interface OutreachLearning {
  stats: ReturnType<typeof getPipelineStats>;
  byVideo: ReturnType<typeof getFunnelBy>;
  byCountry: ReturnType<typeof getFunnelBy>;
  byStrategy: ReturnType<typeof getFunnelBy>;
  insights: LearningInsight[];
  recommendations: string[];
}

/**
 * Full learning analysis.
 */
export function analyze(tracking?: TrackingEntry[]): OutreachLearning {
  const t = tracking ?? loadTracking();
  const stats = getPipelineStats(t);
  const byVideo = getFunnelBy('video', t);
  const byCountry = getFunnelBy('country', t);
  const byStrategy = getFunnelBy('strategy', t);

  const insights = extractInsights(byVideo, byCountry, byStrategy);
  const recommendations = generateRecommendations(stats, insights);

  return { stats, byVideo, byCountry, byStrategy, insights, recommendations };
}

function extractInsights(
  byVideo: ReturnType<typeof getFunnelBy>,
  byCountry: ReturnType<typeof getFunnelBy>,
  byStrategy: ReturnType<typeof getFunnelBy>,
): LearningInsight[] {
  const insights: LearningInsight[] = [];

  // Video insights
  for (const v of byVideo) {
    if (v.sent >= 5 && v.rate === 0) {
      insights.push({
        type: 'negative',
        dimension: 'video',
        message: `${v.dimension}: 0% su ${v.sent} invii — smetti di usarlo per cold email`,
        data: v,
      });
    }
    if (v.rate >= 10 && v.sent >= 3) {
      insights.push({
        type: 'positive',
        dimension: 'video',
        message: `${v.dimension}: ${v.rate.toFixed(0)}% reply rate su ${v.sent} invii — video migliore`,
        data: v,
      });
    }
  }

  // Country insights
  for (const c of byCountry) {
    if (c.rate >= 20 && c.sent >= 3) {
      insights.push({
        type: 'positive',
        dimension: 'country',
        message: `${c.dimension}: ${c.rate.toFixed(0)}% reply — focus su questa area`,
        data: c,
      });
    }
    if (c.sent >= 10 && c.rate === 0) {
      insights.push({
        type: 'negative',
        dimension: 'country',
        message: `${c.dimension}: 0% su ${c.sent} invii — cambia approccio o skip`,
        data: c,
      });
    }
  }

  // Strategy insights
  for (const s of byStrategy) {
    if (s.sent >= 5 && s.rate === 0) {
      insights.push({
        type: 'warning',
        dimension: 'strategy',
        message: `Strategia "${s.dimension}": 0% su ${s.sent} — rivaluta`,
        data: s,
      });
    }
  }

  return insights;
}

function generateRecommendations(
  stats: ReturnType<typeof getPipelineStats>,
  insights: LearningInsight[],
): string[] {
  const recs: string[] = [];

  if (stats.followUpDue > 0) {
    recs.push(`${stats.followUpDue} venue in attesa di follow-up (>7 giorni). Manda FU2.`);
  }

  if (stats.responseRate < 5) {
    recs.push(`Response rate ${stats.responseRate.toFixed(1)}% — sotto il target 5%. Migliora subject line o targeting.`);
  }

  const bestVideo = insights.find(i => i.type === 'positive' && i.dimension === 'video');
  if (bestVideo) {
    recs.push(`Usa "${bestVideo.data.dimension}" come video principale per nuovi invii.`);
  }

  const bestCountry = insights.find(i => i.type === 'positive' && i.dimension === 'country');
  if (bestCountry) {
    recs.push(`Concentrati su ${bestCountry.data.dimension} per il prossimo batch.`);
  }

  const deadVideos = insights.filter(i => i.type === 'negative' && i.dimension === 'video');
  for (const dv of deadVideos) {
    recs.push(`Smetti di usare "${dv.data.dimension}" per cold email.`);
  }

  return recs;
}
