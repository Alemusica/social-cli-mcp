#!/bin/bash
# Create thumbnails for photo analysis

SRC_DIR="/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/images"
THUMB_DIR="/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/thumbnails"

mkdir -p "$THUMB_DIR"

count=0
for f in "$SRC_DIR"/*.HEIC "$SRC_DIR"/*.heic "$SRC_DIR"/*.JPG "$SRC_DIR"/*.jpg; do
  if [ -f "$f" ]; then
    basename=$(basename "$f" | sed 's/\.[^.]*$/.jpg/')
    out="$THUMB_DIR/$basename"

    if [ ! -f "$out" ]; then
      convert "$f" -resize 400x400 -quality 60 "$out" 2>/dev/null
      ((count++))

      if [ $((count % 20)) -eq 0 ]; then
        echo "Processed $count images..."
      fi
    fi
  fi
done

echo "Done! Created $count thumbnails"
ls "$THUMB_DIR" | wc -l
