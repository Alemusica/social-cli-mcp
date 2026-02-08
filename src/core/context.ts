/**
 * FLUTUR System Context
 *
 * Single source of truth for all agents.
 * Import this to get artist profile, credentials, DB, and system state.
 */

import { getDb, closeDb } from '../db/client.js';
import { credentials, getCredentialsStatus, type CredentialsStatus } from './credentials.js';
import { ARTIST_PROFILE } from '../db/artist-profile.js';

// System context interface
export interface SystemContext {
  artist: typeof ARTIST_PROFILE;
  credentials: CredentialsStatus;
  db: {
    connected: boolean;
    stats: {
      venues: number;
      content: number;
      emails: number;
      postDrafts: number;
      storyArcs: number;
    };
  };
  editorial: {
    activeArc: any | null;
    todayPosts: any[];
    pendingFollowups: number;
  };
  timestamp: string;
}

// Cached context
let cachedContext: SystemContext | null = null;
let lastRefresh: number = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get current system context
 * Loads everything agents need to know
 */
export async function getSystemContext(forceRefresh = false): Promise<SystemContext> {
  const now = Date.now();

  if (!forceRefresh && cachedContext && (now - lastRefresh) < CACHE_TTL) {
    return cachedContext;
  }

  // Load credentials to env
  credentials.loadToEnv();

  // Get credentials status
  const credentialsStatus = getCredentialsStatus();

  // Try to connect to DB and get stats
  let dbStats = { venues: 0, content: 0, emails: 0, postDrafts: 0, storyArcs: 0 };
  let dbConnected = false;
  let activeArc = null;
  let todayPosts: any[] = [];
  let pendingFollowups = 0;

  try {
    const db = await getDb();
    dbConnected = true;

    // Get counts
    const [venueCount] = await db.query('SELECT count() FROM venue GROUP ALL');
    const [contentCount] = await db.query('SELECT count() FROM content GROUP ALL');
    const [emailCount] = await db.query('SELECT count() FROM email GROUP ALL');
    const [draftCount] = await db.query('SELECT count() FROM post_draft GROUP ALL');
    const [arcCount] = await db.query('SELECT count() FROM story_arc GROUP ALL');

    dbStats = {
      venues: (venueCount as any)?.[0]?.count ?? 0,
      content: (contentCount as any)?.[0]?.count ?? 0,
      emails: (emailCount as any)?.[0]?.count ?? 0,
      postDrafts: (draftCount as any)?.[0]?.count ?? 0,
      storyArcs: (arcCount as any)?.[0]?.count ?? 0,
    };

    // Get active arc
    const [arc] = await db.query(`
      SELECT * FROM story_arc
      WHERE status = "active"
      ORDER BY week_start DESC
      LIMIT 1
    `);
    activeArc = (arc as any[])?.[0] ?? null;

    // Get today's posts
    const today = new Date().toISOString().split('T')[0];
    const [posts] = await db.query(`
      SELECT * FROM platform_content
      WHERE scheduled_for >= $today
      AND scheduled_for < $tomorrow
      ORDER BY scheduled_for ASC
    `, {
      today: `${today}T00:00:00Z`,
      tomorrow: `${today}T23:59:59Z`
    });
    todayPosts = (posts as any[]) ?? [];

    // Get pending followups
    const [followups] = await db.query(`
      SELECT count() FROM email
      WHERE follow_up_due <= time::now()
      AND response_received = false
      AND bounced = false
      GROUP ALL
    `);
    pendingFollowups = (followups as any)?.[0]?.count ?? 0;

  } catch (e) {
    console.error('DB connection failed:', (e as Error).message);
  }

  cachedContext = {
    artist: ARTIST_PROFILE,
    credentials: credentialsStatus,
    db: {
      connected: dbConnected,
      stats: dbStats,
    },
    editorial: {
      activeArc,
      todayPosts,
      pendingFollowups,
    },
    timestamp: new Date().toISOString(),
  };

  lastRefresh = now;
  return cachedContext;
}

