import type { BabyEvent, EventType } from '../../db/schema'

const DAY_MS = 24 * 60 * 60 * 1000

/** Trailing-window length. Default 7 days — the baby's own baseline (ADR-0006). */
export interface WindowConfig {
  windowDays: number
}

export const DEFAULT_WINDOW: WindowConfig = { windowDays: 7 }

/**
 * The data-sufficiency gate (ADR-0006): an insight that needs history is withheld
 * until the trailing window holds at least `minDays` distinct days *and*
 * `minEvents` events of the relevant type. Below that, strategies emit
 * `insufficient-data` rather than a number derived from noise.
 */
export interface SufficiencyGate {
  minDays: number
  minEvents: number
}

type OfType<T extends EventType> = Extract<BabyEvent, { type: T }>

/** Local 'YYYY-MM-DD' of a Date (tests run in UTC, so UTC == local). */
export function localDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local 'YYYY-MM-DD' for an ISO datetime. */
function toLocalDay(iso: string): string {
  return localDay(new Date(iso))
}

/** Local midnight starting the calendar day that contains `d`. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * The most recent *complete* local day before `now` — i.e. yesterday. Insights
 * compare against this, never against today: today is still in progress, so
 * comparing a partial day to a daily average always reads artificially low.
 */
export function lastCompleteDay(now: Date): string {
  const d = startOfDay(now)
  d.setDate(d.getDate() - 1)
  return localDay(d)
}

/**
 * Events of `type` whose `occurredAt` falls in the trailing window
 * `[now - windowDays, now]`, oldest → newest.
 */
export function listEventsInWindow<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  window: WindowConfig = DEFAULT_WINDOW,
): OfType<T>[] {
  const start = now.getTime() - window.windowDays * DAY_MS
  const end = now.getTime()
  return events
    .filter((e): e is OfType<T> => e.type === type)
    .filter((e) => {
      const t = Date.parse(e.occurredAt)
      return t >= start && t <= end
    })
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

export interface Sufficiency {
  /** Distinct local days in the window holding ≥1 event of the type. */
  dayCount: number
  /** Total events of the type in the window. */
  eventCount: number
  sufficient: boolean
}

/** Assess a type's history in the window against a sufficiency gate (ADR-0006). */
export function assessSufficiency<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  gate: SufficiencyGate,
  window: WindowConfig = DEFAULT_WINDOW,
): Sufficiency {
  const inWindow = listEventsInWindow(events, type, now, window)
  const dayCount = new Set(inWindow.map((e) => toLocalDay(e.occurredAt))).size
  const eventCount = inWindow.length
  return {
    dayCount,
    eventCount,
    sufficient: dayCount >= gate.minDays && eventCount >= gate.minEvents,
  }
}

/** A number pulled from an event for aggregation (e.g. a feed's volume, or 1 to count). */
export type Metric<T extends EventType> = (event: OfType<T>) => number

/** Metric that counts events regardless of type. */
export const countMetric: Metric<EventType> = () => 1

/** Sum of a metric over all in-window events of the type. */
export function windowSum<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  metric: Metric<T>,
  window: WindowConfig = DEFAULT_WINDOW,
): number {
  return listEventsInWindow(events, type, now, window).reduce((sum, e) => sum + metric(e), 0)
}

/** Sum of a metric over events of the type occurring on a specific local day. */
export function daySum<T extends EventType>(
  events: BabyEvent[],
  type: T,
  day: string,
  metric: Metric<T>,
): number {
  return events
    .filter((e): e is OfType<T> => e.type === type)
    .filter((e) => toLocalDay(e.occurredAt) === day)
    .reduce((sum, e) => sum + metric(e), 0)
}

/** Sum of a metric over events of the type occurring on `now`'s local calendar day. */
export function todaySum<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  metric: Metric<T>,
): number {
  return daySum(events, type, localDay(now), metric)
}

/** [start, end) ms bounds of the `windowDays` *complete* days ending yesterday. */
function completeWindowBounds(now: Date, window: WindowConfig): [number, number] {
  const end = startOfDay(now).getTime() // today's midnight — excludes the in-progress day
  return [end - window.windowDays * DAY_MS, end]
}

/**
 * The baby's own daily baseline over *complete* days only (today excluded), as
 * `sum(metric) / windowDays`. Honest only once history spans the window — a day
 * before tracking began would otherwise count as a phantom 0 and drag the mean
 * down; `assessCompleteCoverage` gates on that (ADR-0006).
 */
export function completeDayBaseline<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  metric: Metric<T>,
  window: WindowConfig = DEFAULT_WINDOW,
): number {
  const [start, end] = completeWindowBounds(now, window)
  const sum = events
    .filter((e): e is OfType<T> => e.type === type)
    .filter((e) => {
      const t = Date.parse(e.occurredAt)
      return t >= start && t < end
    })
    .reduce((acc, e) => acc + metric(e), 0)
  return sum / window.windowDays
}

export interface CompleteCoverage {
  /** Events of the type inside the complete-day window. */
  eventCount: number
  /** Distinct complete days in the window holding ≥1 event of the type. */
  completeDays: number
  /** True once the first-ever event of the type is old enough to fill the window. */
  hasFullHistory: boolean
  sufficient: boolean
}

/**
 * Gate for a complete-day baseline (ADR-0006): withhold a comparison until the
 * baby has a *full window* of real history (so dividing by `windowDays` is honest)
 * and at least `minEvents` events in it. `minEvents` guards degenerate cases; the
 * binding constraint is `hasFullHistory` — "you've been tracking for a week".
 */
