import type { BabyEvent, BreastSide, FeedContent, NappyType, NappySize } from '../db/schema'
import type { BabyInput, MedicationInput } from '../db/storage'

/**
 * The single demo dataset for the local visual-check loop (DX.1) — and, later,
 * the staging seed (DX.2). One source of truth so the two never drift.
 *
 * Everything is anchored to `now` (relative days), never a frozen clock: screens
 * are always populated and fresh, every insight data-sufficiency gate is
 * satisfied (a full 7-day complete-day window plus a complete "yesterday" — see
 * ADR-0006), and the numbers vary run-to-run — deliberately, so these are for
 * eyeballing, not pixel-diffing (DX plan, settled decision 4).
 */

/** Days of history to generate (must exceed the 7-day insight window). */
const HISTORY_DAYS = 10
/** Baby age in days at `now` — a ~10-week-old, a realistic sparse-but-past-cold-start point. */
const AGE_DAYS = 70

/** A local Date at `hour:min` on the day `daysAgo` before `now`'s calendar day. */
function dayAt(now: Date, daysAgo: number, hour: number, min = 0): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, min)
}

/** ISO 'YYYY-MM-DD' for the baby's date of birth. */
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Feeds at a steady ~3h daytime cadence — bottle and breast alternate (ADR-0007). */
const FEED_HOURS = [7, 10, 13, 16, 19, 22]
/** Rotated across days so bottle content and breast side both vary on screen. */
const CONTENTS: FeedContent[] = ['formula', 'breastmilk']
const SIDES: BreastSide[] = ['left', 'right', 'both']

export interface DevFixture {
  baby: BabyInput
  medications: MedicationInput[]
  /**
   * Build the event stream. `medicationIds` are the Dexie ids assigned to
   * `medications` (in the same order), so dose events can reference real rows.
   * Only events at or before `now` are emitted — no future-dated data.
   */
  buildEvents(now: Date, medicationIds: number[]): BabyEvent[]
}

/** The demo fixture, all timestamps relative to `now`. */
export function buildFixture(now: Date): DevFixture {
  return {
    baby: {
      name: 'Robin',
      dateOfBirth: isoDate(dayAt(now, AGE_DAYS, 0)),
      // Leave settings undefined ⇒ the default enabled event set applies.
    },
    medications: [{ name: 'Vitamin D', defaultDose: 1, unit: 'drops' }],
    buildEvents(now, medicationIds) {
      const events: BabyEvent[] = []
      const iso = (d: Date) => d.toISOString()
      const add = (e: BabyEvent) => {
        if (Date.parse(e.occurredAt) <= now.getTime()) events.push(e)
      }
      const vitaminD = medicationIds[0]

      for (let d = HISTORY_DAYS; d >= 0; d -= 1) {
        // Feeds: alternate bottle/breast so both the volume and nursing insights fire.
        FEED_HOURS.forEach((hour, i) => {
          const start = dayAt(now, d, hour)
          const createdAt = iso(start)
          if ((d + i) % 2 === 0) {
            add({
              type: 'feed',
              method: 'bottle',
              volumeMl: 90 + ((i * 15) % 60),
              content: CONTENTS[(d + i) % CONTENTS.length],
              occurredAt: iso(start),
              createdAt,
            })
          } else {
            const end = dayAt(now, d, hour, 18)
            add({
              type: 'feed',
              method: 'breast',
              side: SIDES[(d + i) % SIDES.length],
              endedAt: iso(end),
              occurredAt: iso(start),
              createdAt,
            })
          }
        })

        // Nappies: a wet, a dirty, and a mixed one across the day.
        const nappies: Array<{ hour: number; nappyType: NappyType; size?: NappySize }> = [
          { hour: 8, nappyType: 'wet' },
          { hour: 12, nappyType: 'dirty', size: 'medium' },
          { hour: 18, nappyType: 'both', size: 'large' },
        ]
        nappies.forEach(({ hour, nappyType, size }) => {
          const at = dayAt(now, d, hour, 30)
          add({ type: 'nappy', nappyType, size, occurredAt: iso(at), createdAt: iso(at) })
        })

        // Sleep: an afternoon nap (completed) each day.
        const napStart = dayAt(now, d, 13, 30)
        const napEnd = dayAt(now, d, 15, 0)
        add({ type: 'sleep', endedAt: iso(napEnd), occurredAt: iso(napStart), createdAt: iso(napStart) })

        // Dose: a morning vitamin every day.
        const doseAt = dayAt(now, d, 9, 15)
        add({
          type: 'dose',
          medicationId: vitaminD,
          doseAmount: 1,
          occurredAt: iso(doseAt),
          createdAt: iso(doseAt),
        })

        // Weight: every ~3 days, steadily climbing (grams, per ADR/CONTEXT).
        if (d % 3 === 0) {
          const at = dayAt(now, d, 10, 0)
          const grams = 4200 + (HISTORY_DAYS - d) * 30
          add({ type: 'weight', grams, occurredAt: iso(at), createdAt: iso(at) })
        }
      }

      // A just-ended sleep so "time since" and resume paths have something recent.
      const recentEnd = new Date(now.getTime() - 5 * 60_000)
      const recentStart = new Date(now.getTime() - 95 * 60_000)
      add({
        type: 'sleep',
        endedAt: iso(recentEnd),
        occurredAt: iso(recentStart),
        createdAt: iso(recentStart),
      })

      return events
    },
  }
}
