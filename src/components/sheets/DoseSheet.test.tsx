import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DoseSheet from './DoseSheet'
import type { Medication } from '../../db/schema'

const meds: Medication[] = [{ id: 1, name: 'Vitamin D', defaultDose: 400, unit: 'IU' }]

describe('DoseSheet', () => {
  it('pre-fills the default dose for the selected medication and saves it', async () => {
    const onSave = vi.fn()
    render(<DoseSheet medications={meds} onSave={onSave} onClose={() => {}} />)
    // single med is auto-selected; default dose 400 pre-filled
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dose', medicationId: 1, doseAmount: 400 }),
    )
  })
})
