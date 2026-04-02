'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface YTPlayer {
  destroy(): void;
  mute(): void;
  unMute(): void;
  setVolume(vol: number): void;
  getVolume(): number;
  playVideo(): void;
}

// ─── Global API loader (singleton) ───
let ytApiPromise: Promise<void> | null = null;

function ensureYTAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).YT?.Player) { resolve(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onYouTubeIframeAPIReady = resolve;
  });

  return ytApiPromise;
}

// ─── Global audio unlock (one click unlocks ALL players) ───
let audioUnlocked = false;
const allPlayers = new Set<YTPlayer>();

function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  allPlayers.forEach((p) => {
    try { p.unMute(); p.setVolume(0); } catch { /* not ready */ }
  });
}

// ─── Component ───
interface YouTubePlayerProps {
  youtubeId: string;
  title: string;
  caption?: string;
}

export function YouTubePlayer({ youtubeId, title, caption }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const fadeRef = useRef<number>(0);
  const [unlocked, setUnlocked] = useState(audioUnlocked);

  useEffect(() => {
    let destroyed = false;

    ensureYTAPI().then(() => {
      if (destroyed || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      const player = new YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: youtubeId,
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          origin: window.location.origin,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (e: any) => {
            const p = e.target as YTPlayer;
            p.setVolume(0);
            p.mute();
            allPlayers.add(p);
            if (audioUnlocked) {
              p.unMute();
              p.setVolume(0);
            }
          },
        },
      }) as YTPlayer;
      playerRef.current = player;
    });

    return () => {
      destroyed = true;
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      if (playerRef.current) {
        allPlayers.delete(playerRef.current);
        try { playerRef.current.destroy(); } catch { /* already gone */ }
      }
    };
  }, [youtubeId]);

  // Sync global unlock state
  useEffect(() => {
    if (audioUnlocked && !unlocked) setUnlocked(true);
  });

  const fadeVolume = useCallback((target: number, durationMs: number) => {
    const player = playerRef.current;
    if (!player || !audioUnlocked) return;

    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);

    let startVol: number;
    try { startVol = player.getVolume(); } catch { return; }

    const t0 = performance.now();

    function step(now: number) {
      const p = Math.min((now - t0) / durationMs, 1);
      const eased = p * (2 - p);
      const vol = Math.round(startVol + (target - startVol) * eased);
      try { player!.setVolume(vol); } catch { /* destroyed */ }
      if (p < 1) {
        fadeRef.current = requestAnimationFrame(step);
      }
    }

    fadeRef.current = requestAnimationFrame(step);
  }, []);

  const handleClick = useCallback(() => {
    if (!audioUnlocked) {
      // First click = user gesture → unlock all players
      unlockAllAudio();
      setUnlocked(true);
      fadeVolume(70, 600);
    } else {
      window.open(`https://youtube.com/watch?v=${youtubeId}`, '_blank');
    }
  }, [youtubeId, fadeVolume]);

  const handleEnter = useCallback(() => {
    if (audioUnlocked) fadeVolume(70, 600);
  }, [fadeVolume]);

  const handleLeave = useCallback(() => {
    if (audioUnlocked) fadeVolume(0, 400);
  }, [fadeVolume]);

  return (
    <div
      className={`np-figure np-yt-player ${unlocked ? 'np-yt-unlocked' : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      role="button"
      tabIndex={0}
      aria-label={`${title} — ${unlocked ? 'hover to listen, click to open on YouTube' : 'click to enable sound'}`}
    >
      <div ref={containerRef} className="np-yt-frame" />
      {!unlocked && <span className="np-yt-hint">Click for sound</span>}
      {caption && <figcaption className="np-figcaption">{caption}</figcaption>}
    </div>
  );
}
