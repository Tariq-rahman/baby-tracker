import { useState } from 'react'
import { useEvents, useMedications } from '../hooks/useEvents'
import { listEventsForDay } from '../lib/stats'
import Timeline from '../components/Timeline'
import DailyTotals from '../components/DailyTotals'
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

export default function HistoryPage() {
  const events = useEvents()
  const medications = useMedications()
  const [day, setDay] = useState(localToday())
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const dayEvents = listEventsForDay(events, day)

  return (
    <div>
      <div className="flex items-center justify-between p-4">
        <button onClick={() => setDay(shiftDay(day, -1))} className="rounded border px-4 py-2">
          ‹ Prev
        </button>
        <span className="font-semibold">{day}</span>
        <button
          onClick={() => setDay(shiftDay(day, 1))}
          disabled={day >= localToday()}
          className="rounded border px-4 py-2 disabled:opacity-40"
        >
          Next ›
        </button>
      </div>
      <DailyTotals events={events} day={day} />
      <Timeline events={dayEvents} onSelect={(e) => setEditing(e)} />

      <EventSheet
        adding={null}
        editing={editing}
        medications={medications}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
