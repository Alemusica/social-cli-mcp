#!/usr/bin/env python3
"""
Video Processor for Social Media
- Auto-crop to vertical (9:16) with face/hand/object tracking
- Viral moments detection (audio peaks, movement intensity)
- Multi-platform export

Usage:
    python video_processor.py input.mp4 --track face
    python video_processor.py input.mp4 --track hands --detect-moments
    python video_processor.py input.mp4 --track center --export-all
"""

import cv2
import numpy as np
import subprocess
import json
import os
import argparse
from pathlib import Path
from dataclasses import dataclass
from typing import List, Tuple, Optional, Literal

# Try to import optional dependencies
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("Warning: mediapipe not installed. Install with: pip install mediapipe")

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


@dataclass
class Platform:
    name: str
    width: int
    height: int
    max_duration: int  # seconds
    aspect_ratio: str


PLATFORMS = {
    'instagram_reels': Platform('Instagram Reels', 1080, 1920, 90, '9:16'),
    'instagram_stories': Platform('Instagram Stories', 1080, 1920, 60, '9:16'),
    'tiktok': Platform('TikTok', 1080, 1920, 600, '9:16'),
    'youtube_shorts': Platform('YouTube Shorts', 1080, 1920, 60, '9:16'),
    'youtube': Platform('YouTube', 1920, 1080, 0, '16:9'),  # 0 = unlimited
    'twitter': Platform('Twitter/X', 1280, 720, 140, '16:9'),
}


@dataclass
class Moment:
    start_time: float
    end_time: float
    score: float
    reason: str


