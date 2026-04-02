// src/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://flutur:dev@localhost:5433/flutur_dev";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });

/**
 * Execute a function within a tenant context.
 * Acquires a dedicated client from the pool, sets the PostgreSQL session variable
 * `app.tenant_id` which RLS policies use, then releases back to pool.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (db: ReturnType<typeof drizzle>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('app.tenant_id', $1, false)`, [tenantId]);
    const tenantDb = drizzle(client as any, { schema });
    return await fn(tenantDb);
  } finally {
    await client.query(`SELECT set_config('app.tenant_id', '', false)`);
    client.release();
  }
}

/**
 * Get tenant ID from environment (for scripts/cron).
 */
export function getDefaultTenantId(): string {
  return process.env.DEFAULT_TENANT || "flutur";
}

/**
 * Gracefully close the connection pool.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
