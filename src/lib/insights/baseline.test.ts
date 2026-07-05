import { describe, it, expect } from 'vitest'
import type { BabyEvent } from '../../db/schema'
import {
  listEventsInWindow,
  assessSufficiency,
  windowSum,
  dailyBaseline,
  countMetric,
  listIntervalsMs,
  intervalStats,
  confidenceFromCv,
  predictNext,
  todaySum,
  daySum,
  lastCompleteDay,
  completeDayBaseline,
  assessCompleteCoverage,
  compareDirection,
  localDay,
  type WindowConfig,
} from './baseline'

const HOUR = 60 * 60 * 1000

// Tests run under TZ=UTC (see npm test), so local day == UTC day.
const NOW = new Date('2026-07-08T12:00:00.000Z')
const WEEK: WindowConfig = { windowDays: 7 }

/** A feed at a given ISO time with the given volume. */
const feed = (occurredAt: string, volumeMl = 100): BabyEvent => ({
  type: 'feed',
  volumeMl,
  occurredAt,
  createdAt: occurredAt,
})

/** `hoursAgo` before NOW, as an ISO string. */
const ago = (hours: number): string => new Date(NOW.getTime() - hours * HOUR).toISOString()

describe('listEventsInWindow', () => {
  it('keeps only events of the type inside [now - windowDays, now], oldest first', () => {
    const events: BabyEvent[] = [
      feed(ago(6 * 24), 10), // just inside the 7-day window
      feed(ago(8 * 24), 20), // outside — older than 7 days
      feed(ago(1), 30), // inside, most recent
      { type: 'nappy', nappyType: 'wet', occurredAt: ago(2), createdAt: ago(2) }, // wrong type
    ]
    const inWindow = listEventsInWindow(events, 'feed', NOW, WEEK)
    expect(inWindow.map((e) => (e.method === 'breast' ? 0 : e.volumeMl))).toEqual([10, 30])
  })

  it('includes an event exactly at the window start and excludes future events', () => {
    const events: BabyEvent[] = [feed(ago(7 * 24)), feed(new Date(NOW.getTime() + HOUR).toISOString())]
    const inWindow = listEventsInWindow(events, 'feed', NOW, WEEK)
    expect(inWindow).toHaveLength(1)
  })
})

describe('assessSufficiency', () => {
  const gate = { minDays: 3, minEvents: 5 }
  const cases: { name: string; events: BabyEvent[]; wantSufficient: boolean; wantDays: number }[] = [
    { name: 'cold start — no events', events: [], wantSufficient: false, wantDays: 0 },
    {
      name: 'enough events but too few distinct days',
      events: [feed(ago(1)), feed(ago(2)), feed(ago(3)), feed(ago(4)), feed(ago(5))],
      wantSufficient: false,
      wantDays: 1,
    },
    {
      name: 'enough days but too few events',
      events: [feed(ago(1)), feed(ago(25)), feed(ago(49))],
      wantSufficient: false,
      wantDays: 3,
    },
    {
      name: 'meets both thresholds',
      events: [feed(ago(1)), feed(ago(2)), feed(ago(25)), feed(ago(26)), feed(ago(49))],
      wantSufficient: true,
      wantDays: 3,
    },
  ]
  for (const c of cases) {
    it(c.name, () => {
      const result = assessSufficiency(c.events, 'feed', NOW, gate, WEEK)
      expect(result.sufficient).toBe(c.wantSufficient)
      expect(result.dayCount).toBe(c.wantDays)
    })
  }
})

describe('windowSum & dailyBaseline', () => {
  const events: BabyEvent[] = [feed(ago(1), 100), feed(ago(2), 120), feed(ago(25), 80)]

  it('sums a metric across the window', () => {
    expect(windowSum(events, 'feed', NOW, (e) => (e.method === 'breast' ? 0 : e.volumeMl), WEEK)).toBe(300)
  })

  it('counts events with countMetric', () => {
    expect(windowSum(events, 'feed', NOW, countMetric, WEEK)).toBe(3)
  })

  it('divides the window sum by calendar days for the daily baseline', () => {
    // 300ml over a 7-day window → ~42.86 ml/day (0-event days count as 0).
    expect(dailyBaseline(events, 'feed', NOW, (e) => (e.method === 'breast' ? 0 : e.volumeMl), WEEK)).toBeCloseTo(
      300 / 7,
    )
  })
})

