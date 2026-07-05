/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Warm "terracotta cream" palette. Values live as CSS custom properties in
      // src/index.css (:root light / .dark dark) so light + dark flip together;
      // see docs/adr / design handoff.
      colors: {
        cream: 'var(--cream)', // app background
        surface: 'var(--surface)', // cards, sheets
        ink: 'var(--ink)', // primary text
        inkSoft: 'var(--ink-soft)', // secondary text
        ring: 'var(--ring)', // dial ring / accents
        faint: 'var(--faint)', // borders / hairlines
        day: 'var(--day)', // warm wash behind the PM (outer) clock track
        night: 'var(--night)', // cool wash behind the AM (inner) clock track
        // per-event-type accents
        feed: 'var(--feed)',
        nappy: 'var(--nappy)',
        meds: 'var(--meds)',
        weight: 'var(--weight)', // sage — distinct, signals growth
        sleep: 'var(--sleep)', // mauve — calm night tone for sleep arcs / button
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
