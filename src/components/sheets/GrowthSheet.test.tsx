import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GrowthSheet from './GrowthSheet'

describe('GrowthSheet', () => {
  it('saves cm height converted to mm, omitting head circumference', async () => {
    const onSave = vi.fn()
    render(<GrowthSheet onSave={onSave} onClose={() => {}} />)
    // metric (cm) is the default mode
    await userEvent.type(screen.getByLabelText(/^height/i), '52.5')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: 'growth', heightMm: 525 }))
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('headCircumferenceMm')
  })

  it('saves both height and head circumference in cm', async () => {
    const onSave = vi.fn()
    render(<GrowthSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^height/i), '52.5')
    await userEvent.type(screen.getByLabelText(/head circumference/i), '38')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'growth', heightMm: 525, headCircumferenceMm: 380 }),
    )
  })

  it('saves inch input converted to mm', async () => {
    const onSave = vi.fn()
    render(<GrowthSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /^in$/i }))
    await userEvent.type(screen.getByLabelText(/^height/i), '20')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: 'growth', heightMm: 508 }))
  })

  it('does not save when both metrics are empty', async () => {
    const onSave = vi.fn()
    render(<GrowthSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).not.toHaveBeenCalled()
  })
})
