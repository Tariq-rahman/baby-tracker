import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventSheet from './EventSheet'
import { db } from '../../db/schema'
import { listEvents } from '../../db/storage'

describe('EventSheet', () => {
  beforeEach(async () => {
    await db.events.clear()
  })

  it('adds an event in add mode', async () => {
    render(<EventSheet adding="bottle" editing={null} medications={[]} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '100')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    const events = await listEvents()
    expect(events).toHaveLength(1)
    expect((events[0] as { volumeMl: number }).volumeMl).toBe(100)
  })

  it('resumes a just-ended sleep instead of adding a row, reporting it to onSaved', async () => {
    const endedAt = new Date(Date.now() - 60_000).toISOString() // 1 min ago — within the window
    const seedId = await db.events.add({
      type: 'sleep',
      occurredAt: new Date(Date.now() - 60 * 60_000).toISOString(),
      endedAt,
      createdAt: endedAt,
    })

    let reported: { resumed: boolean; id: number } | undefined
    render(
      <EventSheet
        adding="sleep"
        editing={null}
        medications={[]}
        onClose={() => {}}
        onSaved={(_e, resume) => {
          reported = resume
        }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /start sleep now/i }))

    expect(await listEvents()).toHaveLength(1) // reopened, no new row
    expect(reported).toEqual(expect.objectContaining({ resumed: true, id: seedId }))
  })

  it('updates an event in edit mode', async () => {
    const id = await db.events.add({
      type: 'feed',
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    const editing = await db.events.get(id)
    render(<EventSheet adding={null} editing={editing!} medications={[]} onClose={() => {}} />)
    const input = screen.getByLabelText(/volume/i)
    await userEvent.clear(input)
    await userEvent.type(input, '150')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    const events = await listEvents()
    expect(events).toHaveLength(1)
    expect((events[0] as { volumeMl: number }).volumeMl).toBe(150)
  })
})
