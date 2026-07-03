// The central 12-hour dial. AM events ride the inner (night) track, PM events
// the outer (day) track, so a 6am feed and a 6pm feed never collide. A warm day
// wash and a cool night wash make the AM/PM split legible at a glance, and the
// now-hand rides whichever band the current time falls on. Weight is tracked on
// its own page, so only feed / nappy / dose are plotted here.
import type { BabyEvent, SleepEvent } from '../db/schema'
import { polar, eventAngle, bandRadius, arcPath, sleepArcSegments } from '../lib/clock'
import { getRunningSleep } from '../lib/stats'
import { palette, eventColor } from '../lib/theme'

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
  const outerR = size / 2 - 30 // PM (day) track
  const innerR = outerR - 44 // AM (night) track
  const band = outerR - innerR

  const nowDeg = eventAngle(now)
  const handTip = polar(cx, cy, bandRadius(now, innerR, outerR) + 8, nowDeg)

  // Sleep arcs: each sleep (running → end = now) becomes per-band segments,
  // windowed to the last 24h. The running sleep gets a pulsing tip at its leading edge.
  const runningSleep = getRunningSleep(events)
  const sleepCol = eventColor.sleep
  const trackR = (track: 'am' | 'pm') => (track === 'pm' ? outerR : innerR)
  const arcs = events
    .filter((e): e is SleepEvent => e.type === 'sleep')
    .flatMap((s) => {
      const start = new Date(s.occurredAt)
      const end = s.endedAt != null ? new Date(s.endedAt) : now
      const running = s.endedAt == null && s.id === runningSleep?.id
      return sleepArcSegments(start, end, now).map((seg, i) => ({
        key: `${s.id}-${i}`,
        r: trackR(seg.track),
        d: arcPath(cx, cy, trackR(seg.track), seg.deg1, seg.deg2),
        tip: running ? polar(cx, cy, trackR(seg.track), seg.deg2) : null,
      }))
    })
  // Only the last segment of a running sleep carries the live tip.
  const lastRunningTipKey = [...arcs].reverse().find((a) => a.tip)?.key

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
      const p = polar(cx, cy, bandRadius(date, innerR, outerR), deg)
      const col = eventColor[ev.type]
      return (
        <div
          key={ev.id ?? idx}
          style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}
        >
          <div className="mpop" style={{ animationDelay: `${idx * 45}ms` }}>
            {/* a coloured tick, aligned radially so it reads like a clock mark */}
            <div style={{ transform: `rotate(${deg}deg)` }}>
              <div
                style={{
                  width: 5.5,
                  height: 18,
                  borderRadius: 4,
                  background: col,
                  boxShadow: `0 0 0 3px ${palette.surface}`,
                }}
              />
            </div>
          </div>
        </div>
      )
    })

  return (
    <div className="mx-auto" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
        {/* day band (PM, outer) — warm, sunny */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={palette.day} strokeWidth={band * 0.86} opacity="0.38" />
        {/* night band (AM, inner) — cool, calm */}
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke={palette.night} strokeWidth={band * 0.66} opacity="0.32" />

        {/* track guide lines */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={palette.ring} strokeWidth="1.5" opacity="0.4" />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke={palette.ring}
          strokeWidth="1.2"
          opacity="0.3"
          strokeDasharray="2 5"
          strokeLinecap="round"
        />

        {/* sleep arcs — a faint underlay + a solid stroke, on the AM/PM track radius */}
        {arcs.map((a) => (
          <g key={a.key}>
            <path d={a.d} fill="none" stroke={sleepCol} strokeWidth={9} strokeLinecap="round" opacity={0.18} />
            <path d={a.d} fill="none" stroke={sleepCol} strokeWidth={4.5} strokeLinecap="round" opacity={0.85} />
            {a.tip && a.key === lastRunningTipKey && (
              <circle className="livepulse" cx={a.tip.x} cy={a.tip.y} r={5} fill={sleepCol} />
            )}
          </g>
        ))}

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
        <div className="tnum font-bold leading-none text-ink" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
          {centerTime}
          <span className="font-semibold text-inkSoft" style={{ fontSize: 13, marginLeft: 2 }}>
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

      {/* AM / PM legend — kept outside the dial so it never covers markers */}
      <div className="mt-2 flex justify-center gap-5 text-xs font-semibold text-inkSoft">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: palette.night }} />
          AM · inner
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: palette.day }} />
          PM · outer
        </span>
      </div>
    </div>
  )
}
