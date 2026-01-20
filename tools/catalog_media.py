#!/usr/bin/env python3
"""
Media Cataloger
Analyzes images and videos to detect subjects and create a catalog
"""

import os
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any

# Try to import image analysis libraries
try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    import mediapipe as mp
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False

PROJECT_ROOT = Path(__file__).parent.parent
MEDIA_DIR = PROJECT_ROOT / "media"
CATALOG_FILE = PROJECT_ROOT / "media" / "catalog.json"


def get_file_info(file_path: Path) -> Dict[str, Any]:
    """Get basic file information."""
    stat = file_path.stat()
    return {
        "name": file_path.name,
        "path": str(file_path.relative_to(PROJECT_ROOT)),
        "size_mb": round(stat.st_size / (1024 * 1024), 2),
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "extension": file_path.suffix.lower(),
    }


def get_video_info(file_path: Path) -> Dict[str, Any]:
    """Get video metadata using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', '-show_streams', str(file_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(result.stdout)

        video_stream = next(
            (s for s in data.get('streams', []) if s['codec_type'] == 'video'),
            {}
        )

        return {
            "type": "video",
            "duration": float(data.get('format', {}).get('duration', 0)),
            "width": video_stream.get('width'),
            "height": video_stream.get('height'),
            "fps": eval(video_stream.get('r_frame_rate', '0/1')) if video_stream.get('r_frame_rate') else None,
            "codec": video_stream.get('codec_name'),
            "aspect_ratio": f"{video_stream.get('width', 0)}:{video_stream.get('height', 0)}",
            "is_vertical": video_stream.get('height', 0) > video_stream.get('width', 1),
        }
    except Exception as e:
        return {"type": "video", "error": str(e)}


def get_image_info(file_path: Path) -> Dict[str, Any]:
    """Get image metadata."""
    info = {"type": "image"}

    # Convert HEIC to JPG for analysis if needed
    if file_path.suffix.lower() == '.heic':
        # Try to get basic info via sips (macOS)
        try:
            result = subprocess.run(
                ['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', str(file_path)],
                capture_output=True, text=True
            )
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if 'pixelWidth' in line:
                    info['width'] = int(line.split(':')[-1].strip())
                if 'pixelHeight' in line:
                    info['height'] = int(line.split(':')[-1].strip())
            if info.get('width') and info.get('height'):
                info['aspect_ratio'] = f"{info['width']}:{info['height']}"
                info['is_vertical'] = info['height'] > info['width']
        except:
            pass
        return info

    if PIL_AVAILABLE:
        try:
            with Image.open(file_path) as img:
                info['width'] = img.width
                info['height'] = img.height
                info['format'] = img.format
                info['mode'] = img.mode
                info['aspect_ratio'] = f"{img.width}:{img.height}"
                info['is_vertical'] = img.height > img.width

                # Try to get EXIF data
                exif = img._getexif()
                if exif:
                    for tag_id, value in exif.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag in ['DateTime', 'DateTimeOriginal', 'Make', 'Model']:
                            info[tag.lower()] = str(value)
        except Exception as e:
            info['error'] = str(e)

    return info


def analyze_subjects(file_path: Path) -> List[str]:
    """Detect subjects in image/video using MediaPipe."""
    subjects = []

    if not MP_AVAILABLE:
        # Basic detection based on filename
        name_lower = file_path.name.lower()
        if any(x in name_lower for x in ['rav', 'drum', 'handpan']):
            subjects.append('rav_vast')
        if any(x in name_lower for x in ['guitar', 'chitarra']):
            subjects.append('guitar')
        if any(x in name_lower for x in ['stage', 'live', 'concert']):
            subjects.append('performance')
        if any(x in name_lower for x in ['street', 'busking']):
            subjects.append('street_performance')
        return subjects

    # MediaPipe analysis for images
    if file_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
        try:
            mp_face = mp.solutions.face_detection
            mp_hands = mp.solutions.hands

            img = cv2.imread(str(file_path))
            if img is None:
                return subjects

            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Face detection
            with mp_face.FaceDetection(min_detection_confidence=0.5) as face:
                results = face.process(rgb)
                if results.detections:
                    subjects.append('face')
                    if len(results.detections) > 1:
                        subjects.append('multiple_people')

            # Hand detection
            with mp_hands.Hands(min_detection_confidence=0.5) as hands:
                results = hands.process(rgb)
                if results.multi_hand_landmarks:
                    subjects.append('hands')

        except Exception as e:
            pass

    return subjects


def suggest_usage(info: Dict[str, Any], subjects: List[str]) -> List[str]:
    """Suggest how to use this media."""
    suggestions = []

    is_vertical = info.get('is_vertical', False)
    is_video = info.get('type') == 'video'
    duration = info.get('duration', 0)

    if is_video:
        if duration <= 60:
            suggestions.append('youtube_short')
            suggestions.append('instagram_reel')
            suggestions.append('tiktok')
        elif duration <= 90:
            suggestions.append('instagram_reel')
            suggestions.append('tiktok')
        else:
            suggestions.append('youtube_long')
            suggestions.append('crop_to_clips')

        if not is_vertical:
            suggestions.append('needs_vertical_crop')
    else:
        suggestions.append('instagram_post')
        suggestions.append('twitter_image')
        if is_vertical:
            suggestions.append('instagram_story')

    # Subject-based suggestions
    if 'rav_vast' in subjects or 'hands' in subjects:
        suggestions.append('music_content')
        suggestions.append('instrument_focus')
    if 'face' in subjects:
        suggestions.append('personal_content')
        suggestions.append('talking_head')
    if 'performance' in subjects or 'street_performance' in subjects:
        suggestions.append('performance_highlight')

    return list(set(suggestions))


def catalog_all_media() -> Dict[str, Any]:
    """Catalog all media files."""
    catalog = {
        "generated": datetime.now().isoformat(),
        "stats": {
            "total_files": 0,
            "total_images": 0,
            "total_videos": 0,
            "total_size_mb": 0,
        },
        "files": [],
        "by_subject": {},
        "by_suggestion": {},
    }

    extensions = {
        'images': ['.jpg', '.jpeg', '.png', '.heic', '.webp'],
        'videos': ['.mp4', '.mov', '.m4v', '.avi', '.mkv'],
    }

    for vertical in ['music', 'software']:
        for subdir in ['videos', 'images', 'thumbnails']:
            dir_path = MEDIA_DIR / vertical / subdir
            if not dir_path.exists():
                continue

            for file_path in dir_path.iterdir():
                if file_path.is_file():
                    ext = file_path.suffix.lower()

                    if ext not in extensions['images'] + extensions['videos']:
                        continue

                    print(f"Analyzing: {file_path.name}")

                    # Get basic info
                    info = get_file_info(file_path)
                    info['vertical'] = vertical

                    # Get media-specific info
                    if ext in extensions['videos']:
                        info.update(get_video_info(file_path))
                        catalog['stats']['total_videos'] += 1
                    else:
                        info.update(get_image_info(file_path))
                        catalog['stats']['total_images'] += 1

                    # Analyze subjects
                    subjects = analyze_subjects(file_path)
                    info['subjects'] = subjects

                    # Suggest usage
                    suggestions = suggest_usage(info, subjects)
                    info['suggested_usage'] = suggestions

                    # Add to catalog
                    catalog['files'].append(info)
                    catalog['stats']['total_files'] += 1
                    catalog['stats']['total_size_mb'] += info.get('size_mb', 0)

                    # Index by subject
                    for subject in subjects:
                        if subject not in catalog['by_subject']:
                            catalog['by_subject'][subject] = []
                        catalog['by_subject'][subject].append(info['name'])

                    # Index by suggestion
                    for suggestion in suggestions:
                        if suggestion not in catalog['by_suggestion']:
                            catalog['by_suggestion'][suggestion] = []
                        catalog['by_suggestion'][suggestion].append(info['name'])

    return catalog


def main():
    print("=== Media Cataloger ===\n")

    catalog = catalog_all_media()

    # Save catalog
    with open(CATALOG_FILE, 'w') as f:
        json.dump(catalog, f, indent=2)

    print(f"\n=== Catalog Summary ===")
    print(f"Total files: {catalog['stats']['total_files']}")
    print(f"  Images: {catalog['stats']['total_images']}")
    print(f"  Videos: {catalog['stats']['total_videos']}")
    print(f"Total size: {catalog['stats']['total_size_mb']:.1f} MB")

    print(f"\n=== By Suggested Usage ===")
    for suggestion, files in catalog['by_suggestion'].items():
        print(f"  {suggestion}: {len(files)} files")

    print(f"\nCatalog saved to: {CATALOG_FILE}")


if __name__ == '__main__':
    main()
