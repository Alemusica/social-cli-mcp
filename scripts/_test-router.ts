/**
 * Test the intelligence router with live Comporta data.
 */
import { routeReplyEvent, formatBriefingForConsole } from '../src/agents/intelligence-router.js';
import { closeDb } from '../src/db/client.js';

async function main() {
  console.log('Testing intelligence router with Comporta Café...\n');

  const briefing = await routeReplyEvent(
    'Comporta Café Beach Club',
    'eventos@comportacafe.pt',
    'human_reply',
    'Ok for a 3/4h set in summer. When will you be here?',
  );

  console.log(formatBriefingForConsole(briefing));

  await closeDb();
}

main().catch(async e => {
  console.error('Error:', e.message);
  await closeDb().catch(() => {});
  process.exit(1);
});
