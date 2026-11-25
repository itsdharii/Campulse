/** Crew Sync warm "parchment" theme, taken from the running Streamlit app. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F8F5EE',
        side: '#FBF8F1',
        card: '#FFFFFF',
        line: '#DDD7C9',
        chip: '#EBE4D6',
        ink: '#1E130E',
        muted: '#725F54',
        brand: { DEFAULT: '#7F4413', dark: '#592D08', deeper: '#6B390F' },
        gold: { DEFAULT: '#D9A514', light: '#E8B923' },
        ok: '#4E7F58',
        warn: '#A66A16',
        bad: '#D40924',
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: { card: '0 6px 20px rgba(89,45,8,.07)', pop: '0 18px 50px rgba(89,45,8,.22)' },
      keyframes: {
        up: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        dot: { '0%,80%,100%': { opacity: 0.25, transform: 'scale(.8)' }, '40%': { opacity: 1, transform: 'scale(1)' } },
      },
      animation: { up: 'up .25s ease-out both', dot: 'dot 1.2s infinite ease-in-out' },
    },
  },
  plugins: [],
}
