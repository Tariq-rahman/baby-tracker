import type { EventType } from '../db/schema'

/**
 * Warm "terracotta cream" palette exposed as raw hex for the places Tailwind's
 * static classes can't reach: SVG/canvas fills (clock markers, arcs), Recharts
 * series, and the alpha-tint idiom that concatenates an alpha suffix onto a hex
 * string (e.g. `${col}55`, `${col}1f`).
 *
 * The *source of truth* for the hex values is the CSS custom properties in
 * `index.css` (`:root` for light, `.dark` for dark). These objects hold the light
 * defaults and are refreshed from the resolved variables whenever the theme flips
 * — see `refreshPaletteFromCss`, called by the ThemeProvider. They are mutated in
 * place (never reassigned), so every module that `import`s `palette` / `eventColor`
 * keeps seeing current values without any change to its call sites.
 */
export const palette = {
  cream: '#FBF3EA', // app background
  surface: '#FFFBF6', // cards, sheets
  ink: '#3A2E27', // primary text
  inkSoft: '#9A8979', // secondary text
  ring: '#C8674F', // dial ring / accents
  faint: '#DCCBB8', // borders / hairlines
  day: '#F5D4A0', // warm wash behind the PM (outer) track
  night: '#BEB0C8', // cool wash behind the AM (inner) track
}

/** Accent colour per event type. */
export const eventColor: Record<EventType, string> = {
  feed: '#E29A3C',
  nappy: '#DD7E68',
  dose: '#C25A40',
  weight: '#7C9885',
  sleep: '#8C7BA0', // mauve — calm, night-ish; matches the AM band wash
  growth: '#6C8EA3', // dusty blue — a measurement hue, distinct from weight's sage
  note: '#B08968', // warm taupe — a neutral "jotting" hue, off to the side of the accents
}

/** Short human label per event type. */
export const eventLabel: Record<EventType, string> = {
  feed: 'Feed',
  nappy: 'Nappy',
  dose: 'Meds',
  weight: 'Weight',
  sleep: 'Sleep',
  growth: 'Growth',
  note: 'Note',
}

/** CSS custom property backing each palette key. */
const PALETTE_VARS: Record<keyof typeof palette, string> = {
  cream: '--cream',
  surface: '--surface',
  ink: '--ink',
  inkSoft: '--ink-soft',
  ring: '--ring',
  faint: '--faint',
  day: '--day',
  night: '--night',
}

/** CSS custom property backing each event accent (note `dose` reads `--meds`). */
const EVENT_VARS: Record<EventType, string> = {
  feed: '--feed',
  nappy: '--nappy',
  dose: '--meds',
  weight: '--weight',
  sleep: '--sleep',
  growth: '--growth',
  note: '--note',
}

/**
 * Re-read the resolved CSS custom properties into `palette` / `eventColor`.
 * Call after toggling the `.dark` class so runtime-drawn colours follow the theme.
 * Any variable that resolves empty (e.g. jsdom in tests, where the stylesheet is
 * not applied) is skipped, so the light defaults survive intact.
 */
export function refreshPaletteFromCss(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const cs = getComputedStyle(document.documentElement)
  for (const key of Object.keys(PALETTE_VARS) as (keyof typeof palette)[]) {
    const value = cs.getPropertyValue(PALETTE_VARS[key]).trim()
    if (value) palette[key] = value
  }
  for (const key of Object.keys(EVENT_VARS) as EventType[]) {
    const value = cs.getPropertyValue(EVENT_VARS[key]).trim()
    if (value) eventColor[key] = value
  }
}
