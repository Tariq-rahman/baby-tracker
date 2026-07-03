import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SleepSheet from './SleepSheet'
import type { SleepEvent } from '../../db/schema'

describe('SleepSheet', () => {
  it('starts a running sleep (endedAt null) via "Start sleep now"', async () => {
    const onSave = vi.fn()
    render(<SleepSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /start sleep now/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: 'sleep', endedAt: null }))
  })

  it('logs a finished sleep with a start and an end', async () => {
    const onSave = vi.fn()
    render(<SleepSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /save sleep/i }))
    const saved = onSave.mock.calls[0][0] as SleepEvent
    expect(saved.type).toBe('sleep')
    expect(saved.endedAt).not.toBeNull()
    expect(Date.parse(saved.endedAt as string)).toBeGreaterThan(Date.parse(saved.occurredAt))
  })

  it('hides "Start sleep now" when a sleep is already running', () => {
    render(<SleepSheet hasRunning onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /start sleep now/i })).toBeNull()
    expect(screen.getByRole('button', { name: /save sleep/i })).toBeInTheDocument()
  })

  it('stops a running sleep by setting its end', async () => {
    const onSave = vi.fn()
    const running: SleepEvent = {
      id: 7,
      type: 'sleep',
      occurredAt: '2026-06-09T13:00:00.000Z',
      endedAt: null,
      createdAt: '2026-06-09T13:00:00.000Z',
    }
    render(<SleepSheet initial={running} onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /stop & save/i }))
    const saved = onSave.mock.calls[0][0] as SleepEvent
    expect(saved.endedAt).not.toBeNull()
    expect(saved.createdAt).toBe('2026-06-09T13:00:00.000Z') // preserved
  })

  it('shows a delete button only when editing', () => {
    const initial: SleepEvent = {
      id: 7,
      type: 'sleep',
      occurredAt: '2026-06-09T13:00:00.000Z',
      endedAt: '2026-06-09T14:00:00.000Z',
      createdAt: '2026-06-09T13:00:00.000Z',
    }
    const { rerender } = render(<SleepSheet onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
    rerender(<SleepSheet initial={initial} onSave={() => {}} onDelete={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })
})
