// tests/db/client.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { db, withTenant } from "../../src/db/client.js";
import { tenant } from "../../src/db/schema.js";
import { sql } from "drizzle-orm";

describe("DB Client", () => {
  beforeAll(async () => {
    await db.insert(tenant).values({ id: "test", name: "Test Tenant" }).onConflictDoNothing();
  });

  it("withTenant sets app.tenant_id", async () => {
    await withTenant("test", async (tdb) => {
      const result = await tdb.execute(sql`SELECT current_setting('app.tenant_id', true) as tid`);
      expect(result.rows[0].tid).toBe("test");
    });
  });

  it("withTenant resets after execution", async () => {
    await withTenant("test", async () => {});
    const result = await db.execute(sql`SELECT current_setting('app.tenant_id', true) as tid`);
    const tid = result.rows[0].tid;
    expect(tid === null || tid === "").toBe(true);
  });
});
