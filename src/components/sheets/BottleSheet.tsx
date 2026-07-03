import { useState } from 'react'
import type { FeedEvent, FeedContent } from '../../db/schema'
import { eventColor, palette } from '../../lib/theme'
import { MinusIcon, PlusIcon } from '../icons'
import {
  Chip,
  DeleteButton,
  DragHandle,
  QuickTimeRow,
  SaveButton,
  SheetHeader,
} from './sheetParts'

interface Props {
  initial?: FeedEvent
  /** When adding (no `initial`), prefill from the last feed so logging is one tap. */
  lastFeed?: FeedEvent
  onSave: (event: FeedEvent) => void
  onDelete?: () => void
  onClose: () => void
}

// Horizontal carousel of common bottle volumes (ml); edge items fade under a mask.
const PRESETS = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300]
const col = eventColor.feed

export default function BottleSheet({ initial, lastFeed, onSave, onDelete, onClose }: Props) {
  const prefill = initial ?? lastFeed
  const [volume, setVolume] = useState(prefill ? String(prefill.volumeMl) : '')
  const [content, setContent] = useState<FeedContent | undefined>(prefill?.content)
  const [when, setWhen] = useState(() => (initial ? new Date(initial.occurredAt) : new Date()))

  function bump(delta: number) {
    setVolume(String(Math.max(0, (Number(volume) || 0) + delta)))
  }

  function handleSave() {
    const volumeMl = Number(volume)
    if (!volumeMl) return
    onSave({
      type: 'feed',
      volumeMl,
      content,
      occurredAt: when.toISOString(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  const stepBtn =
    'press flex h-12 w-12 items-center justify-center rounded-full border border-faint bg-surface'

  return (
    <div className="px-5 pb-7 pt-3.5">
      <DragHandle />
      <SheetHeader type="feed" title={initial ? 'Edit feed' : 'Log feed'} onClose={onClose} />

      <div className="mb-4 flex items-center justify-center gap-5">
        <button type="button" aria-label="Decrease" className={stepBtn} onClick={() => bump(-10)}>
          <MinusIcon size={22} color={palette.ink} />
        </button>
        <div className="flex items-baseline">
          <input
            type="number"
            inputMode="numeric"
            aria-label="Volume (ml)"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="0"
            className="tnum w-28 bg-transparent text-center text-5xl font-bold text-ink outline-none"
          />
          <span className="text-lg font-semibold text-inkSoft">ml</span>
        </div>
        <button type="button" aria-label="Increase" className={stepBtn} onClick={() => bump(10)}>
          <PlusIcon size={22} color={palette.ink} />
        </button>
      </div>

      <div
        className="-mx-5 mb-4 flex gap-2.5 overflow-x-auto px-5 pb-0.5"
        style={{
          scrollSnapType: 'x proximity',
          WebkitOverflowScrolling: 'touch',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, #000 20px, #000 calc(100% - 40px), transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0, #000 20px, #000 calc(100% - 40px), transparent 100%)',
        }}
      >
        {PRESETS.map((v) => {
          const active = Number(volume) === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVolume(String(v))}
              className="press tnum shrink-0 rounded-[18px] py-5 text-[22px] font-bold"
              style={{
                flex: '0 0 calc((100% - 40px) / 3.3)',
                scrollSnapAlign: 'start',
                ...(active
                  ? { border: `1.8px solid ${col}`, background: `${col}1f`, color: col }
                  : {
                      border: `1.6px solid ${palette.faint}`,
                      background: palette.surface,
                      color: palette.inkSoft,
                    }),
              }}
            >
              {v}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex gap-2">
        {(['formula', 'breastmilk'] as const).map((c) => (
          <Chip
            key={c}
            active={content === c}
            color={col}
            onClick={() => setContent(content === c ? undefined : c)}
          >
            {c}
          </Chip>
        ))}
      </div>

      <QuickTimeRow value={when} onChange={setWhen} />
      <SaveButton color={col} label="feed" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