/**
 * Print system status to console
 */
export async function printSystemStatus(): Promise<void> {
  const ctx = await getSystemContext(true);

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    FLUTUR CONTROL CENTER                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  // Artist
  console.log('║ 👤 ARTIST                                                     ║');
  console.log(`║    ${ctx.artist.stage_name} (${ctx.artist.name}) - ${ctx.artist.based_in}`.padEnd(66) + '║');
  console.log(`║    Endorsements: ${ctx.artist.endorsements.map((e: any) => e.brand).join(', ')}`.padEnd(66) + '║');

  console.log('╠══════════════════════════════════════════════════════════════╣');

  // Credentials
  console.log('║ 🔐 CREDENTIALS                                                ║');
  const configured = ctx.credentials.summary.configuredPlatforms;
  const missing = ctx.credentials.summary.missingPlatforms;
  console.log(`║    ✅ Ready: ${configured.join(', ')}`.padEnd(66) + '║');
  console.log(`║    ❌ Missing: ${missing.join(', ')}`.padEnd(66) + '║');

  console.log('╠══════════════════════════════════════════════════════════════╣');

  // Database
  console.log('║ 🗄️  DATABASE                                                  ║');
  const dbIcon = ctx.db.connected ? '✅' : '❌';
  console.log(`║    ${dbIcon} SurrealDB: ${ctx.db.connected ? 'Connected' : 'Offline'}`.padEnd(66) + '║');
  if (ctx.db.connected) {
    console.log(`║    📊 Venues: ${ctx.db.stats.venues} | Content: ${ctx.db.stats.content} | Emails: ${ctx.db.stats.emails}`.padEnd(66) + '║');
    console.log(`║    📝 Post Drafts: ${ctx.db.stats.postDrafts} | Story Arcs: ${ctx.db.stats.storyArcs}`.padEnd(66) + '║');
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');

  // Editorial
  console.log('║ 📅 EDITORIAL                                                  ║');
  if (ctx.editorial.activeArc) {
    console.log(`║    Active Arc: "${ctx.editorial.activeArc.name}"`.padEnd(66) + '║');
  } else {
    console.log('║    ⚠️  No active story arc'.padEnd(66) + '║');
  }
  console.log(`║    Today's Posts: ${ctx.editorial.todayPosts.length}`.padEnd(66) + '║');
  console.log(`║    Pending Follow-ups: ${ctx.editorial.pendingFollowups}`.padEnd(66) + '║');

  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

/**
 * Get context summary for Claude prompts
 */
export async function getContextForPrompt(): Promise<string> {
  const ctx = await getSystemContext();

  return `
## FLUTUR System Context (${ctx.timestamp})

### Artist Profile
- Name: ${ctx.artist.stage_name} (${ctx.artist.name})
- Based in: ${ctx.artist.based_in}
- Instruments: ${ctx.artist.instruments.map((i: any) => i.name).join(', ')}
- Genres: ${ctx.artist.genres.join(', ')}
- Endorsements: ${ctx.artist.endorsements.map((e: any) => e.brand).join(', ')}

### Credentials Status
- Configured: ${ctx.credentials.summary.configuredPlatforms.join(', ')}
- Missing: ${ctx.credentials.summary.missingPlatforms.join(', ')}

### Database
- Connected: ${ctx.db.connected}
- Venues: ${ctx.db.stats.venues}
- Content: ${ctx.db.stats.content}
- Emails sent: ${ctx.db.stats.emails}
- Pending follow-ups: ${ctx.editorial.pendingFollowups}

### Editorial
- Active Arc: ${ctx.editorial.activeArc?.name ?? 'None'}
- Today's Posts: ${ctx.editorial.todayPosts.length}
`.trim();
}

// Export singleton
export const systemContext = {
  get: getSystemContext,
  print: printSystemStatus,
  forPrompt: getContextForPrompt,
};
