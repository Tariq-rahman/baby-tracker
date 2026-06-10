// The central 12-hour dial. AM events ride the inner (dotted) track, PM events
// the outer ring, so a 6am feed and a 6pm feed never collide. Weight is tracked
// on its own page, so only feed / nappy / dose are plotted here.
import type { BabyEvent } from '../db/schema'
import { polar, eventAngle } from '../lib/clock'
import { palette, eventColor } from '../lib/theme'
import { EventIcon } from './icons'

interface Props {
  size?: number
  events: BabyEvent[]
  now: Date
  centerTime: string
  centerAmpm: string
  hint?: string
}

const PLOTTED = new Set(['feed', 'nappy', 'dose'])

export default function Clock({ size = 296, events, now, centerTime, centerAmpm, hint }: Props) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 30 // PM track
  const innerR = outerR - 44 // AM track

  const nowDeg = eventAngle(now)
  const handTip = polar(cx, cy, outerR + 8, nowDeg)

  const ticks = []
  for (let i = 0; i < 12; i++) {
    const deg = i * 30
    const a = polar(cx, cy, outerR + 2, deg)
    const b = polar(cx, cy, outerR + (i % 3 === 0 ? 12 : 7), deg)
    ticks.push(
      <line
        key={i}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={palette.faint}
        strokeWidth={i % 3 === 0 ? 2.4 : 1.4}
        strokeLinecap="round"
      />,
    )
  }

  const nums = ([[0, '12'], [90, '3'], [180, '6'], [270, '9']] as const).map(([deg, label]) => {
    const p = polar(cx, cy, outerR + 24, deg)
    return (
      <text
        key={label}
        x={p.x}
        y={p.y + 5}
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill={palette.inkSoft}
      >
        {label}
      </text>
    )
  })

  const markers = events
    .filter((ev) => PLOTTED.has(ev.type))
    .map((ev, idx) => {
      const date = new Date(ev.occurredAt)
      const deg = eventAngle(date)
      const pm = date.getHours() >= 12
      const p = polar(cx, cy, pm ? outerR : innerR, deg)
      const col = eventColor[ev.type]
      return (
        <div
          key={ev.id ?? idx}
          style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}
        >
          <div className="mpop" style={{ animationDelay: `${idx * 45}ms` }}>
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 30,
                height: 30,
                background: palette.surface,
                border: `2px solid ${col}`,
                boxShadow: `0 2px 8px ${col}3a, 0 0 0 4px ${palette.cream}`,
              }}
            >
              <EventIcon type={ev.type} size={17} color={col} sw={1.9} />
            </div>
          </div>
        </div>
      )
    })

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={palette.ring} strokeWidth="2" opacity="0.5" />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke={palette.ring}
          strokeWidth="1.5"
          opacity="0.32"
          strokeDasharray="2 5"
          strokeLinecap="round"
        />
        {ticks}
        {nums}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'sweep .7s cubic-bezier(.22,.9,.27,1) both' }}>
          <line
            x1={cx}
            y1={cy}
            x2={handTip.x}
            y2={handTip.y}
            stroke={palette.ink}
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx={handTip.x} cy={handTip.y} r="3.4" fill={palette.ink} />
        </g>
        <circle cx={cx} cy={cy} r="5.5" fill={palette.ink} />
      </svg>

      {markers}

      {/* center readout */}
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center"
        style={{
          width: innerR * 1.18,
          height: innerR * 1.18,
          background: palette.surface,
          boxShadow: `inset 0 0 0 1px ${palette.ring}22, 0 8px 24px ${palette.ink}14`,
          pointerEvents: 'none',
        }}
      >
        <div className="tnum font-bold leading-none text-ink" style={{ fontSize: 38, letterSpacing: '-0.02em' }}>
          {centerTime}
          <span className="font-semibold text-inkSoft" style={{ fontSize: 15, marginLeft: 3 }}>
            {centerAmpm}
          </span>
        </div>
        {hint && (
          <div
            className="font-medium text-inkSoft"
            style={{ fontSize: 12.5, marginTop: 6, maxWidth: innerR * 1.1, lineHeight: 1.3 }}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}
