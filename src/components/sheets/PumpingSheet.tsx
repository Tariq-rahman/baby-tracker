import { useLayoutEffect, useRef, useState } from 'react'
import type { PumpingEvent, BreastSide } from '../../db/schema'
import { eventColor, palette } from '../../lib/theme'
import { MinusIcon, PlusIcon } from '../icons'
import { Chip, DeleteButton, DragHandle, QuickTimeRow, SaveButton, SheetHeader } from './sheetParts'

interface Props {
  initial?: PumpingEvent
  onSave: (event: PumpingEvent) => void
  onDelete?: () => void
  onClose: () => void
}

// Horizontal carousel of common single-session expressed volumes (ml).
const PRESETS = [30, 60, 90, 120, 150, 180, 210, 240]
const col = eventColor.pumping

/**
 * Pumping — a home quick-log type recording the volume expressed (ml), with an
 * optional side. Reuses the bottle volume stepper/carousel; side is a tap-to-toggle
 * chip (optional, like bottle's content). A supply event, not a feed — see schema.
 */
export default function PumpingSheet({ initial, onSave, onDelete, onClose }: Props) {
  const [volume, setVolume] = useState(initial ? String(initial.volumeMl) : '')
  const [side, setSide] = useState<BreastSide | undefined>(initial?.side)
  const [when, setWhen] = useState(() => (initial ? new Date(initial.occurredAt) : new Date()))

  // Centre the pre-selected preset in the carousel on open, so an edited volume
  // isn't hidden off to the right.
  const carouselRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    const container = carouselRef.current
    const active = activeRef.current
    if (!container || !active) return
    const offset = active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2
    container.scrollLeft = Math.max(0, offset)
  }, [])

  function bump(delta: number) {
    setVolume(String(Math.max(0, (Number(volume) || 0) + delta)))
  }

  function handleSave() {
    const volumeMl = Number(volume)
    if (!volumeMl) return
    onSave({
      type: 'pumping',
      volumeMl,
      side,
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
      <SheetHeader type="pumping" title={initial ? 'Edit pumping' : 'Log pumping'} onClose={onClose} />

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
        ref={carouselRef}
        className="no-scrollbar relative -mx-5 mb-4 flex gap-2.5 overflow-x-auto px-5 pb-0.5"
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
              ref={active ? activeRef : undefined}
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

      {/* Side is optional — tap to select, tap again to clear. */}
      <div className="mb-4 flex gap-2">
        {(['left', 'right', 'both'] as const).map((s) => (
          <Chip
            key={s}
            active={side === s}
            color={col}
            onClick={() => setSide(side === s ? undefined : s)}
          >
            {s}
          </Chip>
        ))}
      </div>

      <QuickTimeRow value={when} onChange={setWhen} />
      <SaveButton color={col} label="pumping" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
