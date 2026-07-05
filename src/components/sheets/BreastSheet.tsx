import { useEffect, useState } from 'react'
import type { BreastFeedEvent, BreastSide } from '../../db/schema'
import { fmtElapsed, formatSleepDuration } from '../../lib/stats'
import { eventColor } from '../../lib/theme'
import { Chip, DeleteButton, QuickTimeRow } from './sheetParts'

interface Props {
  /** Present when editing — a completed breast feed, or a running one (endedAt null). */
  initial?: BreastFeedEvent
  /** A breast feed is already in progress → hide "Start feed now" (one running at a time). */
  hasRunning?: boolean
  onSave: (event: BreastFeedEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const col = eventColor.feed

/** 15 minutes ago — a sensible default start for logging a finished nursing session. */
function defaultStart(): Date {
  return new Date(Date.now() - 15 * 60000)
}

/**
 * The breast body of the feed sheet — a duration event reusing the Sleep pattern
 * (ADR-0007 / ADR-0003): a live timer for nursing, plus a side. FeedSheet owns the
 * drag handle, header and the bottle/breast toggle.
 */
export default function BreastSheet({ initial, hasRunning, onSave, onDelete, onClose }: Props) {
  const isRunning = initial != null && initial.endedAt == null

  const [side, setSide] = useState<BreastSide>(initial?.side ?? 'left')
  const [start, setStart] = useState(() => (initial ? new Date(initial.occurredAt) : defaultStart()))
  const [end, setEnd] = useState(() => (initial?.endedAt ? new Date(initial.endedAt) : new Date()))

  // Tick once a second so a running feed's live timer counts up.
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
    onSave({ type: 'feed', method: 'breast', side, occurredAt: iso, endedAt: null, createdAt: iso })
    onClose()
  }

  function saveFinished(endIso: string) {
    onSave({
      type: 'feed',
      method: 'breast',
      side,
      occurredAt: start.toISOString(),
      endedAt: endIso,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  const bigBtn = 'press w-full rounded-2xl py-4 text-base font-bold text-white'
  const bigBtnStyle = { background: col, boxShadow: `0 12px 26px ${col}55` }

  return (
    <>
      {isRunning && (
        <div className="mb-5 flex flex-col items-center">
          <div className="tnum text-5xl font-bold" style={{ color: col }}>
            {fmtElapsed(now - startMs)}
          </div>
          <div className="mt-1 text-xs font-medium text-inkSoft">nursing so far</div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(['left', 'right', 'both'] as const).map((s) => (
          <Chip key={s} active={side === s} color={col} onClick={() => setSide(s)}>
            {s}
          </Chip>
        ))}
      </div>

      {/* Start a live feed — only when nothing is running and we're not editing. */}
      {!initial && !hasRunning && (
        <>
          <button type="button" className={bigBtn} style={bigBtnStyle} onClick={startNow}>
            Start feed now
          </button>
          <div className="my-4 flex items-center gap-3 text-xs font-semibold text-inkSoft">
            <span className="h-px flex-1 bg-faint" />
            or log a finished feed
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
        <button
          type="button"
          className={bigBtn}
          style={bigBtnStyle}
          onClick={() => saveFinished(new Date().toISOString())}
        >
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
          Save feed
        </button>
      )}

      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </>
  )
}
