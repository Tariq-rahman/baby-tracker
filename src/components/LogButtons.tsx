import { eventColor, eventLabel } from '../lib/theme'
import { EventIcon, PlusIcon } from './icons'

export type LogKind = 'bottle' | 'nappy' | 'dose'

// The kind passed to EventSheet maps to an event type for icon/colour/label.
const KINDS: { kind: LogKind; type: 'feed' | 'nappy' | 'dose' }[] = [
  { kind: 'bottle', type: 'feed' },
  { kind: 'nappy', type: 'nappy' },
  { kind: 'dose', type: 'dose' },
]

/** Three big "soft" log buttons, one per core event type. */
export default function LogButtons({ onPick }: { onPick: (kind: LogKind) => void }) {
  return (
    <div className="flex gap-3">
      {KINDS.map(({ kind, type }) => {
        const col = eventColor[type]
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onPick(kind)}
            className="press flex flex-1 flex-col items-center justify-center gap-1.5 rounded-3xl px-2 pb-4 pt-5"
            style={{ background: `${col}1f`, boxShadow: '0 6px 16px #3A2E270a' }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: `${col}24` }}
            >
              <EventIcon type={type} size={24} color={col} sw={2} />
            </span>
            <span className="text-[15px] font-bold text-ink">{eventLabel[type]}</span>
            <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: col }}>
              <PlusIcon size={11} color={col} sw={2.6} /> log
            </span>
          </button>
        )
      })}
    </div>
  )
}
