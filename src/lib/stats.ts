import type { BabyEvent, EventType, SleepEvent } from '../db/schema'

/** A running sleep past this elapsed is assumed forgotten: flagged, excluded from totals. */
export const SLEEP_FLAG_MS = 18 * 60 * 60 * 1000

export function getLastEventOfType<T extends EventType>(
  events: BabyEvent[],
  type: T,
): Extract<BabyEvent, { type: T }> | undefined {
  return events
    .filter((e): e is Extract<BabyEvent, { type: T }> => e.type === type)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
}

/** Local-midnight bounds [start, end) in epoch-ms for a 'YYYY-MM-DD' day. */
function dayBounds(day: string): [number, number] {
  const [y, m, d] = day.split('-').map(Number)
  return [new Date(y, m - 1, d, 0, 0, 0, 0).getTime(), new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime()]
}

/** Does a sleep's interval overlap the given day? A running sleep (endedAt null) has no end yet. */
function sleepOverlapsDay(e: SleepEvent, day: string): boolean {
  const [start, end] = dayBounds(day)
  const s = Date.parse(e.occurredAt)
  const t = e.endedAt != null ? Date.parse(e.endedAt) : Infinity
  return s < end && t > start
}

/**
 * day is a local 'YYYY-MM-DD'. Instant events match when their local date equals
 * it; a sleep (a duration) matches any day its interval overlaps, so an overnight
 * sleep appears on both the day it started and the day it ended.
 */
export function listEventsForDay(events: BabyEvent[], day: string): BabyEvent[] {
  return events
    .filter((e) => (e.type === 'sleep' ? sleepOverlapsDay(e, day) : toLocalDay(e.occurredAt) === day))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

/** The single running sleep (earliest-started, if a sync race left more than one). */
export function getRunningSleep(events: BabyEvent[]): SleepEvent | undefined {
  return events
    .filter((e): e is SleepEvent => e.type === 'sleep' && e.endedAt == null)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0]
}

/** A running sleep whose elapsed exceeds the cap — flagged and excluded from totals. */
export function isFlaggedSleep(sleep: SleepEvent, now: Date): boolean {
  return sleep.endedAt == null && now.getTime() - Date.parse(sleep.occurredAt) > SLEEP_FLAG_MS
}

/**
 * Total sleep minutes attributable to a day: each sleep's overlap with the day is
 * clipped to [dayStart, dayEnd), so a 7pm→7am sleep gives ~5h to the start day and
 * ~7h to the next. A running sleep counts up to `now`, unless flagged (>18h).
 */
export function sleepMinutesForDay(events: BabyEvent[], day: string, now: Date): number {
  const [start, end] = dayBounds(day)
  let mins = 0
  for (const e of events) {
    if (e.type !== 'sleep') continue
    if (isFlaggedSleep(e, now)) continue
    const s = Date.parse(e.occurredAt)
    const t = e.endedAt != null ? Date.parse(e.endedAt) : now.getTime()
    const overlap = Math.min(t, end) - Math.max(s, start)
    if (overlap > 0) mins += overlap / 60000
  }
  return Math.round(mins)
}

/** Compact sleep duration: '45m', '1h', '1h 15m'. */
export function formatSleepDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h === 0) return `${mm}m`
  if (mm === 0) return `${h}h`
  return `${h}h ${mm}m`
}

/** Live running timer from elapsed ms: 'm:ss' under an hour, 'h:mm:ss' beyond. */
export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export interface DailyTotals {
  feedCount: number
  feedVolumeMl: number
  nappyWet: number
  nappyDirty: number
  doseCount: number
}

export function getDailyTotals(events: BabyEvent[], day: string): DailyTotals {
  const dayEvents = listEventsForDay(events, day)
  const totals: DailyTotals = {
    feedCount: 0,
    feedVolumeMl: 0,
    nappyWet: 0,
    nappyDirty: 0,
    doseCount: 0,
  }
  for (const e of dayEvents) {
    if (e.type === 'feed') {
      totals.feedCount += 1
      totals.feedVolumeMl += e.volumeMl
    } else if (e.type === 'nappy') {
      if (e.nappyType === 'wet') totals.nappyWet += 1
      if (e.nappyType === 'dirty' || e.nappyType === 'both') totals.nappyDirty += 1
    } else if (e.type === 'dose') {
      totals.doseCount += 1
    }
  }
  return totals
}

function toLocalDay(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
