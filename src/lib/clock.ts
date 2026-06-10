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
