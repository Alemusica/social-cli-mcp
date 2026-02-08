#!/bin/bash
# Convert HEIC files to JPG at full quality for Vision API analysis
# Uses macOS sips (no quality loss)

IMAGES_DIR="/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/images"
CONVERTED=0
ERRORS=0

echo "Converting HEIC files to JPG (full quality)..."
echo ""

# Find all HEIC files recursively
find "$IMAGES_DIR" -type f -iname "*.heic" | while read -r heic_file; do
    # Get the jpg path (same name, different extension)
    jpg_file="${heic_file%.*}.jpg"

    # Skip if JPG already exists
    if [ -f "$jpg_file" ]; then
        echo "Skip (exists): $(basename "$jpg_file")"
        continue
    fi

    echo "Converting: $(basename "$heic_file")"

    # Convert with sips at maximum quality
    if sips -s format jpeg -s formatOptions 100 "$heic_file" --out "$jpg_file" > /dev/null 2>&1; then
        ((CONVERTED++))
        echo "  -> $(basename "$jpg_file")"
    else
        ((ERRORS++))
        echo "  ERROR: Failed to convert"
    fi
done

echo ""
echo "Done! Converted: $CONVERTED, Errors: $ERRORS"