class VideoProcessor:
    def __init__(self, input_path: str):
        self.input_path = input_path
        self.cap = cv2.VideoCapture(input_path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.duration = self.frame_count / self.fps if self.fps > 0 else 0

        # Tracking state
        self.track_positions: List[Tuple[int, int]] = []

        # MediaPipe setup
        if MEDIAPIPE_AVAILABLE:
            self.mp_hands = mp.solutions.hands
            self.mp_face = mp.solutions.face_detection
            self.hands = self.mp_hands.Hands(
                max_num_hands=2,
                min_detection_confidence=0.5
            )
            self.face_detection = self.mp_face.FaceDetection(
                min_detection_confidence=0.5
            )

    def analyze_video(self, track_mode: str = 'face') -> List[Tuple[int, int]]:
        """
        Analyze video and return tracking positions for each frame.
        track_mode: 'face', 'hands', 'center', 'auto'
        """
        print(f"Analyzing video: {self.input_path}")
        print(f"Resolution: {self.width}x{self.height}, FPS: {self.fps:.2f}, Duration: {self.duration:.2f}s")

        positions = []
        frame_idx = 0

        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        while True:
            ret, frame = self.cap.read()
            if not ret:
                break

            if frame_idx % 100 == 0:
                print(f"Processing frame {frame_idx}/{self.frame_count}")

            pos = self._get_tracking_position(frame, track_mode)
            positions.append(pos)
            frame_idx += 1

        # Smooth positions to avoid jitter
        positions = self._smooth_positions(positions)
        self.track_positions = positions

        print(f"Analysis complete. {len(positions)} frames processed.")
        return positions

    def _get_tracking_position(self, frame: np.ndarray, track_mode: str) -> Tuple[int, int]:
        """Get the center position to track in this frame."""
        h, w = frame.shape[:2]
        center = (w // 2, h // 2)

        if track_mode == 'center':
            return center

        if not MEDIAPIPE_AVAILABLE:
            return center

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        if track_mode == 'face':
            results = self.face_detection.process(rgb_frame)
            if results.detections:
                detection = results.detections[0]
                bbox = detection.location_data.relative_bounding_box
                cx = int((bbox.xmin + bbox.width / 2) * w)
                cy = int((bbox.ymin + bbox.height / 2) * h)
                return (cx, cy)

        elif track_mode == 'hands':
            results = self.hands.process(rgb_frame)
            if results.multi_hand_landmarks:
                # Get center of all detected hands
                all_x, all_y = [], []
                for hand_landmarks in results.multi_hand_landmarks:
                    for landmark in hand_landmarks.landmark:
                        all_x.append(landmark.x * w)
                        all_y.append(landmark.y * h)
                if all_x and all_y:
                    return (int(np.mean(all_x)), int(np.mean(all_y)))

        elif track_mode == 'auto':
            # Try face first, then hands, then center
            results = self.face_detection.process(rgb_frame)
            if results.detections:
                detection = results.detections[0]
                bbox = detection.location_data.relative_bounding_box
                cx = int((bbox.xmin + bbox.width / 2) * w)
                cy = int((bbox.ymin + bbox.height / 2) * h)
                return (cx, cy)

            results = self.hands.process(rgb_frame)
            if results.multi_hand_landmarks:
                all_x, all_y = [], []
                for hand_landmarks in results.multi_hand_landmarks:
                    for landmark in hand_landmarks.landmark:
                        all_x.append(landmark.x * w)
                        all_y.append(landmark.y * h)
                if all_x and all_y:
                    return (int(np.mean(all_x)), int(np.mean(all_y)))

        return center

    def _smooth_positions(self, positions: List[Tuple[int, int]], window: int = 15) -> List[Tuple[int, int]]:
        """Apply moving average smoothing to reduce jitter."""
        if len(positions) < window:
            return positions

        smoothed = []
        for i in range(len(positions)):
            start = max(0, i - window // 2)
            end = min(len(positions), i + window // 2 + 1)
            window_positions = positions[start:end]
            avg_x = int(np.mean([p[0] for p in window_positions]))
            avg_y = int(np.mean([p[1] for p in window_positions]))
            smoothed.append((avg_x, avg_y))

        return smoothed

    def detect_viral_moments(self, min_duration: float = 5.0) -> List[Moment]:
        """
        Detect potentially viral moments based on:
        - Audio intensity peaks
        - Movement/action intensity
        - Scene changes
        """
        print("Detecting viral moments...")
        moments = []

        # Extract audio and analyze
        audio_peaks = self._analyze_audio_peaks()

        # Analyze movement intensity
        movement_scores = self._analyze_movement()

        # Combine signals
        combined_scores = self._combine_signals(audio_peaks, movement_scores)

        # Find peak regions
        moments = self._extract_moments(combined_scores, min_duration)

        print(f"Found {len(moments)} potential viral moments")
        for i, m in enumerate(moments):
            print(f"  {i+1}. {m.start_time:.1f}s - {m.end_time:.1f}s (score: {m.score:.2f}) - {m.reason}")

        return moments

    def _analyze_audio_peaks(self) -> List[float]:
        """Extract audio and find intensity peaks."""
        # Use ffmpeg to extract audio levels
        temp_audio = '/tmp/audio_analysis.json'
        cmd = [
            'ffmpeg', '-i', self.input_path,
            '-af', 'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-',
            '-f', 'null', '-'
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            # Parse RMS levels from output
            levels = []
            for line in result.stderr.split('\n'):
                if 'RMS_level' in line:
                    try:
                        level = float(line.split('=')[-1])
                        levels.append(level)
                    except:
                        pass

            if levels:
                # Normalize to 0-1
                min_l, max_l = min(levels), max(levels)
                if max_l > min_l:
                    levels = [(l - min_l) / (max_l - min_l) for l in levels]
                return levels
        except Exception as e:
            print(f"Audio analysis failed: {e}")

        # Return flat scores if audio analysis fails
        return [0.5] * int(self.duration)

    def _analyze_movement(self) -> List[float]:
        """Analyze frame-to-frame movement intensity."""
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        prev_frame = None
        movement_scores = []

        while True:
            ret, frame = self.cap.read()
            if not ret:
                break

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            if prev_frame is not None:
                diff = cv2.absdiff(prev_frame, gray)
                score = np.mean(diff) / 255.0
                movement_scores.append(score)
            else:
                movement_scores.append(0)

            prev_frame = gray

        # Normalize
        if movement_scores:
            max_score = max(movement_scores)
            if max_score > 0:
                movement_scores = [s / max_score for s in movement_scores]

        return movement_scores

    def _combine_signals(self, audio: List[float], movement: List[float]) -> List[float]:
        """Combine audio and movement signals."""
        # Resample to match lengths
        target_len = int(self.duration)  # 1 score per second

        def resample(arr, target):
            if len(arr) == 0:
                return [0.5] * target
            indices = np.linspace(0, len(arr) - 1, target).astype(int)
            return [arr[i] for i in indices]

        audio_resampled = resample(audio, target_len)
        movement_resampled = resample(movement, target_len)

        # Weighted combination (audio more important for music)
        combined = []
        for a, m in zip(audio_resampled, movement_resampled):
            score = 0.6 * a + 0.4 * m
            combined.append(score)

        return combined

    def _extract_moments(self, scores: List[float], min_duration: float) -> List[Moment]:
        """Extract high-scoring moments from combined scores."""
        if not scores:
            return []

        threshold = np.percentile(scores, 70)  # Top 30%
        moments = []

        in_moment = False
        start_time = 0
        moment_scores = []

        for i, score in enumerate(scores):
            if score >= threshold:
                if not in_moment:
                    in_moment = True
                    start_time = i
                    moment_scores = []
                moment_scores.append(score)
            else:
                if in_moment:
                    end_time = i
                    duration = end_time - start_time
                    if duration >= min_duration:
                        avg_score = np.mean(moment_scores)
                        moments.append(Moment(
                            start_time=start_time,
                            end_time=end_time,
                            score=avg_score,
                            reason="High audio/movement intensity"
                        ))
                    in_moment = False

        # Handle moment at end of video
        if in_moment:
            end_time = len(scores)
            duration = end_time - start_time
            if duration >= min_duration:
                avg_score = np.mean(moment_scores)
                moments.append(Moment(
                    start_time=start_time,
                    end_time=end_time,
                    score=avg_score,
                    reason="High audio/movement intensity"
                ))

        # Sort by score
        moments.sort(key=lambda m: m.score, reverse=True)
        return moments[:10]  # Top 10 moments

    def crop_to_vertical(
        self,
        output_path: str,
        platform: str = 'tiktok',
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ):
        """
        Crop video to vertical format with tracking.
        """
        if not self.track_positions:
            print("No tracking data. Running analysis first...")
            self.analyze_video('auto')

        plat = PLATFORMS.get(platform, PLATFORMS['tiktok'])
        target_ratio = plat.height / plat.width  # e.g., 1920/1080 = 1.78

        # Calculate crop dimensions
        if self.height / self.width > target_ratio:
            # Video is taller than target
            crop_h = self.height
            crop_w = int(self.height / target_ratio)
        else:
            # Video is wider than target
            crop_w = int(self.height / target_ratio)
            crop_h = self.height

        # Ensure crop doesn't exceed frame
        crop_w = min(crop_w, self.width)
        crop_h = min(crop_h, self.height)

        print(f"Cropping to {crop_w}x{crop_h} for {plat.name}")

        # Build FFmpeg filter with dynamic crop positions
        filter_script = self._build_crop_filter(crop_w, crop_h)

        # Build FFmpeg command
        cmd = ['ffmpeg', '-y', '-i', self.input_path]

        if start_time is not None:
            cmd.extend(['-ss', str(start_time)])
        if end_time is not None:
            duration = end_time - (start_time or 0)
            cmd.extend(['-t', str(duration)])

        cmd.extend([
            '-vf', f'crop={crop_w}:{crop_h}:x:y,scale={plat.width}:{plat.height}',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            output_path
        ])

        # For simple center crop (use tracking positions for advanced)
        simple_cmd = [
            'ffmpeg', '-y', '-i', self.input_path
        ]

        if start_time is not None:
            simple_cmd.extend(['-ss', str(start_time)])
        if end_time is not None:
            duration = end_time - (start_time or 0)
            simple_cmd.extend(['-t', str(duration)])

        # Use average tracking position for crop center
        if self.track_positions:
            avg_x = int(np.mean([p[0] for p in self.track_positions]))
            avg_y = int(np.mean([p[1] for p in self.track_positions]))
        else:
            avg_x = self.width // 2
            avg_y = self.height // 2

        # Calculate crop position
        crop_x = max(0, min(avg_x - crop_w // 2, self.width - crop_w))
        crop_y = max(0, min(avg_y - crop_h // 2, self.height - crop_h))

        simple_cmd.extend([
            '-vf', f'crop={crop_w}:{crop_h}:{crop_x}:{crop_y},scale={plat.width}:{plat.height}',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            output_path
        ])

        print(f"Running: {' '.join(simple_cmd)}")
        subprocess.run(simple_cmd)
        print(f"Output saved to: {output_path}")

    def _build_crop_filter(self, crop_w: int, crop_h: int) -> str:
        """Build FFmpeg crop filter with keyframe positions."""
        # For advanced tracking, we'd need to generate a filter script
        # For now, use average position
        return f'crop={crop_w}:{crop_h}'

    def export_all_platforms(self, output_dir: str, base_name: Optional[str] = None):
        """Export video for all vertical platforms."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        if base_name is None:
            base_name = Path(self.input_path).stem

        vertical_platforms = ['instagram_reels', 'tiktok', 'youtube_shorts']

        for platform in vertical_platforms:
            plat = PLATFORMS[platform]
            output_path = output_dir / f"{base_name}_{platform}.mp4"
            print(f"\nExporting for {plat.name}...")
            self.crop_to_vertical(str(output_path), platform)

        print(f"\nAll exports complete! Files in: {output_dir}")

    def export_moments(self, moments: List[Moment], output_dir: str, platform: str = 'tiktok'):
        """Export each viral moment as a separate clip."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        base_name = Path(self.input_path).stem

        for i, moment in enumerate(moments):
            output_path = output_dir / f"{base_name}_moment_{i+1}_{platform}.mp4"
            print(f"\nExporting moment {i+1}: {moment.start_time:.1f}s - {moment.end_time:.1f}s")
            self.crop_to_vertical(
                str(output_path),
                platform,
                start_time=moment.start_time,
                end_time=moment.end_time
            )

    def close(self):
        self.cap.release()
        if MEDIAPIPE_AVAILABLE:
            self.hands.close()
            self.face_detection.close()


def main():
    parser = argparse.ArgumentParser(description='Video Processor for Social Media')
    parser.add_argument('input', help='Input video file')
    parser.add_argument('--track', choices=['face', 'hands', 'center', 'auto'],
                        default='auto', help='Tracking mode')
    parser.add_argument('--platform', choices=list(PLATFORMS.keys()),
                        default='tiktok', help='Target platform')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--output-dir', help='Output directory for batch export')
    parser.add_argument('--detect-moments', action='store_true',
                        help='Detect viral moments')
    parser.add_argument('--export-all', action='store_true',
                        help='Export for all vertical platforms')
    parser.add_argument('--export-moments', action='store_true',
                        help='Export detected moments as clips')
    parser.add_argument('--min-moment-duration', type=float, default=5.0,
                        help='Minimum moment duration in seconds')

    args = parser.parse_args()

    processor = VideoProcessor(args.input)

    # Analyze video with tracking
    processor.analyze_video(args.track)

    # Detect viral moments if requested
    moments = []
    if args.detect_moments or args.export_moments:
        moments = processor.detect_viral_moments(args.min_moment_duration)

    # Export
    if args.export_all:
        output_dir = args.output_dir or './output'
        processor.export_all_platforms(output_dir)
    elif args.export_moments and moments:
        output_dir = args.output_dir or './output/moments'
        processor.export_moments(moments, output_dir, args.platform)
    elif args.output:
        processor.crop_to_vertical(args.output, args.platform)
    else:
        # Default output
        input_path = Path(args.input)
        output_path = input_path.parent / f"{input_path.stem}_vertical.mp4"
        processor.crop_to_vertical(str(output_path), args.platform)

    processor.close()


if __name__ == '__main__':
    main()
