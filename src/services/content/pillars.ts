/**
 * Pillar constants and pure helpers — no DB dependency.
 * DB-dependent pillar logic (getWeeklyPillarBalance) stays in src/core/pillar-helpers.ts.
 */

export const BRAND_PILLARS = {
  tech: {
    name: "Tech Innovation",
    description: "jsOM, AI tools, build-in-public, GitHub, developer content",
    hashtags: ["buildinpublic", "AI", "jsOM", "opensource", "coding"],
    keywords: [
      "code",
      "tech",
      "programming",
      "developer",
      "jsOM",
      "AI",
      "build",
    ],
    frequency: "2x/week",
    platforms: ["Twitter", "LinkedIn", "YouTube"],
  },
  music_production: {
    name: "Music Production (BRIDGE)",
    description: "Ableton, ClyphX scripting, live looping workflow",
    hashtags: ["ableton", "musicproduction", "livelooping", "musictech"],
    keywords: [
      "ableton",
      "production",
      "studio",
      "workflow",
      "looping",
      "daw",
    ],
    frequency: "2x/week",
    platforms: ["Twitter", "Instagram", "TikTok"],
  },
  live_performance: {
    name: "Live Performance",
    description: "RAV Vast, busking, sunset sessions, stage shows",
    hashtags: ["busker", "ravvast", "handpan", "livemusic"],
    keywords: [
      "performance",
      "busking",
      "rav",
      "handpan",
      "stage",
      "concert",
      "live",
    ],
    frequency: "3x/week",
    platforms: ["Instagram", "TikTok", "YouTube"],
  },
  nature_authentic: {
    name: "Nature & Authentic",
    description: "Field recording, BTS, reflections, travel, family stories",
    hashtags: ["fieldrecording", "musicianlife", "behindthescenes", "travel"],
    keywords: [
      "nature",
      "sunset",
      "travel",
      "authentic",
      "field",
      "family",
      "story",
    ],
    frequency: "2x/week",
    platforms: ["Instagram", "Twitter"],
  },
} as const;

export type PillarKey = keyof typeof BRAND_PILLARS;

export function getPillarHashtags(pillar: string): string[] {
  if (pillar in BRAND_PILLARS) {
    return BRAND_PILLARS[pillar as PillarKey].hashtags.slice(0, 3);
  }
  return [];
}

export function determinePillarFromContent(
  tags: string[],
  category?: string,
): PillarKey {
  const allText = [...tags, category || ""].join(" ").toLowerCase();

  for (const [key, pillar] of Object.entries(BRAND_PILLARS)) {
    if (pillar.keywords.some((kw) => allText.includes(kw))) {
      return key as PillarKey;
    }
  }

  if (category === "busking" || category === "sunset") return "live_performance";
  if (category === "behind_scenes") return "nature_authentic";

  return "nature_authentic";
}
