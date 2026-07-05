import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteSheet from './NoteSheet'

describe('NoteSheet', () => {
  it('saves a note with its trimmed text', async () => {
    const onSave = vi.fn()
    render(<NoteSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByRole('textbox'), '  first smile today  ')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'note', text: 'first smile today' }),
    )
  })

  it('does not save an empty (whitespace-only) note', async () => {
    const onSave = vi.fn()
    render(<NoteSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByRole('textbox'), '   ')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).not.toHaveBeenCalled()
  })
})
