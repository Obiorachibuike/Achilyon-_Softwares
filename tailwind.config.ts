import type { Config } from 'tailwindcss'

const color = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: color('bg'),
        'bg-2': color('bg-2'),
        card: color('card'),
        elevated: color('elevated'),
        line: 'rgba(255,255,255,0.08)',
        'line-strong': 'rgba(255,255,255,0.14)',
        primary: { DEFAULT: color('primary'), deep: color('primary-deep') },
        gold: color('gold'),
        up: color('up'),
        down: color('down'),
        warn: color('warn'),
        fg: color('fg'),
        muted: color('muted'),
        subtle: color('subtle'),
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      keyframes: {
        'flash-up': { '0%': { backgroundColor: 'rgb(34 197 94 / .22)' }, '100%': { backgroundColor: 'transparent' } },
        'flash-down': { '0%': { backgroundColor: 'rgb(239 68 68 / .22)' }, '100%': { backgroundColor: 'transparent' } },
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { from: { opacity: '0', transform: 'scale(.98) translateY(-4px)' }, to: { opacity: '1', transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'flash-up': 'flash-up 1.2s ease-out',
        'flash-down': 'flash-down 1.2s ease-out',
        rise: 'rise .35s ease-out both',
        pop: 'pop .16s ease-out',
        marquee: 'marquee 60s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
