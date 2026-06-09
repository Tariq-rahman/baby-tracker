import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BottleSheet from './BottleSheet'

describe('BottleSheet', () => {
  it('submits the entered volume and defaults content to undefined', async () => {
    const onSave = vi.fn()
    render(<BottleSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '120')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'feed', volumeMl: 120 }),
    )
  })

  it('includes content when a content option is chosen', async () => {
    const onSave = vi.fn()
    render(<BottleSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '90')
    await userEvent.click(screen.getByRole('button', { name: /formula/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ volumeMl: 90, content: 'formula' }),
    )
  })

  it('prefills from an initial event for editing and preserves createdAt', async () => {
    const onSave = vi.fn()
    const initial = {
      id: 7,
      type: 'feed' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    render(<BottleSheet initial={initial} onSave={onSave} onClose={() => {}} />)
    expect(screen.getByLabelText(/volume/i)).toHaveValue(120)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ volumeMl: 120, createdAt: '2026-06-09T08:00:00.000Z' }),
    )
  })

  it('shows a delete button only when editing', async () => {
    const onDelete = vi.fn()
    const initial = {
      id: 7,
      type: 'feed' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    const { rerender } = render(<BottleSheet onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
    rerender(<BottleSheet initial={initial} onSave={() => {}} onDelete={onDelete} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalled()
  })
})
