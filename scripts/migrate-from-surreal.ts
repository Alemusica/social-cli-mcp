// scripts/migrate-from-surreal.ts
/**
 * One-shot migration: SurrealDB (social/analytics) -> Neon PostgreSQL
 *
 * Strategy:
 * 1. Export each SurrealDB table via HTTP API (v2.4.1 compatible)
 * 2. Map SurrealDB record IDs (e.g., "venue:abc123") to UUIDs
 * 3. Map RELATE edges to FK references
 * 4. Insert via Drizzle
 * 5. Validate counts
 *
 * Usage: DATABASE_URL=... npx tsx scripts/migrate-from-surreal.ts
 */

import { db, withTenant } from "../src/db/client.js";
import * as schema from "../src/db/schema.js";

const SURREAL_URL = process.env.SURREAL_URL || "http://localhost:8000";
const SURREAL_USER = process.env.SURREAL_USER || "root";
const SURREAL_PASS = process.env.SURREAL_PASS || "root";

// ID mapping: SurrealDB record ID -> UUID
const idMap = new Map<string, string>();

function mapId(surrealId: string): string {
  if (idMap.has(surrealId)) return idMap.get(surrealId)!;
  const uuid = crypto.randomUUID();
  idMap.set(surrealId, uuid);
  return uuid;
}

