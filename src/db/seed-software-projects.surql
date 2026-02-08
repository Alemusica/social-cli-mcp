-- FLUTUR Software Projects - SurrealDB Seed
-- Run: surreal import --conn http://localhost:8000 --ns social --db analytics src/db/seed-software-projects.surql

-- Software Project table
DEFINE TABLE software_project SCHEMAFULL;
DEFINE FIELD name ON software_project TYPE string;
DEFINE FIELD repo ON software_project TYPE string;
DEFINE FIELD description ON software_project TYPE string;
DEFINE FIELD status ON software_project TYPE string; -- active, maintenance, archived
DEFINE FIELD exit_potential ON software_project TYPE string; -- low, medium, high, 6-7-figures
DEFINE FIELD stars ON software_project TYPE int;
DEFINE FIELD npm_downloads_weekly ON software_project TYPE int;
DEFINE FIELD competitors ON software_project TYPE array<string>;
DEFINE FIELD differentiator ON software_project TYPE string;
DEFINE FIELD target_acquirers ON software_project TYPE array<string>;
DEFINE FIELD created_at ON software_project TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON software_project TYPE datetime DEFAULT time::now();

-- Acquisition Target table
DEFINE TABLE acquisition_target SCHEMAFULL;
DEFINE FIELD name ON acquisition_target TYPE string;
DEFINE FIELD type ON acquisition_target TYPE string; -- acquirer, incubator, vc
DEFINE FIELD relevance ON acquisition_target TYPE string; -- high, medium, low
DEFINE FIELD contact ON acquisition_target TYPE string;
DEFINE FIELD notes ON acquisition_target TYPE string;
DEFINE FIELD status ON acquisition_target TYPE string; -- not_contacted, contacted, in_discussion, rejected
DEFINE FIELD last_contact ON acquisition_target TYPE datetime;

-- Relations
DEFINE TABLE targets SCHEMAFULL; -- project → acquisition_target
DEFINE FIELD in ON targets TYPE record<software_project>;
DEFINE FIELD out ON targets TYPE record<acquisition_target>;
DEFINE FIELD priority ON targets TYPE int;

-- ===================
-- SEED DATA
-- ===================

-- jsOM Project
CREATE software_project:jsom SET
  name = "jsOM",
  repo = "https://github.com/alemusica/jsom",
  description = "JavaScript Object Mapping - Simple, type-safe data transformation",
  status = "active",
  exit_potential = "6-7-figures",
  stars = 50,
  npm_downloads_weekly = 0,
  competitors = ["AutoMapper", "class-transformer", "morphism"],
  differentiator = "Zero-config, TypeScript-native, edge-runtime compatible",
  target_acquirers = ["Lovable", "Vercel", "Prisma", "Supabase"];

-- Acquisition Targets
CREATE acquisition_target:lovable SET
  name = "Lovable",
  type = "acquirer",
  relevance = "high",
  contact = "founders@lovable.dev",
  notes = "AI-first dev tools, would benefit from type-safe transformations",
  status = "not_contacted";

CREATE acquisition_target:vercel SET
  name = "Vercel",
  type = "acquirer",
  relevance = "high",
  contact = "@rauchg on Twitter",
  notes = "Edge-first fits their stack perfectly",
  status = "not_contacted";

CREATE acquisition_target:prisma SET
  name = "Prisma",
  type = "acquirer",
  relevance = "high",
  contact = "prisma.io team",
  notes = "Data layer expertise, TypeScript focus, natural fit",
  status = "not_contacted";

CREATE acquisition_target:supabase SET
  name = "Supabase",
  type = "acquirer",
  relevance = "medium",
  contact = "@kiwicopple on Twitter",
  notes = "Data layer focus, could integrate with their ecosystem",
  status = "not_contacted";

CREATE acquisition_target:yc SET
  name = "Y Combinator",
  type = "incubator",
  relevance = "high",
  contact = "apply.ycombinator.com",
  notes = "Developer tools batch. Apply with traction metrics.",
  status = "not_contacted";

CREATE acquisition_target:antler SET
  name = "Antler",
  type = "incubator",
  relevance = "medium",
  contact = "antler.co/apply",
  notes = "European presence, good for EU-based founder",
  status = "not_contacted";

CREATE acquisition_target:cloudflare SET
  name = "Cloudflare",
  type = "acquirer",
  relevance = "medium",
  contact = "Developer Relations team",
  notes = "Workers ecosystem - edge-native is their thing",
  status = "not_contacted";

-- Relations: jsOM targets these acquirers
RELATE software_project:jsom->targets->acquisition_target:lovable SET priority = 1;
RELATE software_project:jsom->targets->acquisition_target:vercel SET priority = 2;
RELATE software_project:jsom->targets->acquisition_target:prisma SET priority = 3;
RELATE software_project:jsom->targets->acquisition_target:yc SET priority = 4;
RELATE software_project:jsom->targets->acquisition_target:supabase SET priority = 5;

-- Artist Profile (central node - FLUTUR)
DEFINE TABLE artist_profile SCHEMAFULL;
DEFINE FIELD name ON artist_profile TYPE string;
DEFINE FIELD stage_name ON artist_profile TYPE string;
DEFINE FIELD bio ON artist_profile TYPE string;
DEFINE FIELD social_handles ON artist_profile TYPE object;
DEFINE FIELD credentials ON artist_profile TYPE array<string>;
DEFINE FIELD pillars ON artist_profile TYPE array<string>;
DEFINE FIELD primary_objective ON artist_profile TYPE string;
DEFINE FIELD secondary_objectives ON artist_profile TYPE array<string>;

CREATE artist_profile:flutur SET
  name = "Alessio",
  stage_name = "FLUTUR",
  bio = "Dal sunrise in Grecia al codice AI – creo layer su layer",
  social_handles = {
    twitter: "@flutur_music",
    instagram: "@flutur",
    github: "alemusica",
    linktree: "linktr.ee/flutur"
  },
  credentials = [
    "Greece's Got Talent - 4 YES votes",
    "4-year residency Villa Porta, Lake Maggiore",
    "RAV Vast Endorsed Artist",
    "Sunset ceremony creator for luxury hospitality"
  ],
  pillars = ["Tech Innovation", "Music Production (BRIDGE)", "Live Performance", "Nature & Authentic"],
  primary_objective = "LIVE ACT - tante date, booking costante",
  secondary_objectives = ["SOFTWARE DEV - jsOM 6-7 figures exit", "BRAND AWARENESS - nome riconosciuto"];

-- Relations: Artist creates software
DEFINE TABLE creates SCHEMAFULL;
DEFINE FIELD in ON creates TYPE record<artist_profile>;
DEFINE FIELD out ON creates TYPE record<software_project>;

RELATE artist_profile:flutur->creates->software_project:jsom;

-- Useful queries
-- Get all targets for jsOM sorted by priority:
-- SELECT out.* FROM targets WHERE in = software_project:jsom ORDER BY priority;

-- Get artist with all their software projects:
-- SELECT *, ->creates->software_project.* FROM artist_profile:flutur;

-- Get high relevance acquisition targets:
-- SELECT * FROM acquisition_target WHERE relevance = "high";
