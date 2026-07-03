import type { EventType } from '../db/schema'
import { eventColor } from '../lib/theme'

export interface Stat {
  type: EventType
  count: number
  label: string
  /** When set, shown instead of the numeric count (e.g. a '3h 20m' sleep total). */
  value?: string
}

/** Row of small pill counters, one per event type. */
export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex gap-1.5">
      {stats.map((s) => (
        <div
          key={s.type}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-xl bg-surface px-2 py-2 shadow-sm"
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: eventColor[s.type] }} />
          <span className="tnum shrink-0 text-sm font-bold text-ink">{s.value ?? s.count}</span>
          <span className="truncate text-[11px] font-medium text-inkSoft">{s.label}</span>
        </div>
      ))}
    </div>
  )
}
