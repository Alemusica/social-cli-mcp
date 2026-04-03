// src/config/tenant.ts
import { db } from "../db/client.js";
import { tenant } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type TenantConfig = typeof tenant.$inferSelect;

const cache = new Map<string, { data: TenantConfig; at: number }>();
const CACHE_TTL = 60_000; // 1 minute

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  const rows = await db.select().from(tenant).where(eq(tenant.id, tenantId)).limit(1);
  if (rows.length === 0) return null;

  cache.set(tenantId, { data: rows[0], at: Date.now() });
  return rows[0];
}

export async function getTenantPlatforms(tenantId: string): Promise<string[]> {
  const config = await getTenantConfig(tenantId);
  return config?.platforms ?? [];
}

export function invalidateTenantCache(tenantId?: string) {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}
