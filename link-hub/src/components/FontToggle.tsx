'use client';

import { useState } from 'react';

// Base scale (tuned for Newsreader at scale 1.0)
const BASE = { xs: 12, sm: 16, md: 21, lg: 28, xl: 37, '2xl': 50 };

const FONT_PRESETS = [
  { name: 'Newsreader', cssVar: null, desc: 'Newspaper serif', scale: 1.0 },
  { name: 'Cormorant Garamond', cssVar: '--font-cormorant', desc: 'High contrast', scale: 1.18 },
  { name: 'Instrument Serif', cssVar: '--font-instrument-serif', desc: 'Editorial serif', scale: 1.05 },
  { name: 'Space Grotesk', cssVar: '--font-space-grotesk', desc: 'Geometric sans', scale: 0.93 },
  { name: 'Inter', cssVar: '--font-inter', desc: 'Swiss neutral', scale: 0.93 },
  { name: 'DM Sans', cssVar: '--font-dm-sans', desc: 'Warm geometric', scale: 0.93 },
] as const;

export function FontToggle() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  function switchFont(index: number) {
    setActive(index);
    const preset = FONT_PRESETS[index];
    const root = document.documentElement;

    // Switch font
    if (!preset.cssVar) {
      root.style.removeProperty('--font-body');
    } else {
      root.style.setProperty('--font-body', `var(${preset.cssVar})`);
    }

    // Compensate type scale for x-height differences
    if (preset.scale === 1.0) {
      for (const key of Object.keys(BASE)) {
        root.style.removeProperty(`--np-type-${key}`);
      }
    } else {
      for (const [key, base] of Object.entries(BASE)) {
        root.style.setProperty(
          `--np-type-${key}`,
          `${Math.round(base * preset.scale)}px`
        );
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        maxWidth: '220px',
      }}
    >
      {open && (
        <div
          style={{
            background: '#1c1917',
            border: '1px solid #d4a574',
            borderBottom: 'none',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {FONT_PRESETS.map((preset, i) => (
            <button
              key={preset.name}
              onClick={() => switchFont(i)}
              style={{
                background:
                  i === active
                    ? 'rgba(212, 165, 116, 0.25)'
                    : 'transparent',
                border: i === active
                  ? '1px solid #d4a574'
                  : '1px solid transparent',
                color: i === active ? '#d4a574' : '#b5b0aa',
                padding: '6px 10px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
                letterSpacing: '0.02em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '8px',
              }}
            >
              <span>{preset.name}</span>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>
                {preset.desc}{preset.scale !== 1 ? ` ×${preset.scale}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: '#d4a574',
          border: 'none',
          color: '#1c1917',
          padding: '8px 14px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textAlign: 'left',
        }}
      >
        {open ? '▾' : '▸'} FONT: {FONT_PRESETS[active].name}
      </button>
    </div>
  );
}
