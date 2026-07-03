// Minimal line icons. Each takes { size, color, sw } and strokes the given colour.
import type { EventType } from '../db/schema'

interface IconProps {
  size?: number
  color?: string
  sw?: number
}

function svg(size: number, color: string, sw: number, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function BottleIcon({ size = 24, color = 'currentColor', sw = 1.8 }: IconProps) {
  return svg(
    size,
    color,
    sw,
    <>
      <path d="M10 2.5h4" />
      <path d="M11 2.5c0 1.2-.5 1.8-1.3 2.6-.5.5-.7 1-.7 1.7h6c0-.7-.2-1.2-.7-1.7C13.5 4.3 13 3.7 13 2.5" />
      <rect x="8" y="6.8" width="8" height="14.7" rx="3" />
      <path d="M9.4 11h2.2M9.4 14h2.2M9.4 17h2.2" />
    </>,
  )
}

export function NappyIcon({ size = 24, color = 'currentColor', sw = 1.8 }: IconProps) {
  return svg(
    size,
    color,
    sw,
    <>
      <path d="M3.5 7.5h17c-.7 4.6-2.3 8.3-8.5 9.8C5.8 15.8 4.2 12.1 3.5 7.5Z" />
      <path d="M3.5 7.5c2.4 1.3 5.2 1.9 8.5 1.9s6.1-.6 8.5-1.9" />
      <path d="M7.6 12.5c1.3.6 2.8.9 4.4.9s3.1-.3 4.4-.9" />
    </>,
  )
}

export function PillIcon({ size = 24, color = 'currentColor', sw = 1.8 }: IconProps) {
  return svg(
    size,
    color,
    sw,
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-20 12 12)" />
      <path d="M9.7 7.1 14.3 16.9" />
    </>,
  )
}

export function ScaleIcon({ size = 24, color = 'currentColor', sw = 1.8 }: IconProps) {
  // baby scale: dial face with a needle
  return svg(
    size,
    color,
    sw,
    <>
      <rect x="3" y="5" width="18" height="14" rx="4" />
      <path d="M12 15a3 3 0 0 0 2.8-4.1L12 12Z" />
      <path d="M8.5 8.5 9.6 9.6M15.5 8.5 14.4 9.6" />
    </>,
  )
}

export function MoonIcon({ size = 24, color = 'currentColor', sw = 1.8 }: IconProps) {
  // crescent moon for sleep
  return svg(size, color, sw, <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />)
}

export function PlusIcon({ size = 24, color = 'currentColor', sw = 2.2 }: IconProps) {
  return svg(size, color, sw, <path d="M12 5v14M5 12h14" />)
}

export function MinusIcon({ size = 24, color = 'currentColor', sw = 2.2 }: IconProps) {
  return svg(size, color, sw, <path d="M5 12h14" />)
}

export function CloseIcon({ size = 22, color = 'currentColor', sw = 2 }: IconProps) {
  return svg(size, color, sw, <path d="M6 6l12 12M18 6 6 18" />)
}

export function ChevronLeft({ size = 22, color = 'currentColor', sw = 2 }: IconProps) {
  return svg(size, color, sw, <path d="M15 5l-7 7 7 7" />)
}

export function ChevronRight({ size = 22, color = 'currentColor', sw = 2 }: IconProps) {
  return svg(size, color, sw, <path d="M9 5l7 7-7 7" />)
}

export function HomeIcon({ size = 24, color = 'currentColor', sw = 1.9 }: IconProps) {
  return svg(size, color, sw, <path d="M4 11.5 12 5l8 6.5M6 10.5V19h12v-8.5" />)
}

export function CalendarIcon({ size = 24, color = 'currentColor', sw = 1.9 }: IconProps) {
  return svg(
    size,
    color,
    sw,
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>,
  )
}

export function ChartIcon({ size = 24, color = 'currentColor', sw = 1.9 }: IconProps) {
  return svg(size, color, sw, <path d="M4 19V5M4 19h16M7 15l4-5 3 3 4-6" />)
}

export function GearIcon({ size = 24, color = 'currentColor', sw = 1.9 }: IconProps) {
  return svg(
    size,
    color,
    sw,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" />
    </>,
  )
}

/** Dispatch the right glyph for an event type. */
export function EventIcon({
  type,
  size = 24,
  color = 'currentColor',
  sw = 1.8,
}: IconProps & { type: EventType }) {
  if (type === 'feed') return <BottleIcon size={size} color={color} sw={sw} />
  if (type === 'nappy') return <NappyIcon size={size} color={color} sw={sw} />
  if (type === 'weight') return <ScaleIcon size={size} color={color} sw={sw} />
  if (type === 'sleep') return <MoonIcon size={size} color={color} sw={sw} />
  return <PillIcon size={size} color={color} sw={sw} />
}
