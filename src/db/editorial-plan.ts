#!/usr/bin/env npx tsx
/**
 * Generate Editorial Plan from SurrealDB content
 */

import Surreal from 'surrealdb';

async function main() {
  const db = new Surreal();
  await db.connect('http://127.0.0.1:8000');
  await db.signin({ username: 'root', password: 'root' });
  await db.use({ namespace: 'social', database: 'analytics' });

  console.log('📋 PIANO EDITORIALE - Content dal Database\n');
  console.log('═'.repeat(60) + '\n');

  // Get categorized content
  const categorized = await db.query(`
    SELECT category, count() as photos, array::group(file_name) as files
    FROM content
    WHERE category IS NOT NONE
    GROUP BY category
    ORDER BY photos DESC
  `);

  console.log('📊 CONTENT DISPONIBILE PER CATEGORIA:\n');
  for (const cat of (categorized[0] as any[]) || []) {
    console.log(`${cat.category.toUpperCase()} (${cat.photos} foto)`);
    for (const file of cat.files.slice(0, 3)) {
      console.log(`  - ${file}`);
    }
    if (cat.files.length > 3) {
      console.log(`  ... e altre ${cat.files.length - 3}`);
    }
    console.log();
  }

  // Get best content by location
  console.log('═'.repeat(60));
  console.log('\n📍 BEST CONTENT PER LOCATION:\n');

  const byLocation = await db.query(`
    SELECT
      location,
      count() as total,
      array::group(description) as descriptions
    FROM content
    WHERE location IS NOT NONE AND description IS NOT NONE
    GROUP BY location
    ORDER BY total DESC
  `);

  for (const loc of (byLocation[0] as any[]) || []) {
    console.log(`\n🌍 ${loc.location}:`);
    for (const desc of loc.descriptions.slice(0, 5)) {
      console.log(`  • ${desc}`);
    }
  }

  // Suggested weekly posts
  console.log('\n' + '═'.repeat(60));
  console.log('\n📅 SUGGERIMENTI POST SETTIMANALI:\n');

  const suggestions = [
    { day: 'Lunedì', category: 'landscape', theme: 'Inizia la settimana con un landscape' },
    { day: 'Mercoledì', category: 'busking', theme: 'Music in the streets' },
    { day: 'Venerdì', category: 'sunset', theme: 'Weekend vibes - tramonto' },
    { day: 'Sabato', category: 'studio', theme: 'Behind the scenes' },
    { day: 'Domenica', category: 'adventure', theme: 'Adventure Sunday' },
  ];

  for (const sug of suggestions) {
    const content = await db.query(`
      SELECT file_name, description, location
      FROM content
      WHERE category = $cat AND description IS NOT NONE
      LIMIT 1
    `, { cat: sug.category });

    const photo = (content[0] as any[])?.[0];
    if (photo) {
      console.log(`${sug.day}: ${sug.theme}`);
      console.log(`  📸 ${photo.file_name}`);
      console.log(`  📝 ${photo.description}`);
      console.log(`  📍 ${photo.location || 'N/A'}\n`);
    }
  }

  // Ready to post content
  console.log('═'.repeat(60));
  console.log('\n✅ CONTENT PRONTO PER POST (con descrizione):\n');

  const ready = await db.query(`
    SELECT file_name, category, description, location
    FROM content
    WHERE description IS NOT NONE
    ORDER BY category
  `);

  for (const item of (ready[0] as any[]) || []) {
    console.log(`[${item.category}] ${item.file_name}`);
    console.log(`  "${item.description}"`);
    console.log(`  📍 ${item.location || 'Unknown'}\n`);
  }

  await db.close();
}

main().catch(console.error);