describe('listIntervalsMs & intervalStats', () => {
  it('returns gaps between consecutive events', () => {
    const events: BabyEvent[] = [feed(ago(3)), feed(ago(2)), feed(ago(1))]
    expect(listIntervalsMs(events, 'feed', NOW, WEEK)).toEqual([HOUR, HOUR])
  })

  it('reports zero variance for perfectly regular intervals', () => {
    const stats = intervalStats([HOUR, HOUR, HOUR])
    expect(stats.count).toBe(3)
    expect(stats.meanMs).toBe(HOUR)
    expect(stats.stdDevMs).toBe(0)
    expect(stats.cv).toBe(0)
  })

  it('computes sample std-dev and cv for irregular intervals', () => {
    const stats = intervalStats([1 * HOUR, 3 * HOUR])
    expect(stats.meanMs).toBe(2 * HOUR)
    expect(stats.stdDevMs).toBeCloseTo(Math.SQRT2 * HOUR) // sample sd of {1h,3h}
    expect(stats.cv).toBeCloseTo(Math.SQRT2 / 2)
  })

  it('returns NaN spread for fewer than two intervals', () => {
    expect(intervalStats([HOUR]).cv).toBeNaN()
    expect(intervalStats([]).meanMs).toBeNaN()
  })
})

describe('confidenceFromCv', () => {
  const cases: { cv: number; maxCv: number; want: number }[] = [
    { cv: 0, maxCv: 0.5, want: 1 }, // perfectly regular → full confidence
    { cv: 0.25, maxCv: 0.5, want: 0.5 }, // halfway
    { cv: 0.7, maxCv: 0.5, want: 0 }, // beyond the ceiling → clamped to 0
    { cv: NaN, maxCv: 0.5, want: 0 }, // undefined regularity → no confidence
  ]
  for (const c of cases) {
    it(`cv ${c.cv} with maxCv ${c.maxCv} → ${c.want}`, () => {
      expect(confidenceFromCv(c.cv, c.maxCv)).toBeCloseTo(c.want)
    })
  }
})

describe('localDay & todaySum', () => {
  it('formats a Date as local YYYY-MM-DD', () => {
    expect(localDay(NOW)).toBe('2026-07-08')
  })

  it('sums a metric only over events on now\'s local day', () => {
    const events: BabyEvent[] = [
      feed(ago(1), 100), // today
      feed(ago(2), 120), // today
      feed(ago(25), 80), // yesterday — excluded
    ]
    expect(todaySum(events, 'feed', NOW, (e) => (e.method === 'breast' ? 0 : e.volumeMl))).toBe(220)
  })

  it('is zero when nothing happened today', () => {
    expect(todaySum([feed(ago(25), 80)], 'feed', NOW, countMetric)).toBe(0)
  })
})

describe('lastCompleteDay & daySum', () => {
  const vol = (e: BabyEvent) => (e.type === 'feed' && e.method !== 'breast' ? e.volumeMl : 0)

  it('returns yesterday (the last complete day before now)', () => {
    expect(lastCompleteDay(NOW)).toBe('2026-07-07')
  })

  it('sums a metric over a specific local day only', () => {
    const events: BabyEvent[] = [
      feed('2026-07-07T08:00:00.000Z', 120),
      feed('2026-07-07T20:00:00.000Z', 130),
      feed('2026-07-08T09:00:00.000Z', 999), // today — excluded
    ]
    expect(daySum(events, 'feed', '2026-07-07', vol)).toBe(250)
  })
})

describe('completeDayBaseline', () => {
  const vol = (e: BabyEvent) => (e.type === 'feed' && e.method !== 'breast' ? e.volumeMl : 0)

  it('averages complete days over the window, excluding today', () => {
    const events: BabyEvent[] = [
      feed('2026-07-01T00:00:00.000Z', 100),
      feed('2026-07-05T09:00:00.000Z', 100),
      feed('2026-07-07T09:00:00.000Z', 100),
      feed('2026-07-08T09:00:00.000Z', 999), // today — must not count
    ]
    // 300 ml over the 7 complete days [07-01, 07-08) → 300/7.
    expect(completeDayBaseline(events, 'feed', NOW, vol, WEEK)).toBeCloseTo(300 / 7)
  })
})

