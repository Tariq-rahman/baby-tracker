import type { BabyEvent, EventType } from '../db/schema'

export function getLastEventOfType<T extends EventType>(
  events: BabyEvent[],
  type: T,
): Extract<BabyEvent, { type: T }> | undefined {
  return events
    .filter((e): e is Extract<BabyEvent, { type: T }> => e.type === type)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
}

/** day is a local 'YYYY-MM-DD'. Matches events whose local date equals it. */
export function listEventsForDay(events: BabyEvent[], day: string): BabyEvent[] {
  return events
    .filter((e) => toLocalDay(e.occurredAt) === day)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
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
