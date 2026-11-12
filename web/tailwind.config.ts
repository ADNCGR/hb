import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#ffffff',
        surface: '#f6f6f7',
        'surface-2': '#efeff1',
        ink: '#0a0a0a',
        muted: '#5c5c5c',
        'muted-2': '#8e8e8e',
        line: 'rgba(0, 0, 0, 0.08)',
        'line-2': 'rgba(0, 0, 0, 0.15)',
        field: '#e6e6e8',
        'field-focus': '#a1a1a6',
        ok: { DEFAULT: '#1f7a4d', soft: '#e8f3ec' },
        wait: { DEFAULT: '#8a5a00', soft: '#fdf2dc', dot: '#f5a524' },
        bad: { DEFAULT: '#b3261e', soft: '#fbeae8', dot: '#ef4444' },
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { field: '12px', card: '18px', row: '16px' },
      transitionTimingFunction: { ds: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: { shimmer: 'shimmer 1.6s linear infinite' },
    },
  },
  plugins: [],
} satisfies Config;
