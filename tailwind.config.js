/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0a0a0a',
          lighter: '#1a1a1a',
          accent: '#2a2a2a'
        }
      }
    },
  },
  plugins: [],
}
