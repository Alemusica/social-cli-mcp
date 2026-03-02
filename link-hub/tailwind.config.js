/** @type {import('tailwindcss').Config} */

/**
 * Typography based on best practices:
 * - Body: 17-18px for readability
 * - Line height: 1.5-1.6 for body, 1.2-1.35 for headings
 * - Line length: 50-75 characters (max-w-prose = 65ch)
 * - Contrast: 4.5:1 minimum (WCAG AA)
 *
 * PHI (Golden Ratio) spacing: 8, 13, 21, 34, 55, 89
 */

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark navy theme — brand color #000427
        background: '#000427',
        'bg-dark': '#000427',
        'bg-medium': '#0c1033',
        'bg-light': '#161a3d',
        'bg-elevated': '#1e2247',

        // Warm accent
        'accent-gold': '#d4a574',
        'accent-warm': '#c49a6c',

        // Text colors with proper contrast ratios
        'text-primary': '#f8f8f8',      // ~17:1 contrast
        'text-secondary': '#d4d4d4',    // ~12:1 contrast
        'text-muted': '#9a9a9a',        // ~6:1 contrast (AA compliant)
        'text-subtle': '#6a6a6a',       // ~3.5:1 (for decorative only)

        // Borders
        'border-subtle': 'rgba(255,255,255,0.08)',
        'border-medium': 'rgba(255,255,255,0.12)',
      },

      // Typography scale optimized for readability
      fontSize: {
        // Small UI text
        'xs': ['12px', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'sm': ['14px', { lineHeight: '1.5', letterSpacing: '0.005em' }],

        // Body text - larger for readability
        'base': ['17px', { lineHeight: '1.6', letterSpacing: '0' }],
        'lg': ['18px', { lineHeight: '1.6', letterSpacing: '-0.005em' }],

        // Headings - tighter line heights
        'xl': ['20px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        '2xl': ['24px', { lineHeight: '1.35', letterSpacing: '-0.015em' }],
        '3xl': ['30px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '4xl': ['36px', { lineHeight: '1.2', letterSpacing: '-0.025em' }],
        '5xl': ['48px', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
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

      // Max width for optimal line length (50-75 chars)
      maxWidth: {
        'prose': '65ch',
        'prose-narrow': '50ch',
        'prose-wide': '75ch',
      },

      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        display: [
          'Playfair Display',
          'Georgia',
          'serif',
        ],
      },

      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
      },

      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },

      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
};
