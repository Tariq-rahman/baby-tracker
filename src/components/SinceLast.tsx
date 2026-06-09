import type { BabyEvent } from '../db/schema'
import { getLastEventOfType } from '../lib/stats'

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m ago`
}

export default function SinceLast({ events }: { events: BabyEvent[] }) {
  const lastFeed = getLastEventOfType(events, 'feed')
  const lastNappy = getLastEventOfType(events, 'nappy')
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      <div className="rounded bg-white p-3 shadow-sm">
        <div className="text-xs uppercase text-slate-400">Last bottle</div>
        <div className="text-lg font-semibold">
          {lastFeed ? `${ago(lastFeed.occurredAt)}` : '—'}
        </div>
        {lastFeed && <div className="text-sm text-slate-500">{lastFeed.volumeMl}ml</div>}
      </div>
      <div className="rounded bg-white p-3 shadow-sm">
        <div className="text-xs uppercase text-slate-400">Last nappy</div>
        <div className="text-lg font-semibold">
          {lastNappy ? `${ago(lastNappy.occurredAt)}` : '—'}
        </div>
        {lastNappy && <div className="text-sm capitalize text-slate-500">{lastNappy.nappyType}</div>}
      </div>
    </div>
  )
}
