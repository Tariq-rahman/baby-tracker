import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PumpingSheet from './PumpingSheet'

describe('PumpingSheet', () => {
  it('saves the entered volume with no side by default', async () => {
    const onSave = vi.fn()
    render(<PumpingSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '120')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pumping', volumeMl: 120, side: undefined }),
    )
  })

  it('includes the side when one is chosen', async () => {
    const onSave = vi.fn()
    render(<PumpingSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '90')
    await userEvent.click(screen.getByRole('button', { name: /left/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ volumeMl: 90, side: 'left' }))
  })

  it('clears the side when its chip is tapped again', async () => {
    const onSave = vi.fn()
    render(<PumpingSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '60')
    await userEvent.click(screen.getByRole('button', { name: /right/i }))
    await userEvent.click(screen.getByRole('button', { name: /right/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ volumeMl: 60, side: undefined }))
  })

  it('does not save without a volume', async () => {
    const onSave = vi.fn()
    render(<PumpingSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('selects a volume from the preset carousel', async () => {
    const onSave = vi.fn()
    render(<PumpingSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '150' }))
    expect(screen.getByLabelText(/volume/i)).toHaveValue(150)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ volumeMl: 150 }))
  })

  it('prefills from an initial event for editing and preserves createdAt', async () => {
    const onSave = vi.fn()
    const initial = {
      id: 7,
      type: 'pumping' as const,
      volumeMl: 120,
      side: 'both' as const,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    render(<PumpingSheet initial={initial} onSave={onSave} onClose={() => {}} />)
    expect(screen.getByLabelText(/volume/i)).toHaveValue(120)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ volumeMl: 120, side: 'both', createdAt: '2026-06-09T08:00:00.000Z' }),
    )
  })

  it('shows a delete button only when editing', async () => {
    const onDelete = vi.fn()
    const initial = {
      id: 7,
      type: 'pumping' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    const { rerender } = render(<PumpingSheet onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
    rerender(<PumpingSheet initial={initial} onSave={() => {}} onDelete={onDelete} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalled()
  })
})
