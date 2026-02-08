#!/usr/bin/env npx tsx
/**
 * OUTREACH DATA MIGRATION TO SURREALDB
 *
 * Consolidates all outreach data into the knowledge graph:
 * 1. Video assets from videos-database.ts + artist-links.json
 * 2. Full email sync from tracking.json (reply/followup state)
 * 3. Pending manual actions from pending-actions.json
 * 4. Email↔Video relations
 *
 * Safe to run multiple times — uses UPSERT/IF NOT EXISTS patterns.
 *
 * Usage: npx tsx scripts/migrate-outreach-to-db.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDb, closeDb } from '../src/db/client.js';

const ROOT = resolve(import.meta.dirname, '..');

// ─── Types ───────────────────────────────────────────────────

interface TrackingEntry {
  id: string;
  venue: string;
  to: string;
  status: string;
  messageId?: string;
  timestamp: string;
  sentAt: string;
  followUpDue?: string;
  bounced?: boolean;
  bounceType?: string;
  bounceReason?: string;
  bounceDetectedAt?: string;
  followUpSent?: boolean;
  followUpSentAt?: string;
  followUp2Sent?: boolean;
  followUp2SentAt?: string;
  replyReceived?: boolean;
  replyType?: string;
  replyDate?: string;
  replyPreview?: string;
  error?: string;
}

interface VideoImport {
  id: string;
  url: string;
  title: string;
  description?: string;
  duration?: string;
  video_type: string;
  energy?: string;
  mood: string[];
  instruments: string[];
  style: string[];
  best_for: string[];
  pitch_angle?: string;
  cultural_context?: string;
  source_session?: string;
}

// ─── Counters ────────────────────────────────────────────────

const counts = {
  videos_created: 0,
  videos_skipped: 0,
  emails_created: 0,
  emails_updated: 0,
  emails_skipped_dup: 0,
  emails_linked_venue: 0,
  emails_linked_video: 0,
  actions_created: 0,
  actions_skipped: 0,
  errors: [] as string[],
};

// ─── Step 1: Import Video Assets ─────────────────────────────

async function importVideos(db: any): Promise<void> {
  console.log('\n═══ STEP 1: Video Assets ═══');

  // Load from videos-database.ts (dynamically)
  const { ALL_VIDEOS } = await import('../src/db/videos-database.js');

  // Load outreach-specific videos from artist-links.json
  const links = JSON.parse(readFileSync(resolve(ROOT, 'content/artist-links.json'), 'utf-8'));
  const outreachVideos = links.outreach_videos || {};

  // Build unified video list with deterministic IDs
  const videos: VideoImport[] = [];

  for (const v of ALL_VIDEOS) {
    videos.push({
      id: v.id,
      url: v.url,
      title: v.title,
      description: v.description,
      duration: v.duration,
      video_type: v.source?.includes('Set') ? 'set_segment' : 'standalone',
      energy: v.mood?.[0],
      mood: v.mood || [],
      instruments: v.instruments || [],
      style: v.style || [],
      best_for: v.bestFor || [],
      pitch_angle: v.pitchAngle,
      cultural_context: v.culturalContext,
      source_session: v.source,
    });
  }

  // Add outreach-specific videos not already in ALL_VIDEOS
  const existingUrls = new Set(videos.map(v => v.url));
  for (const [key, entry] of Object.entries(outreachVideos)) {
    if (key === '_note') continue;
    const ov = entry as any;
    if (ov.url && !existingUrls.has(ov.url)) {
      videos.push({
        id: ov.id || key,
        url: ov.url,
        title: ov.title || key,
        description: ov.why,
        duration: ov.duration,
        video_type: key.includes('full') ? 'full_song' : 'highlight',
        mood: [],
        instruments: [],
        style: [],
        best_for: ov.useFor || [],
        source_session: 'Outreach Library',
      });
    }
  }

  for (const v of videos) {
    try {
      // Use deterministic ID
      // SurrealDB IDs: underscores only, no hyphens
      const safeId = v.id.replace(/[^a-zA-Z0-9_]/g, '_');

      // SurrealDB option<string> needs NONE, not null
      const params = {
        url: v.url,
        title: v.title,
        description: v.description || 'NONE',
        duration: v.duration || 'NONE',
        video_type: v.video_type,
        energy: v.energy || 'NONE',
        mood: v.mood,
        instruments: v.instruments,
        style: v.style,
        best_for: v.best_for,
        pitch_angle: v.pitch_angle || 'NONE',
        cultural_context: v.cultural_context || 'NONE',
        source_session: v.source_session || 'NONE',
      };

      // UPSERT: use content-based approach
      await db.query(`
        DELETE video_asset WHERE id = type::thing('video_asset', '${safeId}');
        CREATE type::thing('video_asset', '${safeId}') SET
          url = $url,
          title = $title,
          description = IF $description = 'NONE' THEN NONE ELSE $description END,
          duration = IF $duration = 'NONE' THEN NONE ELSE $duration END,
          video_type = $video_type,
          energy = IF $energy = 'NONE' THEN NONE ELSE $energy END,
          mood = $mood,
          instruments = $instruments,
          style = $style,
          best_for = $best_for,
          pitch_angle = IF $pitch_angle = 'NONE' THEN NONE ELSE $pitch_angle END,
          cultural_context = IF $cultural_context = 'NONE' THEN NONE ELSE $cultural_context END,
          source_session = IF $source_session = 'NONE' THEN NONE ELSE $source_session END
      `, params);
      counts.videos_created++;
    } catch (err: any) {
      counts.errors.push(`video ${v.id}: ${err.message}`);
    }
  }

  console.log(`  ✅ Created: ${counts.videos_created}`);
  console.log(`  ♻️  Updated: ${counts.videos_skipped}`);
}

// ─── Step 2: Full Email Sync ─────────────────────────────────

async function syncEmails(db: any): Promise<void> {
  console.log('\n═══ STEP 2: Email Sync (tracking.json → DB) ═══');

  const tracking: TrackingEntry[] = JSON.parse(
    readFileSync(resolve(ROOT, 'content/outreach/tracking.json'), 'utf-8')
  );

  // Only process "sent" entries (not duplicates or errors)
  const sent = tracking.filter(e => e.status === 'sent');
  console.log(`  📊 tracking.json: ${tracking.length} total, ${sent.length} sent`);

  for (const entry of sent) {
    try {
      // Check if email already exists by tracking_id
      const [existing] = await db.query(
        `SELECT id, tracking_id FROM email WHERE tracking_id = $tid`,
        { tid: entry.id }
      );

      // SurrealDB option<T> needs NONE, not null
      const n = (v: string | undefined) => v || 'NONE';
      // Date fields need full ISO format for datetime cast
      const toDatetime = (v: string | undefined) => {
        if (!v) return 'NONE';
        // If just a date (YYYY-MM-DD), append time
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + 'T00:00:00Z';
        return v;
      };

      if (existing && (existing as any[]).length > 0) {
        // UPDATE existing — sync reply/followup state
        const emailId = (existing as any[])[0].id;
        await db.query(`UPDATE $eid SET
          reply_received = $reply_received,
          reply_type = IF $reply_type = 'NONE' THEN NONE ELSE $reply_type END,
          reply_date = IF $reply_date = 'NONE' THEN NONE ELSE <datetime>$reply_date END,
          reply_preview = IF $reply_preview = 'NONE' THEN NONE ELSE $reply_preview END,
          followup_sent = $followup_sent,
          followup_sent_at = IF $followup_sent_at = 'NONE' THEN NONE ELSE <datetime>$followup_sent_at END,
          followup2_sent = $followup2_sent,
          followup2_sent_at = IF $followup2_sent_at = 'NONE' THEN NONE ELSE <datetime>$followup2_sent_at END,
          bounced = $bounced,
          bounce_type = IF $bounce_type = 'NONE' THEN NONE ELSE $bounce_type END,
          bounce_reason = IF $bounce_reason = 'NONE' THEN NONE ELSE $bounce_reason END,
          bounce_detected_at = IF $bounce_detected_at = 'NONE' THEN NONE ELSE <datetime>$bounce_detected_at END
        `, {
          eid: emailId,
          reply_received: entry.replyReceived || false,
          reply_type: n(entry.replyType),
          reply_date: n(entry.replyDate),
          reply_preview: n(entry.replyPreview),
          followup_sent: entry.followUpSent || false,
          followup_sent_at: n(entry.followUpSentAt),
          followup2_sent: entry.followUp2Sent || false,
          followup2_sent_at: n(entry.followUp2SentAt),
          bounced: entry.bounced || false,
          bounce_type: n(entry.bounceType),
          bounce_reason: n(entry.bounceReason),
          bounce_detected_at: n(entry.bounceDetectedAt),
        });
        counts.emails_updated++;
      } else {
        // CREATE new email
        const result = await db.query(`CREATE email SET
          tracking_id = $tracking_id,
          to_address = $to_address,
          subject = $subject,
          body = $body,
          sent_at = <datetime>$sent_at,
          follow_up_due = IF $follow_up_due = 'NONE' THEN NONE ELSE <datetime>$follow_up_due END,
          message_id = IF $message_id = 'NONE' THEN NONE ELSE $message_id END,
          campaign = 'outreach-2026',
          bounced = $bounced,
          bounce_type = IF $bounce_type = 'NONE' THEN NONE ELSE $bounce_type END,
          bounce_reason = IF $bounce_reason = 'NONE' THEN NONE ELSE $bounce_reason END,
          bounce_detected_at = IF $bounce_detected_at = 'NONE' THEN NONE ELSE <datetime>$bounce_detected_at END,
          reply_received = $reply_received,
          reply_type = IF $reply_type = 'NONE' THEN NONE ELSE $reply_type END,
          reply_date = IF $reply_date = 'NONE' THEN NONE ELSE <datetime>$reply_date END,
          reply_preview = IF $reply_preview = 'NONE' THEN NONE ELSE $reply_preview END,
          followup_sent = $followup_sent,
          followup_sent_at = IF $followup_sent_at = 'NONE' THEN NONE ELSE <datetime>$followup_sent_at END,
          followup2_sent = $followup2_sent,
          followup2_sent_at = IF $followup2_sent_at = 'NONE' THEN NONE ELSE <datetime>$followup2_sent_at END
        `, {
          tracking_id: entry.id,
          to_address: entry.to,
          subject: `Outreach: ${entry.venue}`,
          body: `[Email body not stored in tracking — see sent folder]`,
          sent_at: entry.sentAt,
          follow_up_due: toDatetime(entry.followUpDue),
          message_id: n(entry.messageId),
          bounced: entry.bounced || false,
          bounce_type: n(entry.bounceType),
          bounce_reason: n(entry.bounceReason),
          bounce_detected_at: n(entry.bounceDetectedAt),
          reply_received: entry.replyReceived || false,
          reply_type: n(entry.replyType),
          reply_date: n(entry.replyDate),
          reply_preview: n(entry.replyPreview),
          followup_sent: entry.followUpSent || false,
          followup_sent_at: n(entry.followUpSentAt),
          followup2_sent: entry.followUp2Sent || false,
          followup2_sent_at: n(entry.followUp2SentAt),
        });

        const emailId = (result as any)?.[0]?.[0]?.id;
        counts.emails_created++;

        // Link to venue by name match
        if (emailId) {
          await linkEmailToVenue(db, emailId, entry.venue);
        }
      }
    } catch (err: any) {
      counts.errors.push(`email ${entry.id}: ${err.message}`);
    }
  }

  console.log(`  ✅ Created: ${counts.emails_created}`);
  console.log(`  ♻️  Updated: ${counts.emails_updated}`);
  console.log(`  🔗 Linked to venues: ${counts.emails_linked_venue}`);
}

async function linkEmailToVenue(db: any, emailId: string, venueName: string): Promise<void> {
  try {
    // Fuzzy match: try exact name, then CONTAINS
    const [venues] = await db.query(
      `SELECT id FROM venue WHERE string::lowercase(name) = string::lowercase($name) LIMIT 1`,
      { name: venueName }
    );

    if (venues && (venues as any[]).length > 0) {
      const venueId = (venues as any[])[0].id;
      // Check if relation already exists
      const [existingRel] = await db.query(
        `SELECT id FROM sent_to WHERE in = $eid AND out = $vid`,
        { eid: emailId, vid: venueId }
      );
      if (!existingRel || (existingRel as any[]).length === 0) {
        await db.query(`RELATE $eid->sent_to->$vid`, { eid: emailId, vid: venueId });
        counts.emails_linked_venue++;
      }
    }
  } catch {
    // Non-blocking — venue link is optional
  }
}

// ─── Step 3: Import Pending Actions ──────────────────────────

async function importActions(db: any): Promise<void> {
  console.log('\n═══ STEP 3: Pending Actions ═══');

  const actionsFile = resolve(ROOT, 'analytics/pending-actions.json');
  let actionsData: any;
  try {
    actionsData = JSON.parse(readFileSync(actionsFile, 'utf-8'));
  } catch {
    console.log('  ⚠️  No pending-actions.json found — skipping');
    return;
  }

  const manualActions = actionsData.manualActions || [];

  for (const action of manualActions) {
    try {
      // SurrealDB IDs: underscores only
      const safeId = action.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const [existing] = await db.query(
        `SELECT id FROM outreach_action WHERE id = type::thing('outreach_action', $sid)`,
        { sid: safeId }
      );

      if (existing && (existing as any[]).length > 0) {
        counts.actions_skipped++;
        continue;
      }

      // Determine if single venue or batch
      const isBatch = action.venues && Array.isArray(action.venues);
      const noneStr = (v: string | undefined) => v || 'NONE';

      if (isBatch) {
        for (const v of action.venues) {
          const batchId = `${safeId}_${(v.name || v.ig || '').replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)}`;
          await db.query(`CREATE type::thing('outreach_action', '${batchId}') SET
            action_type = $type,
            batch = IF $batch = 'NONE' THEN NONE ELSE $batch END,
            status = $status,
            priority = $priority,
            notes = IF $notes = 'NONE' THEN NONE ELSE $notes END,
            website = IF $website = 'NONE' THEN NONE ELSE $website END,
            phone = NONE,
            instagram_handle = IF $ig = 'NONE' THEN NONE ELSE $ig END
          `, {
            type: action.type,
            batch: noneStr(action.batch || action.id),
            status: action.status || 'pending',
            priority: action.priority || 5,
            notes: `${action.notes || ''} — ${v.name} (${v.country || ''})`,
            website: noneStr(v.website),
            ig: noneStr(v.ig),
          });

          // Link to venue if exists
          if (v.name) {
            try {
              const [venues] = await db.query(
                `SELECT id FROM venue WHERE string::lowercase(name) = string::lowercase($name) LIMIT 1`,
                { name: v.name }
              );
              if (venues && (venues as any[]).length > 0) {
                await db.query(`RELATE type::thing('outreach_action', '${batchId}')->action_for_venue->$vid`, {
                  vid: (venues as any[])[0].id,
                });
              }
            } catch { /* non-blocking */ }
          }
          counts.actions_created++;
        }
      } else {
        await db.query(`CREATE type::thing('outreach_action', '${safeId}') SET
          action_type = $type,
          status = $status,
          priority = $priority,
          notes = IF $notes = 'NONE' THEN NONE ELSE $notes END,
          website = IF $website = 'NONE' THEN NONE ELSE $website END,
          phone = IF $phone = 'NONE' THEN NONE ELSE $phone END,
          instagram_handle = NONE
        `, {
          type: action.type,
          status: action.status || 'pending',
          priority: action.priority || 5,
          notes: action.notes || 'NONE',
          website: noneStr(action.website),
          phone: noneStr(action.phone),
        });

        // Link to venue
        if (action.venue) {
          try {
            const [venues] = await db.query(
              `SELECT id FROM venue WHERE string::lowercase(name) = string::lowercase($name) LIMIT 1`,
              { name: action.venue }
            );
            if (venues && (venues as any[]).length > 0) {
              await db.query(`RELATE type::thing('outreach_action', '${safeId}')->action_for_venue->$vid`, {
                vid: (venues as any[])[0].id,
              });
            }
          } catch { /* non-blocking */ }
        }
        counts.actions_created++;
      }
    } catch (err: any) {
      counts.errors.push(`action ${action.id}: ${err.message}`);
    }
  }

  console.log(`  ✅ Created: ${counts.actions_created}`);
  console.log(`  ⏭️  Skipped: ${counts.actions_skipped}`);
}

