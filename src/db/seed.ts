// src/db/seed.ts
import { db } from "./client.js";
import { tenant } from "./schema.js";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create tenants
  await db.insert(tenant).values([
    {
      id: "flutur",
      name: "FLUTUR",
      platforms: ["instagram", "tiktok", "twitter", "facebook", "youtube"],
      config: {
        artistName: "FLUTUR",
        email: "flutur.booking@gmail.com",
        dailyEmailLimit: 55,
      },
    },
    {
      id: "lago_maggiore",
      name: "Lago Maggiore Academy",
      platforms: ["instagram", "facebook"],
      config: {
        businessName: "Lago Maggiore Academy",
        dailyEmailLimit: 25,
      },
    },
  ]).onConflictDoNothing();

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
