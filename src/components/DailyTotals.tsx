import type { BabyEvent } from '../db/schema'
import { getDailyTotals } from '../lib/stats'

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function DailyTotals({ events, day }: { events: BabyEvent[]; day?: string }) {
  const t = getDailyTotals(events, day ?? localToday())
  return (
    <div className="mx-4 rounded bg-white p-4 shadow-sm">
      <div className="text-xs uppercase text-slate-400">Today</div>
      <div className="text-sm text-slate-700">
        {t.feedCount} bottles / {t.feedVolumeMl}ml · {t.nappyWet} wet, {t.nappyDirty} dirty · {t.doseCount} doses
      </div>
    </div>
  )
}
