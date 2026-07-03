// Shared building blocks for the warm-themed logging sheets.
import type { EventType } from '../../db/schema'
import { eventColor, palette } from '../../lib/theme'
import { EventIcon, CloseIcon, ChevronLeft, ChevronRight } from '../icons'

export function DragHandle() {
  return <div className="mx-auto mb-3.5 h-1.5 w-10 rounded-full" style={{ background: palette.faint }} />
}

export function SheetHeader({
  type,
  title,
  onClose,
}: {
  type: EventType
  title: string
  onClose: () => void
}) {
  const col = eventColor[type]
  return (
    <div className="mb-4 flex items-center gap-3">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ background: `${col}20` }}
      >
        <EventIcon type={type} size={24} color={col} sw={2} />
      </div>
      <div className="flex-1">
        <div className="text-lg font-bold text-ink">{title}</div>
        <div className="text-xs font-medium text-inkSoft">One tap to save · adjust if needed</div>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="press flex h-9 w-9 items-center justify-center rounded-full bg-cream"
      >
        <CloseIcon size={18} color={palette.inkSoft} />
      </button>
    </div>
  )
}

export function Chip({
  active,
  color,
  children,
  onClick,
}: {
  active: boolean
  color: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex-1 rounded-2xl px-2 py-3 text-[15px] font-bold capitalize"
      style={
        active
          ? { border: `1.8px solid ${color}`, background: `${color}1f`, color }
          : { border: `1.6px solid ${palette.faint}`, background: palette.surface, color: palette.inkSoft }
      }
    >
      {children}
    </button>
  )
}

export function TimeField({
  value,
  onChange,
  label = 'Time',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-inkSoft">{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-faint bg-surface p-3 text-ink"
      />
    </label>
  )
}

/**
 * Compact time control for the logging sheets: shows "Just now" (or the clock
 * time when editing an older event) and steps back/forward in 5-minute taps.
 * Caps at the current moment — events can't be logged in the future.
 */
export function QuickTimeRow({
  value,
  onChange,
  label = 'Time',
}: {
  value: Date
  onChange: (d: Date) => void
  label?: string
}) {
  const now = new Date()
  const stepBtn =
    'press flex h-10 w-10 items-center justify-center rounded-full border border-faint bg-surface'
  const FIVE_MIN = 5 * 60000

  // Snap to the nearest 5-minute mark, then step one interval in `dir`
  // (-1 earlier, +1 later). Times never land off-grid and never go future.
  function shift(dir: -1 | 1) {
    const rounded = Math.round(value.getTime() / FIVE_MIN) * FIVE_MIN
    const next = rounded + dir * FIVE_MIN
    if (next > Date.now()) return // no future events
    onChange(new Date(next))
  }

  const diffMin = Math.round((now.getTime() - value.getTime()) / 60000)
  const sameDay = value.toDateString() === now.toDateString()
  let display: string
  if (sameDay && diffMin <= 0) {
    display = 'Just now'
  } else {
    const time = value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    display = sameDay ? time : `${value.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl bg-cream px-3 py-2.5">
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-inkSoft">
          {label}
        </span>
        <span className="tnum block text-[17px] font-bold text-ink">{display}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="5 minutes earlier"
          className={stepBtn}
          onClick={() => shift(-1)}
        >
          <ChevronLeft size={18} color={palette.ink} />
        </button>
        <button
          type="button"
          aria-label="5 minutes later"
          className={stepBtn}
          onClick={() => shift(1)}
        >
          <ChevronRight size={18} color={palette.ink} />
        </button>
      </div>
    </div>
  )
}

export function SaveButton({
  color,
  label,
  onClick,
}: {
  color: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press w-full rounded-2xl py-4 text-base font-bold text-white"
      style={{ background: color, boxShadow: `0 12px 26px ${color}55` }}
    >
      Save {label}
    </button>
  )
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press mt-3 w-full rounded-2xl border border-red-400 py-3 font-semibold text-red-600"
    >
      Delete
    </button>
  )
}
