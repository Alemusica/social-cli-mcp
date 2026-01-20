#!/usr/bin/env python3
"""
Simple wrapper for ai-clips-maker
Converts long videos to vertical clips for social media

Usage:
    python make-clips.py video.mp4
    python make-clips.py video.mp4 --output ./clips
    python make-clips.py video.mp4 --aspect 9:16 --max-clips 5
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv()

def main():
    parser = argparse.ArgumentParser(description='Convert videos to social media clips')
    parser.add_argument('video', help='Input video file')
    parser.add_argument('--output', '-o', default='./output/clips', help='Output directory')
    parser.add_argument('--aspect', default='9:16', choices=['9:16', '1:1', '16:9'], help='Aspect ratio')
    parser.add_argument('--max-clips', type=int, default=10, help='Maximum number of clips')
    parser.add_argument('--min-duration', type=float, default=15, help='Minimum clip duration (seconds)')
    parser.add_argument('--max-duration', type=float, default=60, help='Maximum clip duration (seconds)')

    args = parser.parse_args()

    # Check video exists
    if not os.path.exists(args.video):
        print(f"Error: Video not found: {args.video}")
        sys.exit(1)

    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get HuggingFace token
    hf_token = os.getenv('HUGGINGFACE_TOKEN')
    if not hf_token:
        print("Warning: HUGGINGFACE_TOKEN not set. Speaker diarization will be limited.")
        print("Get your token at: huggingface.co/settings/tokens")
        print()

    # Parse aspect ratio
    aspect_parts = args.aspect.split(':')
    aspect_ratio = (int(aspect_parts[0]), int(aspect_parts[1]))

    print(f"Processing: {args.video}")
    print(f"Output: {output_dir}")
    print(f"Aspect ratio: {args.aspect}")
    print()

    try:
        from ai_clips_maker import Transcriber, ClipFinder, resize

        # Step 1: Transcribe
        print("Step 1/3: Transcribing audio...")
        transcriber = Transcriber()
        transcription = transcriber.transcribe(audio_file_path=args.video)
        print(f"  Found {len(transcription.segments)} segments")

        # Step 2: Find clips
        print("\nStep 2/3: Finding best clips...")
        clip_finder = ClipFinder()
        clips = clip_finder.find_clips(transcription=transcription)
        clips = clips[:args.max_clips]
        print(f"  Found {len(clips)} potential clips")

        for i, clip in enumerate(clips):
            duration = clip.end_time - clip.start_time
            print(f"    {i+1}. {clip.start_time:.1f}s - {clip.end_time:.1f}s ({duration:.1f}s)")

        # Step 3: Resize and export
        print("\nStep 3/3: Creating vertical clips...")

        if hf_token:
            crops = resize(
                video_file_path=args.video,
                pyannote_auth_token=hf_token,
                aspect_ratio=aspect_ratio
            )
            print(f"  Created {len(crops.segments)} cropped segments")
        else:
            print("  Skipping speaker-aware cropping (no HuggingFace token)")
            print("  Using center crop instead...")
            # Fallback to simple ffmpeg crop
            import subprocess
            video_name = Path(args.video).stem

            for i, clip in enumerate(clips):
                output_file = output_dir / f"{video_name}_clip_{i+1}.mp4"
                duration = clip.end_time - clip.start_time

                cmd = [
                    'ffmpeg', '-y',
                    '-ss', str(clip.start_time),
                    '-i', args.video,
                    '-t', str(duration),
                    '-vf', f'crop=ih*{aspect_ratio[0]}/{aspect_ratio[1]}:ih,scale=1080:1920',
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                    '-c:a', 'aac', '-b:a', '128k',
                    str(output_file)
                ]

                subprocess.run(cmd, capture_output=True)
                print(f"    Saved: {output_file.name}")

        print(f"\nDone! Clips saved to: {output_dir}")

    except ImportError as e:
        print(f"Error: ai-clips-maker not properly installed: {e}")
        print("Try: pip install -e tools/ai-clips-maker")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
