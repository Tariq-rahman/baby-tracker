import { useState } from 'react'
import type { FeedEvent, FeedContent } from '../../db/schema'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'
import { eventColor, palette } from '../../lib/theme'
import { MinusIcon, PlusIcon } from '../icons'
import { Chip, DeleteButton, DragHandle, SaveButton, SheetHeader, TimeField } from './sheetParts'

interface Props {
  initial?: FeedEvent
  /** When adding (no `initial`), prefill from the last feed so logging is one tap. */
  lastFeed?: FeedEvent
  onSave: (event: FeedEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const PRESETS = [60, 90, 120, 150]
const col = eventColor.feed

export default function BottleSheet({ initial, lastFeed, onSave, onDelete, onClose }: Props) {
  const prefill = initial ?? lastFeed
  const [volume, setVolume] = useState(prefill ? String(prefill.volumeMl) : '')
  const [content, setContent] = useState<FeedContent | undefined>(prefill?.content)
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

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
      occurredAt: localInputToIso(when),
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

      <div className="mb-4 flex gap-2">
        {PRESETS.map((v) => (
          <Chip key={v} active={Number(volume) === v} color={col} onClick={() => setVolume(String(v))}>
            {v}
          </Chip>
        ))}
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

      <TimeField value={when} onChange={setWhen} />
      <SaveButton color={col} label="feed" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
