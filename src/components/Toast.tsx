import type { EventType } from '../db/schema'
import { eventColor } from '../lib/theme'
import { EventIcon } from './icons'

export interface ToastData {
  type: EventType
  text: string
}

/** Brief confirmation that drops in after logging an event. */
export default function Toast({ data }: { data: ToastData | null }) {
  if (!data) return null
  return (
    <div
      className="toast fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-2xl px-4 py-3 text-white"
      style={{ background: '#3A2E27', boxShadow: '0 12px 30px #3A2E2755' }}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full"
        style={{ background: eventColor[data.type] }}
      >
        <EventIcon type={data.type} size={15} color="#fff" sw={2.1} />
      </span>
      <span className="text-sm font-semibold">{data.text}</span>
    </div>
  )
}
