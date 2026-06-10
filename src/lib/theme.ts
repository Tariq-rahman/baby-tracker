import type { EventType } from '../db/schema'

/**
 * Warm "terracotta cream" palette as raw hex, mirroring tailwind.config.js.
 * Used where colours must be computed at runtime (clock markers, tinted
 * button backgrounds with alpha) and Tailwind's static classes can't reach.
 */
export const palette = {
  cream: '#FBF3EA',
  surface: '#FFFBF6',
  ink: '#3A2E27',
  inkSoft: '#9A8979',
  ring: '#C8674F',
  faint: '#DCCBB8',
} as const

/** Accent colour per event type. */
export const eventColor: Record<EventType, string> = {
  feed: '#E29A3C',
  nappy: '#DD7E68',
  dose: '#C25A40',
  weight: '#7C9885',
}

/** Short human label per event type. */
export const eventLabel: Record<EventType, string> = {
  feed: 'Feed',
  nappy: 'Nappy',
  dose: 'Meds',
  weight: 'Weight',
}
