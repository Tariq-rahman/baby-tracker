// Pure geometry for the 12-hour dial. No React, no DOM — trivially testable.

export interface Point {
  x: number
  y: number
}

/** Point on a circle of radius `r` around (cx, cy), `deg` clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const t = (deg * Math.PI) / 180
  return { x: cx + r * Math.sin(t), y: cy - r * Math.cos(t) }
}

/** Angle (degrees clockwise from 12) for the hour+minute of a date, folding 24h onto 12h. */
export function eventAngle(date: Date): number {
  const h = date.getHours() % 12
  const m = date.getMinutes()
  return (h + m / 60) * 30
}

/**
 * Which track a time sits on: the AM (inner) band before noon, the PM (outer)
 * band from noon on. Used for both event markers and the now-hand so a 6am and
 * a 6pm reading are visually separated.
 */
export function bandRadius(date: Date, innerR: number, outerR: number): number {
  return date.getHours() >= 12 ? outerR : innerR
}

/**
 * SVG path for a circular arc on radius `r` around (cx, cy), from `deg1` to `deg2`
 * (clockwise from 12). A near-full sweep is nudged just under 360° so the two
 * endpoints don't coincide (which would render nothing).
 */
export function arcPath(cx: number, cy: number, r: number, deg1: number, deg2: number): string {
  const d2 = deg2 - deg1 >= 359.999 ? deg1 + 359.9 : deg2
  const p1 = polar(cx, cy, r, deg1)
  const p2 = polar(cx, cy, r, d2)
  const largeArc = d2 - deg1 > 180 ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`
}

/** How long the clock looks back for arcs: sleeps overlapping the last 24h. */
export const ARC_WINDOW_MS = 24 * 60 * 60 * 1000

/** One clock-arc piece: a stretch of sleep lying entirely within one 12h band. */
export interface SleepArcSegment {
  track: 'am' | 'pm'
  /** Clockwise-from-12 angles; deg1 < deg2, both in [0, 360]. */
  deg1: number
  deg2: number
}

/** Which band a time falls in — AM before noon, PM from noon. */
function bandOf(d: Date): 'am' | 'pm' {
  return d.getHours() >= 12 ? 'pm' : 'am'
}

/** Start-of-band instant (local midnight for AM, local noon for PM) for `d`. */
function bandStart(d: Date, band: 'am' | 'pm'): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), band === 'pm' ? 12 : 0, 0, 0, 0)
}

/**
 * Split a sleep interval [start, end] into per-band arc segments for the dial.
 * `end` is the caller's chosen end (pass `now` for a running sleep). The interval
 * is first clipped to the render window [now − 24h, now]; the visible remainder
 * is cut at every local noon/midnight crossing so each piece lies in exactly one
 * band. Angles are measured clockwise from 12 within that band, so a piece that
 * runs to the boundary reads as 360° (a full band) rather than folding back to 0.
 * A piece that would exceed one band is clamped to 360° defensively.
 * Returns [] when the sleep does not overlap the window.
 */
export function sleepArcSegments(start: Date, end: Date, now: Date): SleepArcSegment[] {
  const windowStart = now.getTime() - ARC_WINDOW_MS
  let s = Math.max(start.getTime(), windowStart)
  const e = Math.min(end.getTime(), now.getTime())
  if (s >= e) return []

  const segments: SleepArcSegment[] = []
  // At most one piece per band boundary crossed in 24h → ≤ ~3 pieces; cap defensively.
  for (let guard = 0; guard < 8 && s < e; guard++) {
    const cursor = new Date(s)
    const band = bandOf(cursor)
    const start0 = bandStart(cursor, band)
    // Next boundary: noon of this day for an AM cursor, midnight next day for PM.
    const boundary =
      band === 'am'
        ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 12, 0, 0, 0)
        : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, 0, 0, 0, 0)
    const segEnd = Math.min(boundary.getTime(), e)

    const deg1 = (s - start0.getTime()) / 60000 / 2
    const deg2 = Math.min((segEnd - start0.getTime()) / 60000 / 2, 360)
    if (deg2 > deg1) segments.push({ track: band, deg1, deg2 })

    s = segEnd
  }
  return segments
}
