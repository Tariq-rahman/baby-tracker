import { useMemo, useState } from 'react'
import { useEvents, useMedications } from '../hooks/useEvents'
import { listEventsForDay } from '../lib/stats'
import { palette } from '../lib/theme'
import EventList from '../components/EventList'
import StatStrip from '../components/StatStrip'
import { ChevronLeft, ChevronRight } from '../components/icons'
import EventSheet from '../components/sheets/EventSheet'
import type { BabyEvent } from '../db/schema'

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function prettyDay(day: string): string {
  if (day === localToday()) return 'Today'
  return new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export default function HistoryPage() {
  const events = useEvents()
  const medications = useMedications()
  const [day, setDay] = useState(localToday())
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const now = new Date()
  const dayEvents = listEventsForDay(events, day)
  const atToday = day >= localToday()

  const counts = useMemo(() => {
    const c = { feed: 0, nappy: 0, dose: 0 }
    for (const e of dayEvents) if (e.type in c) c[e.type as keyof typeof c] += 1
    return c
  }, [dayEvents])

  const navBtn = 'press flex h-10 w-10 items-center justify-center rounded-full border border-faint bg-surface'

  return (
    <div className="px-5 pt-3">
      <div className="mb-4 flex items-center justify-between">
        <button aria-label="Previous day" className={navBtn} onClick={() => setDay(shiftDay(day, -1))}>
          <ChevronLeft size={20} color={palette.ink} />
        </button>
        <span className="text-lg font-bold text-ink">{prettyDay(day)}</span>
        <button
          aria-label="Next day"
          className={`${navBtn} disabled:opacity-40`}
          disabled={atToday}
          onClick={() => setDay(shiftDay(day, 1))}
        >
          <ChevronRight size={20} color={palette.ink} />
        </button>
      </div>

      <div className="mb-4">
        <StatStrip
          stats={[
            { type: 'feed', count: counts.feed, label: 'feeds' },
            { type: 'nappy', count: counts.nappy, label: 'changes' },
            { type: 'dose', count: counts.dose, label: 'meds' },
          ]}
        />
      </div>

      <EventList
        events={dayEvents}
        now={now}
        medications={medications}
        onSelect={setEditing}
        emptyText="No events on this day."
      />

      <EventSheet
        adding={null}
        editing={editing}
        medications={medications}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
