import { useEffect, useState } from 'react'
import type { EventType } from '../db/schema'
import { fmtElapsed } from '../lib/stats'
import { eventColor } from '../lib/theme'
import { EventIcon } from './icons'

interface Props {
  /** Drives the accent colour + icon (sleep or feed). */
  type: EventType
  /** Bold headline, e.g. "Sleep in progress" / "Feed in progress". */
  title: string
  /** Interval start, epoch-ms — the live timer counts up from here. */
  startMs: number
  /** When the running interval has run implausibly long ("check this"). */
  flagged: boolean
  /** Tap the banner body to open/edit the running event. */
  onOpen: () => void
  /** Stop & save now. */
  onStop: () => void
}

/** Shown above the clock while a duration event (sleep / breast feed) is in progress. */
export default function RunningBanner({ type, title, startMs, flagged, onOpen, onStop }: Props) {
  const col = eventColor[type]
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="flex items-center gap-3 rounded-3xl px-4 py-3"
      style={{ background: `${col}1f`, border: `1.5px solid ${col}55` }}
    >
      <button type="button" onClick={onOpen} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: col }}
        >
          <EventIcon type={type} size={20} color="#fff" sw={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{title}</span>
          <span className="tnum block text-xs font-semibold" style={{ color: col }}>
            {fmtElapsed(now - startMs)}
            {flagged && <span className="ml-1.5 font-medium text-inkSoft">· still going? check this</span>}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onStop}
        className="press shrink-0 rounded-full px-4 py-2 text-sm font-bold text-white"
        style={{ background: col }}
      >
        Stop
      </button>
    </div>
  )
}
