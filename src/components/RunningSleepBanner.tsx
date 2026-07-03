import { useEffect, useState } from 'react'
import type { SleepEvent } from '../db/schema'
import { fmtElapsed, isFlaggedSleep } from '../lib/stats'
import { eventColor } from '../lib/theme'
import { MoonIcon } from './icons'

const col = eventColor.sleep

interface Props {
  sleep: SleepEvent
  /** Tap the banner body to open/edit the running sleep. */
  onOpen: () => void
  /** Stop & save now. */
  onStop: () => void
}

/** Shown above the clock while a sleep is in progress: a live timer + Stop. */
export default function RunningSleepBanner({ sleep, onOpen, onStop }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const startMs = Date.parse(sleep.occurredAt)
  const flagged = isFlaggedSleep(sleep, new Date(now))

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
          <MoonIcon size={20} color="#fff" sw={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">Sleep in progress</span>
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
