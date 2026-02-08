/**
 * Seed core data: Artist Profile + jsOM Project
 */
import { getDb, closeDb } from '../src/db/client.js';
import { ARTIST_PROFILE } from '../src/db/artist-profile.js';

async function seedCoreData() {
  console.log('🌱 Seeding core data...\n');

  const db = await getDb();

  // 1. Seed Artist Profile
  console.log('👤 Creating artist profile...');
  await db.query('DELETE artist_profile:flutur');
  await db.query(`
    CREATE artist_profile:flutur SET
      name = "Alessio",
      stage_name = "Flutur",
      based_in = "Italy",
      instruments = $instruments,
      genres = $genres,
      endorsements = $endorsements,
      credentials_for_outreach = $credentials,
      social = $social,
      content_pillars = $pillars,
      ideal_venues = $venues
  `, {
    instruments: ARTIST_PROFILE.instruments,
    genres: ARTIST_PROFILE.genres,
    endorsements: ARTIST_PROFILE.endorsements,
    credentials: ARTIST_PROFILE.credentials_for_outreach,
    social: ARTIST_PROFILE.social,
    pillars: ARTIST_PROFILE.content_pillars,
    venues: ARTIST_PROFILE.ideal_venues
  });
  console.log('   ✅ artist_profile:flutur created');

  // 2. Seed jsOM Project
  console.log('💻 Creating jsOM project...');
  await db.query('DELETE software_project:jsom');
  await db.query(`
    CREATE software_project:jsom SET
      name = "jsOM",
      repo_url = "https://github.com/alemusica/jsom",
      description = "JSON Schema to Object Model - TypeScript code generator from JSON schemas",
      status = "active",
      exit_potential = "6-7 figures",
      target_acquirers = ["Lovable", "Vercel", "Prisma", "Y Combinator"],
      tech_stack = ["TypeScript", "Node.js", "JSON Schema", "Code Generation"],
      milestones = [
        { date: "2025-01", achievement: "Initial release" },
        { date: "2025-06", achievement: "100+ GitHub stars" }
      ],
      content_ideas = [
        "Build-in-public thread on Twitter",
        "Demo video showing code generation",
        "Comparison with alternatives (quicktype, json2ts)",
        "Use case: generating types for API responses"
      ]
  `);
  console.log('   ✅ software_project:jsom created');

  // 3. Seed Acquisition Targets
  console.log('🎯 Creating acquisition targets...');
  await db.query('DELETE FROM acquisition_target');

  const targets = [
    { name: 'Lovable', type: 'acquirer', priority: 1, notes: 'AI coding startup, would benefit from schema tooling' },
    { name: 'Vercel', type: 'acquirer', priority: 1, notes: 'Major player in frontend tooling' },
    { name: 'Prisma', type: 'acquirer', priority: 2, notes: 'Database tooling, schema focus' },
    { name: 'Y Combinator', type: 'incubator', priority: 2, notes: 'Startup accelerator' },
    { name: 'Supabase', type: 'acquirer', priority: 2, notes: 'Backend-as-a-service, TypeScript focused' }
  ];

  for (const target of targets) {
    await db.query(`
      CREATE acquisition_target SET
        name = $name,
        type = $type,
        priority = $priority,
        notes = $notes,
        status = "prospect"
    `, target);
  }
  console.log(`   ✅ ${targets.length} acquisition targets created`);

  // 4. Create relations
  console.log('🔗 Creating relations...');

  // Artist creates jsOM
  await db.query(`
    RELATE artist_profile:flutur->creates->software_project:jsom SET role = "creator"
  `);

  // jsOM targets acquirers - create individually
  const [allTargets] = await db.query('SELECT id FROM acquisition_target');
  for (const t of (allTargets as any[]) || []) {
    await db.query(`RELATE software_project:jsom->targets->$target SET pitch_sent = false`, { target: t.id });
  }
  console.log('   ✅ Relations created');

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Seed Complete:');

  const [profile] = await db.query('SELECT * FROM artist_profile');
  const [project] = await db.query('SELECT * FROM software_project');
  const [targetsCount] = await db.query('SELECT count() FROM acquisition_target GROUP ALL');

  console.log(`   Artist Profile: ${(profile as any[])?.length || 0}`);
  console.log(`   Software Projects: ${(project as any[])?.length || 0}`);
  console.log(`   Acquisition Targets: ${(targetsCount as any)?.[0]?.count || 0}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await closeDb();
}

seedCoreData().catch(console.error);
