import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeightSheet from './WeightSheet'

describe('WeightSheet', () => {
  it('saves kg input converted to grams', async () => {
    const onSave = vi.fn()
    render(<WeightSheet onSave={onSave} onClose={() => {}} />)
    // metric is the default mode
    await userEvent.type(screen.getByLabelText(/kg/i), '4.2')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'weight', grams: 4200 }),
    )
  })

  it('saves lb + oz input converted to grams', async () => {
    const onSave = vi.fn()
    render(<WeightSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /lb \+ oz/i }))
    await userEvent.type(screen.getByLabelText(/^lb$/i), '9')
    await userEvent.type(screen.getByLabelText(/^oz$/i), '4')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'weight', grams: 4196 }),
    )
  })
})
