import type { BabyEvent } from '../db/schema'
import EventRow from './EventRow'

interface Props {
  events: BabyEvent[]
  onSelect: (event: BabyEvent) => void
}

export default function Timeline({ events, onSelect }: Props) {
  if (events.length === 0) {
    return <p className="p-4 text-slate-400">No events yet today.</p>
  }
  return (
    <div className="mt-2">
      {events.map((e) => (
        <EventRow key={e.id} event={e} onClick={() => onSelect(e)} />
      ))}
    </div>
  )
}
