import type { BabyEvent } from '../db/schema'
import { getDailyTotals, nursingMinutesForDay, sleepMinutesForDay } from './stats'

const DAY_MS = 24 * 60 * 60 * 1000

/** A trailing-window option for the Trends view. `windowDays: null` ⇒ since birth. */
export type TrendWindow = { label: string; windowDays: number | null }

export const TREND_WINDOWS: TrendWindow[] = [
  { label: '7d', windowDays: 7 },
  { label: '30d', windowDays: 30 },
  { label: 'All', windowDays: null },
]

/** Local 'YYYY-MM-DD' for a Date (tests run in UTC, so UTC == local). */
function localDayString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * The last `windowDays` local calendar days ending on `now`'s day, oldest → newest.
 * Uses the Date constructor's day-overflow so month/year boundaries are handled.
 */
export function listTrendDays(now: Date, windowDays: number): string[] {
  const days: string[] = []
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    days.push(localDayString(new Date(y, m, d - i)))
  }
  return days
}

/**
 * Inclusive count of local calendar days from `dateOfBirth` to `now`'s day —
 * both endpoints counted, so a baby born today gives 1. Used to size the
 * "since birth" window.
 */
export function daysSinceBirth(dateOfBirth: string, now: Date): number {
  const [y, m, d] = dateOfBirth.split('-').map(Number)
  const birth = new Date(y, m - 1, d).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(1, Math.round((today - birth) / DAY_MS) + 1)
}

/**
 * Resolve a window to its list of days ending on `now`. A `null` windowDays
 * (since birth) spans birth → today; otherwise the trailing N days.
 */
export function listWindowDays(window: TrendWindow, dateOfBirth: string, now: Date): string[] {
  const count = window.windowDays ?? daysSinceBirth(dateOfBirth, now)
  return listTrendDays(now, count)
}

/** One day's aggregated metrics across every event type, for the Trends small-multiples. */
export interface DailyTrendPoint {
  day: string // local 'YYYY-MM-DD'
  feedCount: number
  feedVolumeMl: number
  nursingMinutes: number
  sleepMinutes: number
  nappyWet: number
  nappyDirty: number
  doseCount: number
}

/**
 * Per-day aggregation over the given days (oldest → newest). Reuses the audited
 * single-day helpers so breast feeds count toward frequency without their absent
 * volume being read (ADR-0007), and duration events are clipped per day.
 */
export function listDailyTrend(events: BabyEvent[], days: string[], now: Date): DailyTrendPoint[] {
  return days.map((day) => {
    const totals = getDailyTotals(events, day)
    return {
      day,
      feedCount: totals.feedCount,
      feedVolumeMl: totals.feedVolumeMl,
      nursingMinutes: nursingMinutesForDay(events, day, now),
      sleepMinutes: sleepMinutesForDay(events, day, now),
      nappyWet: totals.nappyWet,
      nappyDirty: totals.nappyDirty,
      doseCount: totals.doseCount,
    }
  })
}

/** Mean of a numeric series; 0 for an empty series. The Trends baseline reference. */
export function seriesMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}
