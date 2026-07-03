import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Clock from './Clock'
import type { BabyEvent } from '../db/schema'

const events: BabyEvent[] = [
  { id: 1, type: 'feed', volumeMl: 120, occurredAt: '2026-06-10T06:40:00.000Z', createdAt: '2026-06-10T06:40:00.000Z' },
  { id: 2, type: 'nappy', nappyType: 'wet', occurredAt: '2026-06-10T07:15:00.000Z', createdAt: '2026-06-10T07:15:00.000Z' },
  { id: 3, type: 'weight', grams: 4200, occurredAt: '2026-06-10T08:00:00.000Z', createdAt: '2026-06-10T08:00:00.000Z' },
]

describe('Clock', () => {
  it('renders the centre time and am/pm', () => {
    render(
      <Clock
        events={events}
        now={new Date('2026-06-10T15:20:00.000Z')}
        centerTime="3:20"
        centerAmpm="PM"
      />,
    )
    expect(screen.getByText('3:20')).toBeInTheDocument()
    expect(screen.getByText('PM')).toBeInTheDocument()
  })

  it('plots feed and nappy markers but excludes weight', () => {
    const { container } = render(
      <Clock events={events} now={new Date('2026-06-10T15:20:00.000Z')} centerTime="3:20" centerAmpm="PM" />,
    )
    // one .mpop marker per plotted event (feed + nappy = 2, weight excluded)
    expect(container.querySelectorAll('.mpop')).toHaveLength(2)
  })

  it('only plots today’s events up to now (excludes future and prior days)', () => {
    const windowed: BabyEvent[] = [
      // today, before now → plotted
      { id: 1, type: 'feed', volumeMl: 120, occurredAt: '2026-06-10T06:40:00.000Z', createdAt: '2026-06-10T06:40:00.000Z' },
      // today but after now → excluded
      { id: 2, type: 'feed', volumeMl: 90, occurredAt: '2026-06-10T18:00:00.000Z', createdAt: '2026-06-10T18:00:00.000Z' },
      // yesterday (a different calendar day, still within 24h) → excluded
      { id: 3, type: 'nappy', nappyType: 'wet', occurredAt: '2026-06-09T22:00:00.000Z', createdAt: '2026-06-09T22:00:00.000Z' },
    ]
    const { container } = render(
      <Clock events={windowed} now={new Date('2026-06-10T15:20:00.000Z')} centerTime="3:20" centerAmpm="PM" />,
    )
    expect(container.querySelectorAll('.mpop')).toHaveLength(1)
  })
})
