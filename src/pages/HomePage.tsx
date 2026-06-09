import { useState } from 'react'
import { useEvents, useMedications } from '../hooks/useEvents'
import { listEventsForDay } from '../lib/stats'
import type { BabyEvent } from '../db/schema'
import SinceLast from '../components/SinceLast'
import DailyTotals from '../components/DailyTotals'
import Timeline from '../components/Timeline'
import EventSheet from '../components/sheets/EventSheet'

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function HomePage() {
  const events = useEvents()
  const medications = useMedications()
  const [adding, setAdding] = useState<'bottle' | 'nappy' | 'dose' | null>(null)
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const todays = listEventsForDay(events, localToday())

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 p-4">
        <button onClick={() => setAdding('bottle')} className="rounded bg-blue-600 p-6 text-lg font-bold text-white">
          Bottle
        </button>
        <button onClick={() => setAdding('nappy')} className="rounded bg-amber-500 p-6 text-lg font-bold text-white">
          Nappy
        </button>
        <button onClick={() => setAdding('dose')} className="rounded bg-emerald-600 p-6 text-lg font-bold text-white">
          Dose
        </button>
      </div>

      <SinceLast events={events} />
      <DailyTotals events={events} />
      <Timeline events={todays} onSelect={(e) => setEditing(e)} />

      <EventSheet
        adding={adding}
        editing={editing}
        medications={medications}
        onClose={() => {
          setAdding(null)
          setEditing(null)
        }}
      />
    </div>
  )
}
