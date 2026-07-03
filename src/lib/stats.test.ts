import { describe, it, expect } from 'vitest'
import {
  getLastEventOfType,
  listEventsForDay,
  getDailyTotals,
  getRunningSleep,
  isFlaggedSleep,
  sleepMinutesForDay,
  formatSleepDuration,
  fmtElapsed,
} from './stats'
import type { BabyEvent, SleepEvent } from '../db/schema'

const events: BabyEvent[] = [
  { id: 1, type: 'feed', volumeMl: 120, occurredAt: '2026-06-09T08:00:00.000Z', createdAt: '2026-06-09T08:00:00.000Z' },
  { id: 2, type: 'feed', volumeMl: 100, occurredAt: '2026-06-09T11:00:00.000Z', createdAt: '2026-06-09T11:00:00.000Z' },
  { id: 3, type: 'nappy', nappyType: 'wet', occurredAt: '2026-06-09T09:30:00.000Z', createdAt: '2026-06-09T09:30:00.000Z' },
  { id: 4, type: 'nappy', nappyType: 'both', size: 'medium', occurredAt: '2026-06-09T12:00:00.000Z', createdAt: '2026-06-09T12:00:00.000Z' },
  { id: 5, type: 'feed', volumeMl: 90, occurredAt: '2026-06-08T22:00:00.000Z', createdAt: '2026-06-08T22:00:00.000Z' },
]

describe('getLastEventOfType', () => {
  it('returns the most recent event of the given type', () => {
    const last = getLastEventOfType(events, 'feed')
    expect(last?.id).toBe(2)
  })
  it('returns undefined when no event of that type exists', () => {
    expect(getLastEventOfType(events, 'weight')).toBeUndefined()
  })
})

describe('listEventsForDay', () => {
  it('returns only events on the given local day, newest first', () => {
    const day = listEventsForDay(events, '2026-06-09')
    expect(day.map((e) => e.id)).toEqual([4, 2, 3, 1])
  })
})

describe('getDailyTotals', () => {
  it('aggregates feeds, nappies and doses for the day', () => {
    const totals = getDailyTotals(events, '2026-06-09')
    expect(totals.feedCount).toBe(2)
    expect(totals.feedVolumeMl).toBe(220)
    expect(totals.nappyWet).toBe(1)
    expect(totals.nappyDirty).toBe(1) // 'both' counts as a dirty
    expect(totals.doseCount).toBe(0)
  })
})

// Duration-event helpers. Tests run under TZ=UTC, so local midnight == 00:00Z.
const sleep = (over: Partial<SleepEvent> & { occurredAt: string; endedAt: string | null }): SleepEvent => ({
  id: 100,
  type: 'sleep',
  createdAt: over.occurredAt,
  ...over,
})

describe('sleepMinutesForDay', () => {
  it('clips an overnight 7pm→7am sleep to ~5h on the start day and ~7h on the next', () => {
    const overnight = [sleep({ occurredAt: '2026-06-09T19:00:00.000Z', endedAt: '2026-06-10T07:00:00.000Z' })]
    const now = new Date('2026-06-10T09:00:00.000Z')
    expect(sleepMinutesForDay(overnight, '2026-06-09', now)).toBe(300) // 5h
    expect(sleepMinutesForDay(overnight, '2026-06-10', now)).toBe(420) // 7h
  })

  it('counts a running sleep up to now', () => {
    const running = [sleep({ occurredAt: '2026-06-09T13:00:00.000Z', endedAt: null })]
    expect(sleepMinutesForDay(running, '2026-06-09', new Date('2026-06-09T15:00:00.000Z'))).toBe(120)
  })

  it('excludes a running sleep flagged as forgotten (>18h)', () => {
    const stale = [sleep({ occurredAt: '2026-06-09T00:00:00.000Z', endedAt: null })]
    expect(sleepMinutesForDay(stale, '2026-06-09', new Date('2026-06-09T19:00:00.000Z'))).toBe(0)
  })
})

describe('isFlaggedSleep', () => {
  it('flags a running sleep past 18h, not a shorter or finished one', () => {
    const start = '2026-06-09T00:00:00.000Z'
    expect(isFlaggedSleep(sleep({ occurredAt: start, endedAt: null }), new Date('2026-06-09T19:00:00.000Z'))).toBe(true)
    expect(isFlaggedSleep(sleep({ occurredAt: start, endedAt: null }), new Date('2026-06-09T10:00:00.000Z'))).toBe(false)
    expect(
      isFlaggedSleep(sleep({ occurredAt: start, endedAt: '2026-06-10T02:00:00.000Z' }), new Date('2026-06-10T03:00:00.000Z')),
    ).toBe(false)
  })
})

describe('getRunningSleep', () => {
  it('returns the earliest-started open sleep, ignoring finished ones', () => {
    const list: BabyEvent[] = [
      sleep({ id: 1, occurredAt: '2026-06-09T14:00:00.000Z', endedAt: null }),
      sleep({ id: 2, occurredAt: '2026-06-09T10:00:00.000Z', endedAt: null }),
      sleep({ id: 3, occurredAt: '2026-06-09T08:00:00.000Z', endedAt: '2026-06-09T09:00:00.000Z' }),
    ]
    expect(getRunningSleep(list)?.id).toBe(2)
  })
  it('returns undefined when nothing is open', () => {
    expect(getRunningSleep(events)).toBeUndefined()
  })
})

describe('listEventsForDay with sleeps', () => {
  it('shows an overnight sleep on both the day it started and the day it ended', () => {
    const overnight = sleep({ id: 9, occurredAt: '2026-06-09T22:00:00.000Z', endedAt: '2026-06-10T07:00:00.000Z' })
    const list = [...events, overnight]
    expect(listEventsForDay(list, '2026-06-09').map((e) => e.id)).toContain(9)
    expect(listEventsForDay(list, '2026-06-10').map((e) => e.id)).toContain(9)
  })
})

describe('formatSleepDuration', () => {
  it.each([
    [0, '0m'],
    [45, '45m'],
    [60, '1h'],
    [75, '1h 15m'],
    [125, '2h 5m'],
  ])('formats %i min as %s', (mins, want) => {
    expect(formatSleepDuration(mins)).toBe(want)
  })
})

describe('fmtElapsed', () => {
  it.each([
    [5_000, '0:05'],
    [65_000, '1:05'],
    [3_661_000, '1:01:01'],
  ])('formats %i ms as %s', (ms, want) => {
    expect(fmtElapsed(ms)).toBe(want)
  })
})
