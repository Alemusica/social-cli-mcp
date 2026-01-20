#!/usr/bin/env python3
"""
Media File Renamer
Interactive tool to rename media files with meaningful names
"""

import os
import json
import shutil
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).parent.parent
MEDIA_DIR = PROJECT_ROOT / "media"
CATALOG_FILE = MEDIA_DIR / "catalog.json"
RENAME_MAP_FILE = MEDIA_DIR / "rename_map.json"


def load_catalog():
    """Load media catalog."""
    if CATALOG_FILE.exists():
        return json.load(open(CATALOG_FILE))
    return {"files": []}


def preview_files():
    """Show current files and dates for context."""
    catalog = load_catalog()

    print("\n=== Current Media Files ===\n")
    print(f"{'#':<3} {'Original Name':<35} {'Date':<12} {'Type':<6} {'Size':<8}")
    print("-" * 70)

    for i, f in enumerate(catalog['files'], 1):
        date = f.get('modified', f.get('created', ''))[:10]
        ftype = 'video' if f['type'] == 'video' else 'image'
        size = f"{f.get('size_mb', 0):.1f}MB"
        print(f"{i:<3} {f['name']:<35} {date:<12} {ftype:<6} {size:<8}")

    return catalog


def create_rename_map():
    """Create a JSON file with proposed renames for user to edit."""
    catalog = load_catalog()

    rename_map = {
        "instructions": "Edit 'new_name' for each file. Set to null or empty to skip.",
        "context": {
            "location": "Morocco 2022",
            "topics": ["travel", "beach", "reflection", "sport", "rav_vast", "performance"]
        },
        "naming_convention": "{date}_{location}_{subject}_{number}.{ext}",
        "examples": [
            "2022-08-27_morocco_beach_sunset_01.heic",
            "2022-09-04_morocco_rav_vast_performance_01.jpg",
            "2022-08-30_morocco_reflection_01.jpg"
        ],
        "files": []
    }

    for f in catalog['files']:
        date = f.get('modified', f.get('created', ''))[:10]
        rename_map["files"].append({
            "original": f['name'],
            "path": f['path'],
            "date": date,
            "type": f['type'],
            "size_mb": f.get('size_mb', 0),
            "is_vertical": f.get('is_vertical', False),
            "suggested_usage": f.get('suggested_usage', []),
            "new_name": None,  # User fills this in
            "tags": [],  # User adds tags like ["travel", "beach", "rav_vast"]
            "description": ""  # Optional description
        })

    with open(RENAME_MAP_FILE, 'w') as f:
        json.dump(rename_map, f, indent=2)

    print(f"\nCreated rename map at: {RENAME_MAP_FILE}")
    print("Edit the 'new_name' field for each file, then run:")
    print("  python tools/rename_media.py --apply")


def apply_renames():
    """Apply renames from the map file."""
    if not RENAME_MAP_FILE.exists():
        print("No rename map found. Run without --apply first to create one.")
        return

    rename_map = json.load(open(RENAME_MAP_FILE))

    renames_applied = 0
    for item in rename_map['files']:
        new_name = item.get('new_name')
        if not new_name:
            continue

        old_path = PROJECT_ROOT / item['path']
        new_path = old_path.parent / new_name

        if not old_path.exists():
            print(f"SKIP: {item['original']} (file not found)")
            continue

        if new_path.exists():
            print(f"SKIP: {new_name} (already exists)")
            continue

        print(f"RENAME: {item['original']} -> {new_name}")
        shutil.move(str(old_path), str(new_path))
        renames_applied += 1

    print(f"\nRenamed {renames_applied} files.")
    print("Run 'python tools/catalog_media.py' to update the catalog.")


def quick_rename(index: int, new_name: str):
    """Quickly rename a single file by index."""
    catalog = load_catalog()

    if index < 1 or index > len(catalog['files']):
        print(f"Invalid index. Use 1-{len(catalog['files'])}")
        return

    item = catalog['files'][index - 1]
    old_path = PROJECT_ROOT / item['path']

    # Keep original extension if not provided
    if '.' not in new_name:
        new_name = f"{new_name}{old_path.suffix}"

    new_path = old_path.parent / new_name

    if new_path.exists():
        print(f"Error: {new_name} already exists")
        return

    print(f"RENAME: {item['name']} -> {new_name}")
    shutil.move(str(old_path), str(new_path))
    print("Done. Run 'python tools/catalog_media.py' to update catalog.")


def main():
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == '--apply':
            apply_renames()
        elif sys.argv[1] == '--quick' and len(sys.argv) >= 4:
            quick_rename(int(sys.argv[2]), sys.argv[3])
        elif sys.argv[1] == '--help':
            print("""
Media Renamer Usage:
  python rename_media.py           # Preview files & create rename map
  python rename_media.py --apply   # Apply renames from map
  python rename_media.py --quick INDEX NEW_NAME  # Quick rename single file

Examples:
  python rename_media.py --quick 1 morocco_beach_sunset
  python rename_media.py --quick 5 rav_vast_rocca_performance
""")
        else:
            print("Unknown command. Use --help for usage.")
    else:
        preview_files()
        create_rename_map()


if __name__ == '__main__':
    main()
