/** @type {import('tailwindcss').Config} */
const color = (name) => `hsl(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: color('border'),
        input: color('border'),
        ring: color('primary'),
        background: color('background'),
        foreground: color('foreground'),
        primary: { DEFAULT: color('primary'), foreground: color('primary-foreground') },
        secondary: { DEFAULT: color('secondary'), foreground: color('secondary-foreground') },
        muted: { DEFAULT: color('muted'), foreground: color('muted-foreground') },
        card: { DEFAULT: color('card'), foreground: color('card-foreground') },
        up: color('up'),
        down: color('down'),
      },
    },
  },
  plugins: [],
}
