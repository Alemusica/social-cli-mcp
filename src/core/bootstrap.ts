/**
 * FLUTUR Bootstrap
 *
 * Initialize the entire system. Run this at startup.
 * All agents should import from here.
 */

import { getDb, closeDb } from '../db/client.js';
import { credentials, loadCredentialsToEnv, syncCredentialsToDb } from './credentials.js';
import { getSystemContext, printSystemStatus } from './context.js';

export interface BootstrapResult {
  success: boolean;
  credentialsLoaded: number;
  dbConnected: boolean;
  errors: string[];
}

/**
 * Initialize the FLUTUR system
 */
export async function bootstrap(options: {
  verbose?: boolean;
  syncCredentials?: boolean;
} = {}): Promise<BootstrapResult> {
  const { verbose = false, syncCredentials = true } = options;
  const errors: string[] = [];

  if (verbose) {
    console.log('🚀 Bootstrapping FLUTUR system...\n');
  }

  // 1. Load credentials from Keychain
  if (verbose) console.log('1. Loading credentials from Keychain...');
  const credentialsLoaded = loadCredentialsToEnv();
  if (verbose) console.log(`   ✅ Loaded ${credentialsLoaded} credentials\n`);

  // 2. Connect to database
  if (verbose) console.log('2. Connecting to SurrealDB...');
  let dbConnected = false;
  try {
    await getDb();
    dbConnected = true;
    if (verbose) console.log('   ✅ Database connected\n');
  } catch (e) {
    errors.push(`DB connection failed: ${(e as Error).message}`);
    if (verbose) console.log(`   ❌ Database connection failed: ${(e as Error).message}\n`);
  }

  // 3. Sync credentials status to DB
  if (syncCredentials && dbConnected) {
    if (verbose) console.log('3. Syncing credentials status to DB...');
    try {
      await syncCredentialsToDb();
      if (verbose) console.log('   ✅ Credentials status synced\n');
    } catch (e) {
      errors.push(`Credentials sync failed: ${(e as Error).message}`);
      if (verbose) console.log(`   ⚠️ Credentials sync failed: ${(e as Error).message}\n`);
    }
  }

  // 4. Apply any pending schema updates
  if (dbConnected) {
    if (verbose) console.log('4. Applying schema updates...');
    try {
      const db = await getDb();

      // Ensure credentials_status table exists
      await db.query(`
        DEFINE TABLE IF NOT EXISTS credentials_status SCHEMALESS;
        DEFINE FIELD platforms ON credentials_status TYPE object;
        DEFINE FIELD summary ON credentials_status TYPE object;
        DEFINE FIELD checked_at ON credentials_status TYPE datetime;
      `);

      if (verbose) console.log('   ✅ Schema up to date\n');
    } catch (e) {
      errors.push(`Schema update failed: ${(e as Error).message}`);
      if (verbose) console.log(`   ⚠️ Schema update failed\n`);
    }
  }

  const result: BootstrapResult = {
    success: errors.length === 0,
    credentialsLoaded,
    dbConnected,
    errors,
  };

  if (verbose) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Bootstrap ${result.success ? '✅ Complete' : '⚠️ Completed with errors'}`);
    if (errors.length > 0) {
      errors.forEach(e => console.log(`   ❌ ${e}`));
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  return result;
}

/**
 * Quick bootstrap for scripts (no verbose, just load essentials)
 */
export async function quickBootstrap(): Promise<boolean> {
  loadCredentialsToEnv();
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}

/**
 * Shutdown the system cleanly
 */
export async function shutdown(): Promise<void> {
  await closeDb();
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await bootstrap({ verbose: true });
    await printSystemStatus();
    await shutdown();
    process.exit(0);
  })();
}
