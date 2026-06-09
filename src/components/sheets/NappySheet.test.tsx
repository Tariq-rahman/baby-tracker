import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NappySheet from './NappySheet'

describe('NappySheet', () => {
  it('saves a wet nappy with no size and without needing a second tap on size', async () => {
    const onSave = vi.fn()
    render(<NappySheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /^wet$/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'nappy', nappyType: 'wet' }),
    )
    expect(onSave.mock.calls[0][0].size).toBeUndefined()
  })

  it('requires and includes a size for a dirty nappy', async () => {
    const onSave = vi.fn()
    render(<NappySheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /^dirty$/i }))
    await userEvent.click(screen.getByRole('button', { name: /medium/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ nappyType: 'dirty', size: 'medium' }),
    )
  })
})
