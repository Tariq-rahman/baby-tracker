import type { EventType } from '../db/schema'
import { eventColor, eventLabel } from '../lib/theme'
import { EventIcon } from './icons'

export type LogKind = 'bottle' | 'nappy' | 'dose' | 'sleep' | 'note' | 'pumping'

// The kind passed to EventSheet maps to an event type for icon/colour/label.
const KINDS: { kind: LogKind; type: 'feed' | 'nappy' | 'dose' | 'sleep' | 'note' | 'pumping' }[] = [
  { kind: 'bottle', type: 'feed' },
  { kind: 'nappy', type: 'nappy' },
  { kind: 'dose', type: 'dose' },
  { kind: 'sleep', type: 'sleep' },
  { kind: 'note', type: 'note' },
  { kind: 'pumping', type: 'pumping' },
]

/** Solid, circular ("radial") log buttons — only for the household's Enabled Event Types. */
export default function LogButtons({
  enabled,
  onPick,
}: {
  enabled: EventType[]
  onPick: (kind: LogKind) => void
}) {
  const kinds = KINDS.filter(({ type }) => enabled.includes(type))
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {kinds.map(({ kind, type }) => {
        const col = eventColor[type]
        return (
          <div key={kind} className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onPick(kind)}
              aria-label={`Log ${eventLabel[type]}`}
              className="press flex h-[70px] w-[70px] items-center justify-center rounded-full"
              style={{ background: col, boxShadow: `0 8px 20px ${col}55` }}
            >
              <EventIcon type={type} size={28} color="#fff" sw={1.9} />
            </button>
            <span className="text-[12.5px] font-semibold text-ink">{eventLabel[type]}</span>
          </div>
        )
      })}
    </div>
  )
}
