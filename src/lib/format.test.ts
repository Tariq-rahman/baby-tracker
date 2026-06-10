import { describe, it, expect } from 'vitest'
import { relativeTime, ageLabel, fmtClock } from './format'

// TZ is pinned to UTC by the test script, so local == UTC here.
const NOW = new Date('2026-06-10T12:00:00.000Z')

describe('relativeTime', () => {
  it.each([
    ['2026-06-10T11:59:40.000Z', 'just now'],
    ['2026-06-10T11:45:00.000Z', '15m ago'],
    ['2026-06-10T10:00:00.000Z', '2h ago'],
    ['2026-06-10T09:35:00.000Z', '2h 25m ago'],
  ])('formats %s as %s', (iso, expected) => {
    expect(relativeTime(iso, NOW)).toBe(expected)
  })
})

describe('ageLabel', () => {
  it.each([
    ['2026-06-09', '1 day'],
    ['2026-06-01', '9 days'],
    ['2026-05-26', '2 weeks'],
    ['2026-05-20', '3 weeks'],
    ['2026-02-09', '4 months'],
    ['2025-06-10', '12 months'],
  ])('describes a baby born %s as %s', (dob, expected) => {
    expect(ageLabel(dob, NOW)).toBe(expected)
  })
})

describe('fmtClock', () => {
  it.each([
    ['2026-06-10T15:20:00.000Z', '3:20', 'PM'],
    ['2026-06-10T00:05:00.000Z', '12:05', 'AM'],
    ['2026-06-10T12:00:00.000Z', '12:00', 'PM'],
    ['2026-06-10T09:07:00.000Z', '9:07', 'AM'],
  ])('formats %s as %s %s', (iso, time, ampm) => {
    expect(fmtClock(new Date(iso))).toEqual({ time, ampm })
  })
})
