// tests/config/credentials.test.ts
import { describe, it, expect } from "vitest";
import { CREDENTIAL_KEYS, PLATFORM_REQUIREMENTS, getCredentialsStatus } from "../../src/config/credentials.js";

describe("Credentials", () => {
  it("defines 20 credential keys", () => {
    expect(CREDENTIAL_KEYS.length).toBe(20);
  });

  it("defines 10 platform requirements", () => {
    expect(Object.keys(PLATFORM_REQUIREMENTS).length).toBe(10);
  });

  it("getCredentialsStatus returns status for all platforms", async () => {
    const status = await getCredentialsStatus();
    expect(status.platforms).toBeDefined();
    expect(Object.keys(status.platforms).length).toBe(10);
    for (const p of Object.values(status.platforms)) {
      expect(p).toHaveProperty("configured");
      expect(p).toHaveProperty("missing");
    }
  });
});
