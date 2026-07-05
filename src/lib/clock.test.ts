import { describe, it, expect } from 'vitest'
import { polar, eventAngle, bandRadius, sleepArcSegments } from './clock'

describe('eventAngle', () => {
  it.each([
    ['2026-06-09T00:00:00.000Z', 0], // 12 -> top
    ['2026-06-09T03:00:00.000Z', 90], // 3 o'clock
    ['2026-06-09T06:00:00.000Z', 180], // 6 o'clock
    ['2026-06-09T09:00:00.000Z', 270], // 9 o'clock
    ['2026-06-09T15:00:00.000Z', 90], // 3pm folds onto 3 o'clock
    ['2026-06-09T01:30:00.000Z', 45], // 1:30 -> 45deg
  ])('maps %s to %s degrees', (iso, deg) => {
    expect(eventAngle(new Date(iso))).toBeCloseTo(deg, 5)
  })
})

describe('bandRadius', () => {
  const innerR = 74
  const outerR = 118
  it.each([
    ['2026-06-09T00:00:00.000Z', innerR], // midnight -> AM inner
    ['2026-06-09T09:30:00.000Z', innerR], // morning -> AM inner
    ['2026-06-09T11:59:00.000Z', innerR], // just before noon -> AM inner
    ['2026-06-09T12:00:00.000Z', outerR], // noon -> PM outer
    ['2026-06-09T15:20:00.000Z', outerR], // afternoon -> PM outer
    ['2026-06-09T23:00:00.000Z', outerR], // late evening -> PM outer
  ])('puts %s on radius %s', (iso, want) => {
    expect(bandRadius(new Date(iso), innerR, outerR)).toBe(want)
  })
})

describe('sleepArcSegments', () => {
  // Tests run under TZ=UTC (see repo test setup), so the Z hour == local getHours().
  const d = (iso: string) => new Date(iso)

  it('same-band afternoon nap → one PM segment', () => {
    const segs = sleepArcSegments(
      d('2026-06-09T13:00:00Z'),
      d('2026-06-09T14:00:00Z'),
      d('2026-06-09T15:00:00Z'),
    )
    expect(segs).toEqual([{ track: 'pm', deg1: 30, deg2: 60 }])
  })

  it('crossing noon → an AM piece to 360 and a PM piece from 0', () => {
    const segs = sleepArcSegments(
      d('2026-06-09T10:00:00Z'),
      d('2026-06-09T14:00:00Z'),
      d('2026-06-09T15:00:00Z'),
    )
    expect(segs).toEqual([
      { track: 'am', deg1: 300, deg2: 360 },
      { track: 'pm', deg1: 0, deg2: 60 },
    ])
  })

  it('overnight sleep is clipped at midnight → only the morning (AM/inner) piece', () => {
    // Started yesterday 22:00, ended 07:00 today. The pre-midnight evening portion
    // is not part of today, so it must not appear on the PM ring — only 00:00→07:00.
    const segs = sleepArcSegments(
      d('2026-06-09T22:00:00Z'),
      d('2026-06-10T07:00:00Z'),
      d('2026-06-10T08:00:00Z'),
    )
    expect(segs).toEqual([{ track: 'am', deg1: 0, deg2: 210 }])
  })

  it('running sleep uses end = now', () => {
    const segs = sleepArcSegments(
      d('2026-06-09T13:00:00Z'),
      d('2026-06-09T15:00:00Z'), // end passed as now for a running sleep
      d('2026-06-09T15:00:00Z'),
    )
    expect(segs).toEqual([{ track: 'pm', deg1: 30, deg2: 90 }])
  })

  it('clips to the start of the current day and never exceeds a full band (360°)', () => {
    // Long sleep starting yesterday; only today (from midnight) is visible. The
    // whole AM band fills to 360°, then a short PM piece from noon to now (13:00).
    const segs = sleepArcSegments(
      d('2026-06-09T06:00:00Z'),
      d('2026-06-10T13:00:00Z'),
      d('2026-06-10T13:00:00Z'),
    )
    expect(segs).toEqual([
      { track: 'am', deg1: 0, deg2: 360 },
      { track: 'pm', deg1: 0, deg2: 30 },
    ])
    for (const s of segs) expect(s.deg2).toBeLessThanOrEqual(360)
  })

  it('returns [] for a sleep entirely before today', () => {
    const segs = sleepArcSegments(
      d('2026-06-08T02:00:00Z'), // yesterday
      d('2026-06-08T06:00:00Z'), // yesterday
      d('2026-06-09T08:00:00Z'),
    )
    expect(segs).toEqual([])
  })
})

describe('polar', () => {
  it('places 0deg directly above the centre', () => {
    const p = polar(100, 100, 50, 0)
    expect(p.x).toBeCloseTo(100, 5)
    expect(p.y).toBeCloseTo(50, 5)
  })
  it('places 90deg to the right of the centre', () => {
    const p = polar(100, 100, 50, 90)
    expect(p.x).toBeCloseTo(150, 5)
    expect(p.y).toBeCloseTo(100, 5)
  })
  it('places 180deg directly below the centre', () => {
    const p = polar(100, 100, 50, 180)
    expect(p.x).toBeCloseTo(100, 5)
    expect(p.y).toBeCloseTo(150, 5)
  })
})
