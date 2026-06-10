import type { Baby } from '../db/schema'
import { ageLabel } from '../lib/format'
import StatStrip, { type Stat } from './StatStrip'

interface Props {
  baby: Baby | undefined
  now: Date
  stats: Stat[]
}

export default function Header({ baby, now, stats }: Props) {
  const name = baby?.name || 'Baby'
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
  const subtitle = baby ? `${dateLabel} · ${ageLabel(baby.dateOfBirth, now)}` : dateLabel

  return (
    <div className="px-5 pb-3.5 pt-1.5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #E29A3C, #C25A40)',
            boxShadow: '0 6px 16px #C25A4044',
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold leading-tight text-ink">{name}</div>
          <div className="text-xs font-medium text-inkSoft">{subtitle}</div>
        </div>
      </div>
      <div className="mt-3.5">
        <StatStrip stats={stats} />
      </div>
    </div>
  )
}
