/** @type {import('tailwindcss').Config} */

/**
 * FLUTUR EPK — Swiss Typography + Golden Ratio
 * Design spec: design.md v1.0
 *
 * Type scale: phi-derived (÷1.618)
 * Spacing: PHI tokens (8, 13, 21, 34, 55, 89)
 * Colors: unified gold #d4a574, warm white #f5f0eb
 * Borders: radius 0 everywhere
 */

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — Warm Charcoal (zero saturated blue)
        background: '#1c1917',
        'bg-deep': '#151210',
        'bg-medium': '#252220',
        'bg-elevated': '#302c28',

        // Accent — ONE gold token
        gold: '#d4a574',
        'gold-dim': 'rgba(212, 165, 116, 0.30)',
        'gold-faint': 'rgba(212, 165, 116, 0.15)',
        'gold-ghost': 'rgba(212, 165, 116, 0.05)',

        // Text — warm white, not pure
        'text-primary': '#f5f0eb',
        'text-secondary': '#b5b0aa',
        'text-tertiary': '#918c86',

        // Rules (lines)
        rule: 'rgba(212, 165, 116, 0.20)',

        // Borders — warm-shifted
        'border-subtle': 'rgba(245, 240, 235, 0.06)',
        'border-medium': 'rgba(245, 240, 235, 0.10)',

        // Selection
        selection: 'rgba(212, 165, 116, 0.3)',
      },

      // Typography scale — phi-derived from base 16px
      fontSize: {
        'micro': ['10px', { lineHeight: '1.4', letterSpacing: '0.12em', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '500' }],
        'body-sm': ['14px', { lineHeight: '1.6', letterSpacing: '0' }],
        'body': ['16px', { lineHeight: '1.6', letterSpacing: '0' }],
        'body-lg': ['18px', { lineHeight: '1.6', letterSpacing: '0' }],
        'heading-2': ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading-1': ['26px', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        'display': ['42px', { lineHeight: '1.1', letterSpacing: '0.02em' }],
        'display-xl': ['68px', { lineHeight: '1.1', letterSpacing: '0.03em' }],
      },

      // PHI-based spacing
      spacing: {
        'phi-xs': '8px',
        'phi-sm': '13px',
        'phi-md': '21px',
        'phi-lg': '34px',
        'phi-xl': '55px',
        'phi-2xl': '89px',
      },

      // Max width for optimal line length
      maxWidth: {
        'prose': '65ch',
        'prose-narrow': '50ch',
        'prose-wide': '75ch',
      },

      fontFamily: {
        display: ['var(--font-display-serif)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },

      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      // Sharp edges — no rounded corners
      borderRadius: {
        'none': '0',
        'sm': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        'DEFAULT': '0',
        'full': '0',
      },

      transitionTimingFunction: {
        'swiss': 'ease-out',
      },

      transitionDuration: {
        '200': '200ms',
      },
    },
  },
  plugins: [],
};
