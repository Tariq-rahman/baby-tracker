import type { BabyEvent, Medication } from '../db/schema'
import { eventColor, eventLabel } from '../lib/theme'
import { fmtClock, relativeTime } from '../lib/format'
import { gramsToKg } from '../lib/units'
import { EventIcon } from './icons'

interface Props {
  events: BabyEvent[]
  now: Date
  medications?: Medication[]
  onSelect: (event: BabyEvent) => void
  emptyText?: string
}

function describeEvent(e: BabyEvent, medications: Medication[] = []): string {
  switch (e.type) {
    case 'feed':
      return `${e.volumeMl} ml bottle${e.content ? ` · ${e.content}` : ''}`
    case 'nappy':
      return `${e.nappyType} nappy${e.size ? ` · ${e.size}` : ''}`
    case 'weight':
      return `${gramsToKg(e.grams).toFixed(3)} kg`
    case 'dose': {
      const med = medications.find((m) => m.id === e.medicationId)
      return med ? `${med.name} · ${e.doseAmount} ${med.unit}` : `Dose · ${e.doseAmount}`
    }
  }
}

/** Card of recent events, newest first, in the warm design style. */
export default function EventList({ events, now, medications, onSelect, emptyText }: Props) {
  if (events.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-inkSoft">{emptyText ?? 'No events yet.'}</p>
  }
  return (
    <div className="overflow-hidden rounded-3xl bg-surface shadow-md">
      {events.map((ev, i) => {
        const col = eventColor[ev.type]
        const c = fmtClock(new Date(ev.occurredAt))
        return (
          <button
            key={ev.id}
            onClick={() => onSelect(ev)}
            className="press flex w-full items-center gap-3 px-4 py-3 text-left"
            style={{ borderTop: i === 0 ? 'none' : '1px solid #FBF3EA' }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${col}1f` }}
            >
              <EventIcon type={ev.type} size={21} color={col} sw={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold capitalize text-ink">{eventLabel[ev.type]}</span>
              <span className="block truncate text-xs font-medium capitalize text-inkSoft">
                {describeEvent(ev, medications)}
              </span>
            </span>
            <span className="text-right">
              <span className="tnum block text-sm font-bold text-ink">
                {c.time}
                <span className="ml-0.5 text-[10px] font-semibold text-inkSoft">{c.ampm}</span>
              </span>
              <span className="block text-[11px] font-medium text-inkSoft">{relativeTime(ev.occurredAt, now)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