async function surrealQuery(query: string): Promise<any[]> {
  const res = await fetch(`${SURREAL_URL}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "surreal-ns": "social",
      "surreal-db": "analytics",
      "Authorization": `Basic ${Buffer.from(`${SURREAL_USER}:${SURREAL_PASS}`).toString("base64")}`,
    },
    body: query,
  });
  const data = await res.json();
  return data[0]?.result ?? [];
}

async function migrateTable(
  tableName: string,
  drizzleTable: any,
  transform: (row: any) => any,
) {
  console.log(`Migrating ${tableName}...`);
  const rows = await surrealQuery(`SELECT * FROM ${tableName}`);
  console.log(`  Found ${rows.length} records`);

  if (rows.length === 0) return;

  const transformed = rows.map(transform).filter(Boolean);
  if (transformed.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < transformed.length; i += 100) {
      const batch = transformed.slice(i, i + 100);
      await db.insert(drizzleTable).values(batch).onConflictDoNothing();
    }
  }
  console.log(`  Migrated ${transformed.length} records`);
}

async function main() {
  const tenantId = "flutur"; // All existing data belongs to FLUTUR
  console.log("Starting SurrealDB -> Neon migration...\n");

  await withTenant(tenantId, async () => {
    // Venues
    await migrateTable("venue", schema.venue, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      name: row.name,
      type: row.type || "unknown",
      location: row.location || "unknown",
      country: row.country || "unknown",
      region: row.region,
      capacity: row.capacity,
      contactEmail: row.contact_email,
      contactName: row.contact_name,
      website: row.website,
      instagram: row.instagram,
      status: row.status || "prospect",
      tier: row.tier || 2,
      notes: row.notes,
      vibe: row.vibe || [],
      liveMusicDetails: row.live_music_details,
      previousArtists: row.previous_artists || [],
    }));

    // Emails (with venue FK)
    await migrateTable("email", schema.email, (row) => {
      const venueRef = row["->sent_to"]?.[0]?.out;
      return {
        id: mapId(String(row.id)),
        tenantId,
        subject: row.subject,
        body: row.body,
        toAddress: row.to_address,
        sentAt: row.sent_at ? new Date(row.sent_at) : new Date(),
        emailType: row.email_type || "initial",
        responseReceived: row.response_received || false,
        responseAt: row.response_at ? new Date(row.response_at) : null,
        responseSentiment: row.response_sentiment,
        feedback: row.feedback,
        messageId: row.message_id,
        gmailThreadId: row.gmail_thread_id,
        venueId: venueRef ? idMap.get(String(venueRef)) : null,
        batchId: row.batch_id,
      };
    });

    // Outreach replies
    await migrateTable("outreach_reply", schema.outreachReply, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      gmailMessageId: row.gmail_message_id,
      gmailThreadId: row.gmail_thread_id,
      fromAddress: row.from_address,
      fromName: row.from_name,
      subject: row.subject,
      bodyPreview: row.body_preview,
      replyType: row.reply_type,
      venueId: row.venue_id ? idMap.get(String(row.venue_id)) : null,
      receivedAt: row.received_at ? new Date(row.received_at) : null,
      processed: row.processed || false,
    }));

    // Session logs (with embeddings)
    await migrateTable("session_log", schema.sessionLog, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      title: row.title,
      trigger: row.trigger,
      actions: row.actions || [],
      decisions: row.decisions || [],
      entities: row.entities || [],
      files: row.files,
      nextSteps: row.next_steps || [],
      summary: row.summary,
      embedding: row.embedding,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));

    // Memory links (with embeddings)
    await migrateTable("memory_link", schema.memoryLink, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      fromDept: row.from_dept,
      toEntity: row.to_entity,
      content: row.content,
      sigma: row.sigma,
      signalType: row.signal_type,
      embedding: row.embedding,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));

    // Story fragments
    await migrateTable("story_fragment", schema.storyFragment, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      title: row.title,
      body: row.body,
      theme: row.theme,
      period: row.period,
      location: row.location,
      entities: row.entities || [],
      channelsSuitable: row.channels_suitable || [],
      source: row.source,
      published: row.published || false,
      embedding: row.embedding,
    }));

    // Web research
    await migrateTable("web_research", schema.webResearch, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      query: row.query,
      sourceType: row.source_type,
      topic: row.topic,
      findings: row.findings,
      entities: row.entities || [],
      urls: row.urls || [],
      decisions: row.decisions || [],
      stillValid: row.still_valid ?? true,
    }));

    // Gigs
    await migrateTable("gig", schema.gig, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      date: row.date,
      venue: row.venue,
      venueId: row.venue_id ? idMap.get(String(row.venue_id)) : null,
      market: row.market,
      country: row.country,
      fee: row.fee,
      status: row.status || "confirmed",
      notes: row.notes,
    }));

    // Posts
    await migrateTable("post", schema.post, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      platform: row.platform,
      externalId: row.external_id,
      content: row.content,
      mediaPaths: row.media_paths || [],
      postedAt: row.posted_at ? new Date(row.posted_at) : new Date(),
      likes: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      reach: row.reach || 0,
      impressions: row.impressions || 0,
      engagementRate: row.engagement_rate || 0,
      url: row.url,
      pillar: row.pillar,
    }));

    // Hashtags
    await migrateTable("hashtag", schema.hashtag, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      name: row.name,
      totalUses: row.total_uses || 0,
      avgEngagement: row.avg_engagement || 0,
      category: row.category,
    }));

    // Audience snapshots
    await migrateTable("audience_snapshot", schema.audienceSnapshot, (row) => ({
      id: mapId(String(row.id)),
      tenantId,
      platform: row.platform || "instagram",
      followers: row.followers_count || row.followers,
      reach: row.reach,
      impressions: row.impressions,
      engagement: row.engagement_rate || row.engagement,
      data: row,
    }));
  });

  // Validation
  console.log("\n--- VALIDATION ---");
  const tables = [
    ["venue", schema.venue],
    ["email", schema.email],
    ["outreach_reply", schema.outreachReply],
    ["session_log", schema.sessionLog],
    ["memory_link", schema.memoryLink],
    ["gig", schema.gig],
    ["post", schema.post],
  ] as const;

  for (const [name, table] of tables) {
    const surrealCount = (await surrealQuery(`SELECT count() FROM ${name} GROUP ALL`))[0]?.count ?? 0;
    const neonResult = await db.execute(`SELECT count(*) as c FROM ${name}`);
    const neonCount = Number(neonResult.rows[0]?.c ?? 0);
    const match = surrealCount === neonCount ? "OK" : "MISMATCH";
    console.log(`  ${name}: SurrealDB=${surrealCount}, Neon=${neonCount} [${match}]`);
  }

  console.log("\nMigration complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
