// Shared building blocks for the warm-themed logging sheets.
import type { EventType } from '../../db/schema'
import { eventColor, palette } from '../../lib/theme'
import { EventIcon, CloseIcon } from '../icons'

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

export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-inkSoft">Time</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-faint bg-surface p-3 text-ink"
      />
    </label>
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