// ─── Step 4: Link Emails → Videos ────────────────────────────

async function linkEmailsToVideos(db: any): Promise<void> {
  console.log('\n═══ STEP 4: Email↔Video Relations ═══');

  // Video mapping based on outreach-auto.ts VIDEOS constant
  // These are the 4 videos actually used in outreach emails:
  const videoMapping: Record<string, string> = {
    'efthymia': 'video_asset:efthymia',
    'fatherOceanHighlight': 'video_asset:rocca_father_ocean_rav',
    'transcendence': 'video_asset:rocca_transcendence_rav',
    'ggt': 'video_asset:greeces_got_talent',  // greeces-got-talent → greeces_got_talent
  };

  // Also fix: IDs in DB use underscores
  // rocca-father-ocean-rav → rocca_father_ocean_rav (already correct above)

  // Load tracking to determine which video was sent to each venue
  const tracking: TrackingEntry[] = JSON.parse(
    readFileSync(resolve(ROOT, 'content/outreach/tracking.json'), 'utf-8')
  );
  const sent = tracking.filter(e => e.status === 'sent');

  // Load the outreach-auto.ts categorization logic
  // We replicate the simplified version here:
  function guessVideoForVenue(venueName: string, email: string): string {
    const lower = (venueName + ' ' + email).toLowerCase();

    // Wellness / retreat / spa → efthymia
    if (/wellness|retreat|spa|yoga|shanti|mandali|healing|holistic/.test(lower)) {
      return 'efthymia';
    }
    // Ecstatic dance → transcendence
    if (/ecstatic|dance|conscious|kirtan/.test(lower)) {
      return 'transcendence';
    }
    // Jazz / music venue → ggt
    if (/jazz|riv|music venue|opera|conservat|concert/.test(lower)) {
      return 'ggt';
    }
    // Default (beach clubs, hotels, bars) → fatherOceanHighlight
    return 'fatherOceanHighlight';
  }

  let linked = 0;
  for (const entry of sent) {
    try {
      const videoKey = guessVideoForVenue(entry.venue, entry.to);
      const videoId = videoMapping[videoKey];
      if (!videoId) continue;

      // Find the email in DB
      const [emails] = await db.query(
        `SELECT id FROM email WHERE tracking_id = $tid LIMIT 1`,
        { tid: entry.id }
      );
      if (!emails || (emails as any[]).length === 0) continue;

      const emailId = (emails as any[])[0].id;

      // Check if relation already exists
      const [existingRel] = await db.query(
        `SELECT id FROM email_includes_video WHERE in = $eid AND out = $vid`,
        { eid: emailId, vid: videoId }
      );
      if (existingRel && (existingRel as any[]).length > 0) continue;

      // Use raw SurrealQL with the video ID directly (not as parameter — it's a record reference)
      const [table, id] = videoId.split(':');
      await db.query(`RELATE $eid->email_includes_video->${table}:${id} SET selected_reason = $reason`, {
        eid: emailId,
        reason: videoKey,
      });
      linked++;
    } catch (err: any) {
      // Log first few errors for debugging
      if (linked === 0 && counts.errors.length < 3) {
        counts.errors.push(`link ${entry.id}→${videoId}: ${err.message}`);
      }
    }
  }

  counts.emails_linked_video = linked;
  console.log(`  🔗 Email↔Video relations: ${linked}`);
}

