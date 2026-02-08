/**
 * Sync & backfill the outreach intelligence system.
 *
 * 1. Syncs missing tracking.json entries → email table
 * 2. Backfills gmail_thread_id on email records via Gmail API
 * 3. Shows conversation dashboard
 *
 * Usage:
 *   npx tsx scripts/sync-outreach-system.ts           # Full sync + dashboard
 *   npx tsx scripts/sync-outreach-system.ts sync      # Sync tracking only
 *   npx tsx scripts/sync-outreach-system.ts backfill  # Backfill thread IDs only
 *   npx tsx scripts/sync-outreach-system.ts dashboard  # Show dashboard only
 *   npx tsx scripts/sync-outreach-system.ts thread <venue>  # Show single thread
 */

import { syncTrackingToDb, backfillThreadIds, getConversationDashboard, getConversation } from '../src/outreach/conversation-store.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  const cmd = process.argv[2] || 'full';
  const arg = process.argv[3];

  if (cmd === 'sync' || cmd === 'full') {
    console.log('\n📋 Syncing tracking.json → email table...');
    const sync = await syncTrackingToDb();
    console.log(`  Synced: ${sync.synced} new | Skipped: ${sync.skipped} (already in DB or no email)`);
  }

  if (cmd === 'backfill' || cmd === 'full') {
    console.log('\n🔗 Backfilling gmail_thread_id via Gmail API...');
    const backfill = await backfillThreadIds();
    console.log(`  Updated: ${backfill.updated} | Skipped: ${backfill.skipped} | Not found: ${backfill.failed}`);
  }

  if (cmd === 'dashboard' || cmd === 'full') {
    console.log('\n📊 Outreach Conversation Dashboard\n');
    const dashboard = await getConversationDashboard();

    console.log(`Total venues: ${dashboard.totalVenues}`);
    console.log(`Status: ${JSON.stringify(dashboard.byStatus)}`);
    console.log(`Action needed: ${dashboard.actionNeeded.length}\n`);

    console.log('═══════════════════════════════════════════════════════════════');

    if (dashboard.actionNeeded.length > 0) {
      console.log('\n🎯 ACTION NEEDED:\n');
      for (const c of dashboard.actionNeeded) {
        const lastMsg = c.messages[c.messages.length - 1];
        console.log(`  ${statusEmoji(c.status)} ${c.venue} (${c.venueEmail})`);
        console.log(`     Status: ${c.status} | ${c.daysSinceLastActivity}d ago | FU: ${c.followUpsSent}`);
        if (lastMsg) {
          console.log(`     Last: ${lastMsg.direction === 'sent' ? '→' : '←'} ${lastMsg.preview.slice(0, 80)}`);
        }
        console.log('');
      }
    }

    // All conversations summary
    console.log('\n📬 ALL CONVERSATIONS:\n');
    for (const c of dashboard.conversations.slice(0, 30)) {
      const msgs = c.messages.length;
      const lastDir = c.messages[c.messages.length - 1]?.direction;
      console.log(`  ${statusEmoji(c.status)} ${c.venue.padEnd(35)} ${c.status.padEnd(16)} ${msgs} msg  ${c.daysSinceLastActivity}d  ${lastDir === 'received' ? '← reply' : '→ sent'}`);
    }
    if (dashboard.conversations.length > 30) {
      console.log(`  ... +${dashboard.conversations.length - 30} more`);
    }
  }

  if (cmd === 'thread') {
    if (!arg) { console.error('Usage: thread <venue>'); process.exit(1); }
    console.log(`\n📧 Thread for: ${arg}\n`);
    const conv = await getConversation(arg);
    if (!conv) { console.log('  No conversation found.'); }
    else {
      console.log(`  Venue: ${conv.venue}`);
      console.log(`  Email: ${conv.venueEmail}`);
      console.log(`  Status: ${conv.status}`);
      console.log(`  Gmail Thread: ${conv.gmailThreadId || 'not linked'}`);
      console.log(`  Messages: ${conv.messages.length}\n`);

      for (const m of conv.messages) {
        const arrow = m.direction === 'sent' ? '→ SENT' : '← RECV';
        const dateStr = m.date.toLocaleDateString('it-IT');
        console.log(`  ${arrow}  ${dateStr}  ${m.subject}`);
        console.log(`         From: ${m.from} → ${m.to}`);
        if (m.preview) console.log(`         ${m.preview.slice(0, 150)}`);
        if (m.replyType) console.log(`         Type: ${m.replyType}`);
        console.log('');
      }
    }
  }

  await closeDb();
  process.exit(0);
}

function statusEmoji(status: string): string {
  switch (status) {
    case 'in_conversation': return '💬';
    case 'human_reply': return '🎉';
    case 'auto_reply': return '📋';
    case 'bounced': return '❌';
    default: return '⏳';
  }
}

main().catch(async e => {
  console.error('Error:', e.message);
  await closeDb().catch(() => {});
  process.exit(1);
});
