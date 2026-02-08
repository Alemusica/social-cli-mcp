#!/usr/bin/env node
/**
 * Grid Canvas Generator
 *
 * Splits a large image into a 3x3 grid for Instagram temporary canvas.
 * Each tile can be used as:
 * - Carousel cover image
 * - Reel thumbnail
 * - Single post image
 *
 * Usage:
 *   npx tsx scripts/grid-canvas-generator.ts <input-image> <output-dir> [--rows=3] [--cols=3]
 *
 * Example:
 *   npx tsx scripts/grid-canvas-generator.ts media/greece-panorama.jpg content/grid-canvas-1/
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

interface GridConfig {
  rows: number;
  cols: number;
  inputImage: string;
  outputDir: string;
}

async function generateGridCanvas(config: GridConfig): Promise<string[]> {
  const { rows, cols, inputImage, outputDir } = config;

  console.log(`📐 Loading image: ${inputImage}`);
  const image = await loadImage(inputImage);

  const tileWidth = Math.floor(image.width / cols);
  const tileHeight = Math.floor(image.height / rows);

  console.log(`📏 Image: ${image.width}x${image.height}`);
  console.log(`🔲 Tile size: ${tileWidth}x${tileHeight}`);

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  const tiles: string[] = [];
  let tileIndex = 1;

  // Instagram grid is displayed top-to-bottom, left-to-right
  // But posts appear in REVERSE chronological order
  // So we need to generate tiles in REVERSE order for posting
  for (let row = rows - 1; row >= 0; row--) {
    for (let col = cols - 1; col >= 0; col--) {
      const canvas = createCanvas(tileWidth, tileHeight);
      const ctx = canvas.getContext('2d');

      // Extract tile from source image
      ctx.drawImage(
        image,
        col * tileWidth,  // source x
        row * tileHeight, // source y
        tileWidth,        // source width
        tileHeight,       // source height
        0,                // dest x
        0,                // dest y
        tileWidth,        // dest width
        tileHeight        // dest height
      );

      // Save tile
      const tilePath = path.join(outputDir, `tile-${tileIndex}.jpg`);
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
      await fs.writeFile(tilePath, buffer);

      tiles.push(tilePath);
      console.log(`✅ Created tile ${tileIndex}: row ${row}, col ${col}`);
      tileIndex++;
    }
  }

  // Generate posting order metadata
  const metadata = {
    source_image: inputImage,
    grid_size: { rows, cols },
    tile_size: { width: tileWidth, height: tileHeight },
    tiles: tiles.map((tile, idx) => ({
      file: path.basename(tile),
      post_order: idx + 1, // Order to post (1 = first to post, appears bottom-right)
      grid_position: {
        row: Math.floor((tiles.length - 1 - idx) / cols),
        col: (tiles.length - 1 - idx) % cols
      }
    })),
    instructions: [
      "Post tiles in the ORDER listed above (tile-1 first, tile-9 last)",
      "Instagram will display them in REVERSE, forming the complete image",
      "Each tile can be a single post, carousel cover, or reel thumbnail",
      "Announce via story: 'Temporary grid canvas, 3 days only'"
    ]
  };

  const metadataPath = path.join(outputDir, 'grid-metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n📋 Metadata saved: ${metadataPath}`);

  console.log(`\n✨ Generated ${tiles.length} tiles in ${outputDir}`);
  console.log(`📸 Ready to post in order: tile-1, tile-2, ..., tile-${tiles.length}`);

  return tiles;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/grid-canvas-generator.ts <input-image> <output-dir> [--rows=3] [--cols=3]');
    process.exit(1);
  }

  const inputImage = args[0];
  const outputDir = args[1];

  const rows = parseInt(args.find(a => a.startsWith('--rows='))?.split('=')[1] || '3');
  const cols = parseInt(args.find(a => a.startsWith('--cols='))?.split('=')[1] || '3');

  generateGridCanvas({ rows, cols, inputImage, outputDir })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { generateGridCanvas };
