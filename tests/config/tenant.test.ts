// tests/config/tenant.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../../src/db/client.js";
import { tenant } from "../../src/db/schema.js";
import { getTenantConfig, getTenantPlatforms } from "../../src/config/tenant.js";

describe("TenantConfig", () => {
  beforeAll(async () => {
    await db.insert(tenant).values({
      id: "test_tenant",
      name: "Test",
      platforms: ["instagram", "twitter"],
      config: { dailyEmailLimit: 30 },
    }).onConflictDoNothing();
  });

  it("loads tenant config from DB", async () => {
    const config = await getTenantConfig("test_tenant");
    expect(config).toBeDefined();
    expect(config!.name).toBe("Test");
    expect(config!.config).toEqual({ dailyEmailLimit: 30 });
  });

  it("returns null for unknown tenant", async () => {
    const config = await getTenantConfig("nonexistent");
    expect(config).toBeNull();
  });

  it("returns enabled platforms", async () => {
    const platforms = await getTenantPlatforms("test_tenant");
    expect(platforms).toEqual(["instagram", "twitter"]);
  });
});