// ─── Step 5: Verification ────────────────────────────────────

async function verify(db: any): Promise<void> {
  console.log('\n═══ VERIFICATION ═══');

  const queries = [
    ['Emails in DB', 'SELECT count() FROM email GROUP ALL'],
    ['Venues in DB', 'SELECT count() FROM venue GROUP ALL'],
    ['Video assets', 'SELECT count() FROM video_asset GROUP ALL'],
    ['Outreach actions', 'SELECT count() FROM outreach_action GROUP ALL'],
    ['Email→Venue links', 'SELECT count() FROM sent_to GROUP ALL'],
    ['Email→Video links', 'SELECT count() FROM email_includes_video GROUP ALL'],
    ['Bounced emails', 'SELECT count() FROM email WHERE bounced = true GROUP ALL'],
    ['Replied emails', 'SELECT count() FROM email WHERE reply_received = true GROUP ALL'],
    ['Follow-ups sent', 'SELECT count() FROM email WHERE followup_sent = true GROUP ALL'],
  ];

  for (const [label, query] of queries) {
    try {
      const [result] = await db.query(query);
      const count = (result as any[])?.[0]?.count ?? 0;
      console.log(`  ${label}: ${count}`);
    } catch {
      console.log(`  ${label}: ⚠️ query failed`);
    }
  }

  // Test fn::outreach_status
  try {
    const [status] = await db.query('fn::outreach_status()');
    console.log('\n  📊 fn::outreach_status():');
    console.log(`  ${JSON.stringify(status, null, 2)}`);
  } catch (err: any) {
    console.log(`  ⚠️ fn::outreach_status() failed: ${err.message}`);
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  OUTREACH DATA MIGRATION TO SURREALDB               ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Check SurrealDB health
  try {
    const health = await fetch('http://127.0.0.1:8000/health');
    if (!health.ok) throw new Error('not healthy');
  } catch {
    console.error('\n❌ SurrealDB not running on localhost:8000');
    console.error('   Start it: launchctl start com.surrealdb.knowledge');
    process.exit(1);
  }

  const db = await getDb();

  try {
    await importVideos(db);
    await syncEmails(db);
    await importActions(db);
    await linkEmailsToVideos(db);
    await verify(db);

    // Summary
    console.log('\n═══ MIGRATION SUMMARY ═══');
    console.log(`  Videos: ${counts.videos_created} created, ${counts.videos_skipped} updated`);
    console.log(`  Emails: ${counts.emails_created} created, ${counts.emails_updated} updated`);
    console.log(`  Actions: ${counts.actions_created} created, ${counts.actions_skipped} skipped`);
    console.log(`  Relations: ${counts.emails_linked_venue} email→venue, ${counts.emails_linked_video} email→video`);

    if (counts.errors.length > 0) {
      console.log(`\n  ⚠️ ${counts.errors.length} errors:`);
      for (const err of counts.errors.slice(0, 10)) {
        console.log(`     ${err}`);
      }
    } else {
      console.log('\n  ✅ Zero errors. Migration complete.');
    }
  } finally {
    await closeDb();
  }
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
