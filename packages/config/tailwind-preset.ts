import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { 0: '#0A0A0A', 1: '#111113', 2: '#18181B', 3: '#27272A' },
        edge: { cyan: '#22D3EE', amber: '#F59E0B', green: '#22C55E', red: '#EF4444' },
        mute: { 1: '#A1A1AA', 2: '#71717A' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 30px 120px -30px rgba(34,211,238,0.35)',
        rim: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.25rem' },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.92)' },
        },
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
        rise: 'rise 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};

export default preset;
