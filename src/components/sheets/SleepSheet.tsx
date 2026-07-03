import { useEffect, useState } from 'react'
import type { SleepEvent } from '../../db/schema'
import { fmtElapsed, formatSleepDuration } from '../../lib/stats'
import { eventColor } from '../../lib/theme'
import { DeleteButton, DragHandle, QuickTimeRow, SheetHeader } from './sheetParts'

interface Props {
  /** Present when editing — a completed sleep, or a running one (endedAt null). */
  initial?: SleepEvent
  /** A sleep is already in progress → hide "Start sleep now" (guard: one open sleep). */
  hasRunning?: boolean
  onSave: (event: SleepEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const col = eventColor.sleep

/** 45 minutes ago — a sensible default nap start. */
function defaultStart(): Date {
  return new Date(Date.now() - 45 * 60000)
}

export default function SleepSheet({ initial, hasRunning, onSave, onDelete, onClose }: Props) {
  const isRunning = initial != null && initial.endedAt == null

  const [start, setStart] = useState(() => (initial ? new Date(initial.occurredAt) : defaultStart()))
  const [end, setEnd] = useState(() => (initial?.endedAt ? new Date(initial.endedAt) : new Date()))

  // Tick once a second so a running sleep's live timer counts up.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isRunning) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [isRunning])

  const startMs = start.getTime()
  const endMs = isRunning ? now : end.getTime()
  const durationMin = (endMs - startMs) / 60000

  function startNow() {
    const iso = new Date().toISOString()
    onSave({ type: 'sleep', occurredAt: iso, endedAt: null, createdAt: iso })
    onClose()
  }

  function saveFinished(endIso: string) {
    onSave({
      type: 'sleep',
      occurredAt: start.toISOString(),
      endedAt: endIso,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  const title = isRunning ? 'Sleep in progress' : initial ? 'Edit sleep' : 'Log sleep'

  const bigBtn = 'press w-full rounded-2xl py-4 text-base font-bold text-white'
  const bigBtnStyle = { background: col, boxShadow: `0 12px 26px ${col}55` }

  return (
    <div className="px-5 pb-7 pt-3.5">
      <DragHandle />
      <SheetHeader type="sleep" title={title} onClose={onClose} />

      {isRunning && (
        <div className="mb-5 flex flex-col items-center">
          <div className="tnum text-5xl font-bold" style={{ color: col }}>
            {fmtElapsed(now - startMs)}
          </div>
          <div className="mt-1 text-xs font-medium text-inkSoft">asleep so far</div>
        </div>
      )}

      {/* Start a live sleep — only when nothing is running and we're not editing. */}
      {!initial && !hasRunning && (
        <>
          <button type="button" className={bigBtn} style={bigBtnStyle} onClick={startNow}>
            Start sleep now
          </button>
          <div className="my-4 flex items-center gap-3 text-xs font-semibold text-inkSoft">
            <span className="h-px flex-1 bg-faint" />
            or log a finished sleep
            <span className="h-px flex-1 bg-faint" />
          </div>
        </>
      )}

      <QuickTimeRow label="Start" value={start} onChange={setStart} />
      {!isRunning && <QuickTimeRow label="End" value={end} onChange={setEnd} />}

      {durationMin > 0 && (
        <div className="mb-4 text-center text-sm font-semibold text-inkSoft">
          Duration · <span className="text-ink">{formatSleepDuration(durationMin)}</span>
        </div>
      )}

      {isRunning ? (
        <button type="button" className={bigBtn} style={bigBtnStyle} onClick={() => saveFinished(new Date().toISOString())}>
          Stop &amp; save
        </button>
      ) : (
        <button
          type="button"
          className={bigBtn}
          style={bigBtnStyle}
          onClick={() => {
            if (endMs > startMs) saveFinished(end.toISOString())
          }}
        >
          Save sleep
        </button>
      )}

      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
