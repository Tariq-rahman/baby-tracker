import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogButtons from './LogButtons'
import type { EventType } from '../db/schema'

const ALL: EventType[] = ['feed', 'nappy', 'weight', 'dose', 'sleep']

describe('LogButtons', () => {
  it('renders one button per enabled event type', () => {
    render(<LogButtons enabled={ALL} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /log feed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log nappy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log meds/i })).toBeInTheDocument()
  })

  it('calls onPick with the button kind when tapped', async () => {
    const onPick = vi.fn()
    render(<LogButtons enabled={ALL} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /log feed/i }))
    expect(onPick).toHaveBeenCalledWith('bottle')
    await userEvent.click(screen.getByRole('button', { name: /log nappy/i }))
    expect(onPick).toHaveBeenCalledWith('nappy')
    await userEvent.click(screen.getByRole('button', { name: /log meds/i }))
    expect(onPick).toHaveBeenCalledWith('dose')
  })

  it('hides buttons for types not in the enabled set', () => {
    render(<LogButtons enabled={['feed']} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /log feed/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log nappy/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log meds/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log sleep/i })).not.toBeInTheDocument()
  })
})
