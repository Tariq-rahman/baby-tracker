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
  getRunningBreastFeed,
  isFlaggedBreastFeed,
  nursingMinutesForDay,
  getResumableDurationEvent,
} from './stats'
import type { BabyEvent, BreastFeedEvent, SleepEvent } from '../db/schema'

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

  it('counts a breast feed toward feedCount but never reads its absent volume (ADR-0007)', () => {
    const withBreast: BabyEvent[] = [
      ...events,
      breastFeed({ occurredAt: '2026-06-09T14:00:00.000Z', endedAt: '2026-06-09T14:10:00.000Z' }),
    ]
    const totals = getDailyTotals(withBreast, '2026-06-09')
    expect(totals.feedCount).toBe(3) // 2 bottles + 1 breast
    expect(totals.feedVolumeMl).toBe(220) // unchanged — no NaN from the breast feed
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

const breastFeed = (
  over: Partial<BreastFeedEvent> & { occurredAt: string; endedAt: string | null },
): BreastFeedEvent => ({
  id: 200,
  type: 'feed',
  method: 'breast',
  side: 'left',
  createdAt: over.occurredAt,
  ...over,
})

describe('nursingMinutesForDay', () => {
  it('sums finished breast feeds, clipping to the day, and ignores bottle feeds', () => {
    const list: BabyEvent[] = [
      ...events, // bottle feeds — contribute no nursing minutes
      breastFeed({ occurredAt: '2026-06-09T08:00:00.000Z', endedAt: '2026-06-09T08:12:00.000Z' }),
      breastFeed({ occurredAt: '2026-06-09T11:00:00.000Z', endedAt: '2026-06-09T11:18:00.000Z' }),
    ]
    expect(nursingMinutesForDay(list, '2026-06-09', new Date('2026-06-09T20:00:00.000Z'))).toBe(30)
  })

  it('counts a running breast feed up to now', () => {
    const running = [breastFeed({ occurredAt: '2026-06-09T13:00:00.000Z', endedAt: null })]
    expect(nursingMinutesForDay(running, '2026-06-09', new Date('2026-06-09T13:15:00.000Z'))).toBe(15)
  })

  it('excludes a running breast feed flagged as forgotten (>3h)', () => {
    const stale = [breastFeed({ occurredAt: '2026-06-09T08:00:00.000Z', endedAt: null })]
    expect(nursingMinutesForDay(stale, '2026-06-09', new Date('2026-06-09T12:00:00.000Z'))).toBe(0)
  })
})

describe('isFlaggedBreastFeed', () => {
  it('flags a running breast feed past 3h, not a shorter or finished one', () => {
    const start = '2026-06-09T08:00:00.000Z'
    expect(isFlaggedBreastFeed(breastFeed({ occurredAt: start, endedAt: null }), new Date('2026-06-09T12:00:00.000Z'))).toBe(true)
    expect(isFlaggedBreastFeed(breastFeed({ occurredAt: start, endedAt: null }), new Date('2026-06-09T09:00:00.000Z'))).toBe(false)
    expect(
      isFlaggedBreastFeed(breastFeed({ occurredAt: start, endedAt: '2026-06-09T14:00:00.000Z' }), new Date('2026-06-09T15:00:00.000Z')),
    ).toBe(false)
  })
})

describe('getRunningBreastFeed', () => {
  it('returns the earliest-started open breast feed, ignoring bottles and finished feeds', () => {
    const list: BabyEvent[] = [
      ...events, // bottle feeds — never "running"
      breastFeed({ id: 1, occurredAt: '2026-06-09T14:00:00.000Z', endedAt: null }),
      breastFeed({ id: 2, occurredAt: '2026-06-09T10:00:00.000Z', endedAt: null }),
      breastFeed({ id: 3, occurredAt: '2026-06-09T08:00:00.000Z', endedAt: '2026-06-09T08:10:00.000Z' }),
    ]
    expect(getRunningBreastFeed(list)?.id).toBe(2)
  })
  it('returns undefined when nothing is nursing', () => {
    expect(getRunningBreastFeed(events)).toBeUndefined()
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

describe('getResumableDurationEvent', () => {
  const now = new Date('2026-06-09T12:00:00.000Z')

  it('returns a sleep that ended within the window', () => {
    const list = [sleep({ id: 7, occurredAt: '2026-06-09T11:00:00.000Z', endedAt: '2026-06-09T11:58:00.000Z' })]
    expect(getResumableDurationEvent(list, 'sleep', now)?.id).toBe(7)
  })

  it('returns undefined when the latest ended sleep is older than the window', () => {
    const list = [sleep({ id: 7, occurredAt: '2026-06-09T11:00:00.000Z', endedAt: '2026-06-09T11:50:00.000Z' })]
    expect(getResumableDurationEvent(list, 'sleep', now)).toBeUndefined()
  })

  it('picks the most-recently-ended session, not the earliest', () => {
    const list = [
      sleep({ id: 1, occurredAt: '2026-06-09T09:00:00.000Z', endedAt: '2026-06-09T09:30:00.000Z' }),
      sleep({ id: 2, occurredAt: '2026-06-09T11:00:00.000Z', endedAt: '2026-06-09T11:59:00.000Z' }),
    ]
    expect(getResumableDurationEvent(list, 'sleep', now)?.id).toBe(2)
  })

  it('ignores running sessions (endedAt null)', () => {
    const list = [sleep({ id: 8, occurredAt: '2026-06-09T11:55:00.000Z', endedAt: null })]
    expect(getResumableDurationEvent(list, 'sleep', now)).toBeUndefined()
  })

  it('resumes breast feeds by kind, ignoring a recently-ended sleep', () => {
    const list: BabyEvent[] = [
      sleep({ id: 1, occurredAt: '2026-06-09T11:00:00.000Z', endedAt: '2026-06-09T11:58:00.000Z' }),
      breastFeed({ id: 2, occurredAt: '2026-06-09T11:30:00.000Z', endedAt: '2026-06-09T11:57:00.000Z' }),
    ]
    expect(getResumableDurationEvent(list, 'breast', now)?.id).toBe(2)
    expect(getResumableDurationEvent(list, 'breast', now)?.type).toBe('feed')
  })

  it('ignores a bottle feed (not a duration event) when resuming a breast feed', () => {
    const list: BabyEvent[] = [...events] // bottle feeds only
    expect(getResumableDurationEvent(list, 'breast', now)).toBeUndefined()
  })

  it('ignores an end timestamp in the future (clock skew)', () => {
    const list = [sleep({ id: 7, occurredAt: '2026-06-09T11:00:00.000Z', endedAt: '2026-06-09T12:05:00.000Z' })]
    expect(getResumableDurationEvent(list, 'sleep', now)).toBeUndefined()
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
