import { describe, it, expect } from 'vitest'
import { polar, eventAngle, bandRadius } from './clock'

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
