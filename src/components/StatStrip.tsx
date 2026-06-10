import type { EventType } from '../db/schema'
import { eventColor } from '../lib/theme'

export interface Stat {
  type: EventType
  count: number
  label: string
}

/** Row of small pill counters, one per event type. */
export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex gap-2">
      {stats.map((s) => (
        <div
          key={s.type}
          className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 shadow-sm"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: eventColor[s.type] }} />
          <span className="tnum text-base font-bold text-ink">{s.count}</span>
          <span className="text-xs font-medium text-inkSoft">{s.label}</span>
        </div>
      ))}
    </div>
  )
}
