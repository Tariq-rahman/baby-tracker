# Sleep as a single duration event

Every prior Event is a single instant (`occurredAt`). **Sleep** is different: it spans a start → end interval and can be *in progress*. We model a Sleep as **one row in the existing `events` table** — `type: 'sleep'`, `occurredAt` = the start, and `payload.endedAt` (ISO) = the end, with `endedAt: null` meaning the sleep is still running. We did **not** use two paired start/end events, nor a dedicated `naps`/`sleeps` table.

## Why

Reusing the generic events pipeline means **no server migration** (the `events` table already carries type-specific data in `payload jsonb`) and no new plumbing: the local Dexie store, RLS policies, pull cursor, soft-delete tombstones, and export/import all work unchanged. A running sleep is simply `endedAt: null`, so it **syncs across caregivers for free** — start it on one device, the other sees "sleep in progress" — and stopping it is a single `updateEvent`.

## Considered and rejected

- **Two paired events** (`nap-start` + `nap-end`): every read (daily totals, clock arc, list row, export) would first have to re-pair the halves, and last-write-wins + soft-delete guarantees orphaned halves that every read path must then defend against. All cost, no benefit.
- **A separate `naps` table**: needs a new Dexie store, a new Postgres table, new RLS policies, a new pull cursor, and new export/import paths — to model something `payload` already handles.

## Consequences

- Reads that need a duration must handle `endedAt: null` (in progress).
- **Daily sleep totals clip each sleep interval to the day** — a 7pm→7am sleep contributes ~5h to the start day and ~7h to the next — rather than bucketing by `occurredAt` like instant events.
- Sleep is the one Event type that breaks the instant assumption, so the clock renders it as an **arc split at the noon/midnight band boundary** (evening on the outer/PM track, morning on the inner/AM track), windowed to sleeps overlapping the last ~24h.
- A sleep left running past ~18h is assumed forgotten: flagged for attention and excluded from totals until an end time is set.
