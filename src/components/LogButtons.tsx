import { eventColor, eventLabel } from '../lib/theme'
import { EventIcon } from './icons'

export type LogKind = 'bottle' | 'nappy' | 'dose'

// The kind passed to EventSheet maps to an event type for icon/colour/label.
const KINDS: { kind: LogKind; type: 'feed' | 'nappy' | 'dose' }[] = [
  { kind: 'bottle', type: 'feed' },
  { kind: 'nappy', type: 'nappy' },
  { kind: 'dose', type: 'dose' },
]

/** Solid, circular ("radial") log buttons, one per core event type. */
export default function LogButtons({ onPick }: { onPick: (kind: LogKind) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {KINDS.map(({ kind, type }) => {
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
