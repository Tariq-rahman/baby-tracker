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

  it('prefills volume and content from the last feed when adding a new one', async () => {
    const onSave = vi.fn()
    const lastFeed = {
      id: 3,
      type: 'feed' as const,
      volumeMl: 150,
      content: 'formula' as const,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    render(<BottleSheet lastFeed={lastFeed} onSave={onSave} onClose={() => {}} />)
    expect(screen.getByLabelText(/volume/i)).toHaveValue(150)
    // saving without touching anything reuses the last values as a brand-new event
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'feed', volumeMl: 150, content: 'formula' }),
    )
    // ...but it is a new event, not an edit of the old one (no id, fresh createdAt)
    expect(onSave.mock.calls[0][0].id).toBeUndefined()
    expect(onSave.mock.calls[0][0].createdAt).not.toBe('2026-06-09T08:00:00.000Z')
  })

  it('selects a volume from the preset carousel', async () => {
    const onSave = vi.fn()
    render(<BottleSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '210' }))
    expect(screen.getByLabelText(/volume/i)).toHaveValue(210)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ volumeMl: 210 }))
  })

  it('preserves the original time when editing and the time is untouched', async () => {
    const onSave = vi.fn()
    const initial = {
      id: 7,
      type: 'feed' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    render(<BottleSheet initial={initial} onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: '2026-06-09T08:00:00.000Z' }),
    )
  })

  it('steps the logged time back five minutes per tap', async () => {
    const onSave = vi.fn()
    const initial = {
      id: 7,
      type: 'feed' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    render(<BottleSheet initial={initial} onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /5 minutes earlier/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: '2026-06-09T07:55:00.000Z' }),
    )
  })

  it('snaps an off-grid time to the nearest 5 minutes when stepping back', async () => {
    const onSave = vi.fn()
    const initial = {
      id: 7,
      type: 'feed' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:02:00.000Z', // off the 5-min grid
      createdAt: '2026-06-09T08:02:00.000Z',
    }
    render(<BottleSheet initial={initial} onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /5 minutes earlier/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    // 08:02 rounds to 08:00, then one step back → 07:55
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: '2026-06-09T07:55:00.000Z' }),
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
