// src/lib/email-guard.ts
import { db } from "../db/client.js";
import { sendLog, email } from "../db/schema.js";
import { eq, and, sql, ilike } from "drizzle-orm";
import { createLogger } from "./logger.js";

const log = createLogger("email-guard");

export const DAILY_LIMIT = 55;

/**
 * Check if an email was EVER sent to this address. FAIL-CLOSED.
 * Checks: send_log table + email table. Case-insensitive.
 */
export async function wasEmailEverSent(toAddress: string, tenantId: string): Promise<boolean> {
  const normalized = toAddress.toLowerCase();

  try {
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);

    // Check send_log
    const logMatch = await db
      .select()
      .from(sendLog)
      .where(and(
        eq(sendLog.tenantId, tenantId),
        ilike(sendLog.toAddress, normalized),
      ))
      .limit(1);

    if (logMatch.length > 0) {
      log.info("blocked: found in send_log", { to: normalized });
      return true;
    }

    // Check email table
    const emailMatch = await db
      .select()
      .from(email)
      .where(and(
        eq(email.tenantId, tenantId),
        ilike(email.toAddress, normalized),
      ))
      .limit(1);

    if (emailMatch.length > 0) {
      log.info("blocked: found in email table", { to: normalized });
      return true;
    }

    return false;
  } catch (e) {
    // FAIL-CLOSED: any DB error = block
    log.error("DB error checking email — BLOCKING", { to: normalized, error: String(e) });
    return true;
  }
}

/**
 * Check if today's send limit has been reached.
 */
export async function isDailyLimitReached(tenantId: string): Promise<boolean> {
  const count = await getTodaySendCount(tenantId);
  return count >= DAILY_LIMIT;
}

/**
 * Record a sent email.
 */
export async function recordSend(toAddress: string, venue: string, tenantId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);
  await db.insert(sendLog).values({
    tenantId,
    toAddress: toAddress.toLowerCase(),
    venue,
    sentDate: today,
  });
  log.info("recorded send", { to: toAddress, venue, date: today });
}

/**
 * Get count of emails sent today.
 */
export async function getTodaySendCount(tenantId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  try {
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(sendLog)
      .where(and(
        eq(sendLog.tenantId, tenantId),
        eq(sendLog.sentDate, today),
      ));
    return Number(result[0]?.count ?? 0);
  } catch {
    // FAIL-CLOSED: error = assume limit reached
    log.error("DB error getting send count — assuming limit reached");
    return DAILY_LIMIT;
  }
}
