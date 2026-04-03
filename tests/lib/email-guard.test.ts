// tests/lib/email-guard.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../../src/db/client.js";
import { sendLog, email, tenant } from "../../src/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import {
  wasEmailEverSent,
  isDailyLimitReached,
  recordSend,
  getTodaySendCount,
  DAILY_LIMIT,
} from "../../src/lib/email-guard.js";

describe("EmailGuard", () => {
  beforeEach(async () => {
    // Ensure tenant exists and clean test data
    await db.insert(tenant).values({ id: "flutur", name: "FLUTUR" }).onConflictDoNothing();
    await db.execute(sql`SELECT set_config('app.tenant_id', 'flutur', false)`);
    await db.delete(sendLog).where(eq(sendLog.tenantId, "flutur"));
  });

  it("wasEmailEverSent returns false for unknown address", async () => {
    const sent = await wasEmailEverSent("unknown@test.com", "flutur");
    expect(sent).toBe(false);
  });

  it("wasEmailEverSent returns true after recording send", async () => {
    await recordSend("test@venue.com", "Test Venue", "flutur");
    const sent = await wasEmailEverSent("test@venue.com", "flutur");
    expect(sent).toBe(true);
  });

  it("wasEmailEverSent is case-insensitive", async () => {
    await recordSend("Test@Venue.COM", "Test", "flutur");
    const sent = await wasEmailEverSent("test@venue.com", "flutur");
    expect(sent).toBe(true);
  });

  it("isDailyLimitReached returns false when under limit", async () => {
    const reached = await isDailyLimitReached("flutur");
    expect(reached).toBe(false);
  });

  it("getTodaySendCount returns correct count", async () => {
    await recordSend("a@test.com", "A", "flutur");
    await recordSend("b@test.com", "B", "flutur");
    const count = await getTodaySendCount("flutur");
    expect(count).toBe(2);
  });

  it("DAILY_LIMIT is 55", () => {
    expect(DAILY_LIMIT).toBe(55);
  });
});