describe('assessCompleteCoverage', () => {
  const cases: {
    name: string
    events: BabyEvent[]
    wantSufficient: boolean
    wantFullHistory: boolean
  }[] = [
    { name: 'cold start — no events', events: [], wantSufficient: false, wantFullHistory: false },
    {
      name: 'recent events only — no full week of history',
      events: [feed('2026-07-05T09:00:00.000Z'), feed('2026-07-06T09:00:00.000Z'), feed('2026-07-07T09:00:00.000Z')],
      wantSufficient: false,
      wantFullHistory: false,
    },
    {
      name: 'full week of history but too few events',
      events: [feed('2026-07-01T00:00:00.000Z'), feed('2026-07-07T09:00:00.000Z')],
      wantSufficient: false,
      wantFullHistory: true,
    },
    {
      name: 'full history and enough events',
      events: [
        feed('2026-07-01T00:00:00.000Z'),
        feed('2026-07-02T09:00:00.000Z'),
        feed('2026-07-05T09:00:00.000Z'),
        feed('2026-07-07T08:00:00.000Z'),
        feed('2026-07-07T14:00:00.000Z'),
      ],
      wantSufficient: true,
      wantFullHistory: true,
    },
    {
      name: 'today-only events do not count toward coverage',
      events: [feed('2026-07-08T06:00:00.000Z'), feed('2026-07-08T09:00:00.000Z')],
      wantSufficient: false,
      wantFullHistory: false,
    },
  ]
  for (const c of cases) {
    it(c.name, () => {
      const result = assessCompleteCoverage(c.events, 'feed', NOW, 5, WEEK)
      expect(result.sufficient).toBe(c.wantSufficient)
      expect(result.hasFullHistory).toBe(c.wantFullHistory)
    })
  }
})

describe('compareDirection', () => {
  const cases: { name: string; today: number; baseline: number; want: string }[] = [
    { name: 'clearly above the band', today: 130, baseline: 100, want: 'above' },
    { name: 'clearly below the band', today: 70, baseline: 100, want: 'below' },
    { name: 'inside the ±10% band', today: 105, baseline: 100, want: 'about the same as' },
    { name: 'exactly on the band edge counts as same', today: 110, baseline: 100, want: 'about the same as' },
    { name: 'zero baseline collapses to same', today: 50, baseline: 0, want: 'about the same as' },
  ]
  for (const c of cases) {
    it(c.name, () => {
      expect(compareDirection(c.today, c.baseline, 0.1)).toBe(c.want)
    })
  }
})

describe('predictNext', () => {
  const config = { window: WEEK, minIntervals: 3, maxCv: 0.5, minConfidence: 0.5 }

  it('predicts last + mean interval when intervals are regular', () => {
    // Hourly feeds for the last few hours.
    const events: BabyEvent[] = [feed(ago(4)), feed(ago(3)), feed(ago(2)), feed(ago(1))]
    const prediction = predictNext(events, 'feed', NOW, config)
    expect(prediction).not.toBeNull()
    expect(prediction?.confidence).toBeCloseTo(1)
    // last feed was 1h ago, mean interval 1h → next ~now.
    expect(prediction?.at.getTime()).toBeCloseTo(NOW.getTime(), -3)
  })

  it('suppresses the prediction when intervals are too erratic', () => {
    const events: BabyEvent[] = [feed(ago(20)), feed(ago(19)), feed(ago(6)), feed(ago(1))]
    expect(predictNext(events, 'feed', NOW, config)).toBeNull()
  })

  it('suppresses the prediction when there are too few intervals', () => {
    const events: BabyEvent[] = [feed(ago(2)), feed(ago(1))] // only 1 interval, need 3
    expect(predictNext(events, 'feed', NOW, config)).toBeNull()
  })
})
