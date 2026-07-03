/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Warm "terracotta cream" palette — see docs/adr / design handoff.
      colors: {
        cream: '#FBF3EA', // app background
        surface: '#FFFBF6', // cards, sheets
        ink: '#3A2E27', // primary text
        inkSoft: '#9A8979', // secondary text
        ring: '#C8674F', // dial ring / accents
        faint: '#DCCBB8', // borders / hairlines
        day: '#F5D4A0', // warm wash behind the PM (outer) clock track
        night: '#BEB0C8', // cool wash behind the AM (inner) clock track
        // per-event-type accents
        feed: '#E29A3C',
        nappy: '#DD7E68',
        meds: '#C25A40',
        weight: '#7C9885', // sage — distinct, signals growth (not in the 3-up mockup)
        sleep: '#8C7BA0', // mauve — calm night tone for sleep arcs / button
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        sheet: '26px',
      },
    },
  },
  plugins: [],
}
