import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ko-orange': '#FF4D00',
        'ko-black': '#000000',
        'ko-white': '#FFFFFF',
      },
      fontFamily: {
        archivo: ['var(--font-archivo)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      letterSpacing: {
        tight4: '-0.04em',
        tight2: '-0.02em',
      },
      lineHeight: {
        brutalist: '0.88',
      },
    },
  },
  plugins: [],
}
export default config
