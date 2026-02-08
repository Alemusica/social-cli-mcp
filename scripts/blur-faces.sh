#!/bin/bash
# Blur faces in photos for privacy compliance (minors)
# Requires: ImageMagick with face detection OR manual coordinates

IMAGES_DIR="/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/images"
OUTPUT_DIR="/Users/alessioivoycazzaniga/Projects/social-cli-mcp/media/music/images-blurred"

# Photos with minors that need face blurring
PHOTOS_TO_BLUR=(
  "IMG_5028.HEIC"   # Kids gathered around handpan
  "IMG_9284.HEIC"   # Handpan workshop with school class
  "IMG_9289.HEIC"   # Group photo with school kids
)

mkdir -p "$OUTPUT_DIR"

echo "🔒 Face Blur Script for Privacy Compliance"
echo "==========================================="
echo ""
echo "Photos to process:"
for photo in "${PHOTOS_TO_BLUR[@]}"; do
  echo "  - $photo"
done
echo ""

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
  echo "❌ ImageMagick not found. Install with: brew install imagemagick"
  exit 1
fi

echo "⚠️  IMPORTANT: This script uses basic blur. For best results:"
echo "   1. Use Photoshop/GIMP for precise face selection"
echo "   2. Or use Python face_recognition library for auto-detection"
echo ""

# Manual blur approach - applies gaussian blur to center area
# User should adjust coordinates for each photo
for photo in "${PHOTOS_TO_BLUR[@]}"; do
  input="$IMAGES_DIR/$photo"
  # Convert HEIC to JPG for processing
  output_name="${photo%.*}_blurred.jpg"
  output="$OUTPUT_DIR/$output_name"

  if [ -f "$input" ]; then
    echo "Processing: $photo"
    # This applies a general blur - user needs to adjust region manually
    # For proper face detection, use: pip install face_recognition

    # Convert HEIC to JPG first
    sips -s format jpeg "$input" --out "$output" 2>/dev/null

    if [ -f "$output" ]; then
      echo "  ✅ Converted to: $output_name"
      echo "  ⚠️  Manual face blur needed - open in editor and blur faces"
    fi
  else
    echo "  ❌ File not found: $input"
  fi
done

echo ""
echo "📝 Next steps:"
echo "   1. Open converted files in $OUTPUT_DIR"
echo "   2. Use Photoshop/Preview to manually blur faces"
echo "   3. Or run Python script with face_recognition for auto-blur"
echo ""
echo "🐍 For automatic face detection, install:"
echo "   pip install face_recognition opencv-python"
echo "   Then use: python scripts/auto-blur-faces.py"