export function assessCompleteCoverage<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  minEvents: number,
  window: WindowConfig = DEFAULT_WINDOW,
): CompleteCoverage {
  const [start, end] = completeWindowBounds(now, window)
  const ofType = events.filter((e): e is OfType<T> => e.type === type)
  const inWindow = ofType.filter((e) => {
    const t = Date.parse(e.occurredAt)
    return t >= start && t < end
  })
  const firstMs = ofType.reduce((min, e) => Math.min(min, Date.parse(e.occurredAt)), Infinity)
  const eventCount = inWindow.length
  const hasFullHistory = firstMs <= start
  return {
    eventCount,
    completeDays: new Set(inWindow.map((e) => toLocalDay(e.occurredAt))).size,
    hasFullHistory,
    sufficient: hasFullHistory && eventCount >= minEvents,
  }
}

/** Which side of the baseline a value falls on, given a relative tolerance band. */
export type Direction = 'below' | 'above' | 'about the same as'

/**
 * Compare `today` against `baseline` within a ±`tolerance` band (0.1 ⇒ ±10%).
 * Returns a plain comparative fact-word (ADR-0005) — never a judgment word.
 * A non-positive baseline collapses to "about the same as" (nothing to compare).
 */
export function compareDirection(today: number, baseline: number, tolerance: number): Direction {
  if (baseline <= 0) return 'about the same as'
  const ratio = (today - baseline) / baseline
  if (ratio > tolerance) return 'above'
  if (ratio < -tolerance) return 'below'
  return 'about the same as'
}

/**
 * The baby's own daily baseline: mean per calendar day of a metric across the
 * window (`sum / windowDays`). A day with no events counts as 0, so this is the
 * true daily rate — honest once the sufficiency gate has passed. Never a
 * population norm (ADR-0006).
 */
export function dailyBaseline<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  metric: Metric<T>,
  window: WindowConfig = DEFAULT_WINDOW,
): number {
  return windowSum(events, type, now, metric, window) / window.windowDays
}

/** Gaps in ms between consecutive in-window events of the type, oldest → newest. */
export function listIntervalsMs<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  window: WindowConfig = DEFAULT_WINDOW,
): number[] {
  const times = listEventsInWindow(events, type, now, window).map((e) => Date.parse(e.occurredAt))
  const gaps: number[] = []
  for (let i = 1; i < times.length; i += 1) gaps.push(times[i] - times[i - 1])
  return gaps
}

export interface IntervalStats {
  count: number
  /** Mean interval, ms. NaN when there are no intervals. */
  meanMs: number
  /** Sample standard deviation (n-1), ms. NaN when fewer than 2 intervals. */
  stdDevMs: number
  /** Coefficient of variation = stdDev/mean; lower ⇒ more regular. NaN when undefined. */
  cv: number
}

/** Mean, sample std-dev and coefficient of variation of a set of intervals. */
export function intervalStats(intervals: number[]): IntervalStats {
  const count = intervals.length
  if (count === 0) return { count, meanMs: NaN, stdDevMs: NaN, cv: NaN }
  const meanMs = intervals.reduce((sum, x) => sum + x, 0) / count
  if (count < 2) return { count, meanMs, stdDevMs: NaN, cv: NaN }
  const variance = intervals.reduce((sum, x) => sum + (x - meanMs) ** 2, 0) / (count - 1)
  const stdDevMs = Math.sqrt(variance)
  return { count, meanMs, stdDevMs, cv: meanMs === 0 ? NaN : stdDevMs / meanMs }
}

/**
 * Map interval regularity (coefficient of variation) to a 0..1 confidence:
 * cv 0 ⇒ 1, cv ≥ `maxCv` ⇒ 0, linear between. A non-finite cv ⇒ 0 (we can't be
 * confident about a single or absent interval).
 */
export function confidenceFromCv(cv: number, maxCv: number): number {
  if (!Number.isFinite(cv) || maxCv <= 0) return 0
  return Math.max(0, Math.min(1, 1 - cv / maxCv))
}

export interface PredictionConfig {
  /** Trailing window for interval sampling. Defaults to DEFAULT_WINDOW. */
  window?: WindowConfig
  /** Minimum number of intervals (i.e. events − 1) before a prediction is attempted. */
  minIntervals: number
  /** cv at/above which confidence hits 0. Higher ⇒ more tolerant of irregularity. */
  maxCv: number
  /** Suppress the prediction below this confidence (honest silence over a wrong guess). */
  minConfidence: number
}

export interface Prediction {
  at: Date
  confidence: number
}

/**
 * Predict the next occurrence of `type` as (last event + mean interval), but only
 * when recent intervals are regular enough to clear `minConfidence`; otherwise
 * returns null — suppress rather than guess (ADR-0006).
 */
export function predictNext<T extends EventType>(
  events: BabyEvent[],
  type: T,
  now: Date,
  config: PredictionConfig,
): Prediction | null {
  const window = config.window ?? DEFAULT_WINDOW
  const inWindow = listEventsInWindow(events, type, now, window)
  const intervals = listIntervalsMs(events, type, now, window)
  if (intervals.length < config.minIntervals) return null
  const { meanMs, cv } = intervalStats(intervals)
  const confidence = confidenceFromCv(cv, config.maxCv)
  if (confidence < config.minConfidence) return null
  const last = inWindow[inWindow.length - 1]
  return { at: new Date(Date.parse(last.occurredAt) + meanMs), confidence }
}
