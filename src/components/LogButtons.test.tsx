import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogButtons from './LogButtons'

describe('LogButtons', () => {
  it('renders one button per core event type', () => {
    render(<LogButtons onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /log feed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log nappy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log meds/i })).toBeInTheDocument()
  })

  it('calls onPick with the button kind when tapped', async () => {
    const onPick = vi.fn()
    render(<LogButtons onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /log feed/i }))
    expect(onPick).toHaveBeenCalledWith('bottle')
    await userEvent.click(screen.getByRole('button', { name: /log nappy/i }))
    expect(onPick).toHaveBeenCalledWith('nappy')
    await userEvent.click(screen.getByRole('button', { name: /log meds/i }))
    expect(onPick).toHaveBeenCalledWith('dose')
  })
})
