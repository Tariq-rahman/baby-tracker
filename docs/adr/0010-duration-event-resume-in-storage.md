# Duration-event resume lives in storage, keyed off a pure helper, with a two-part undo

A **Duration Event** is a Sleep or a Breast [Feed](../../CONTEXT.md#feed) (see CONTEXT.md "Duration Event"). Stopping one and immediately starting another is almost always one interrupted session mis-recorded as two — a fumbled tap, a baby that re-latched. The product decision (offer-with-undo re-open within a short window) is in CONTEXT.md; this ADR records *where* that logic lives and the contract change it forced.

## Decision

- **The resume decision lives in `storage.ts`, not the UI.** `startSleep` / `startBreastFeed` are now resume-aware: they read `listEvents()` + the pure `getResumableDurationEvent(events, kind, now, windowMs)` and either reopen the most-recently-*ended* session of that kind (if it ended within `RESUME_WINDOW_MS` = 5 min) or add a new row. Keeping it in storage means **every** entry point (Home, History) resumes consistently, rather than each sheet re-implementing the rule.
- **`start*` now return `StartDurationResult { id, resumed, previousEndedAt }`** (was `Promise<number>`). Reopening keeps the original `occurredAt` and side.
- **Undo does two things**, via `undoResume(id, previousEndedAt, newEvent)`: it re-closes the reopened row at its prior end **and** creates the genuinely-new session. Restoring the end alone would leave nothing running, so re-tapping start would just resume again — a real double-nap would be unrecoverable. The Toast action carries the new-event payload so undo can rebuild it in one tap.

## Why

- **One rule, one place.** The "start now" path used to call `addEvent` directly; centralising in storage is the only way the resume window behaves identically wherever a duration event is started.
- **Recoverability is the whole point.** A genuine back-to-back double session (two real naps) must survive the auto-reopen; the two-part undo is the only reading that preserves it.

## Consequences

- **Breaking-ish:** callers and tests must destructure `{ id }` from `start*` instead of using the bare number.
- **TS gotcha (cost a build round): a *union* of type-guard functions does not narrow.** `.filter(kind === 'sleep' ? isSleep : isBreast)` leaves the array as `BabyEvent[]`, so `.endedAt` errors on `BottleFeedEvent`. Use a single predicate `(e): e is SleepEvent | BreastFeedEvent => …`. Same lesson in `EventSheet.handleSave`: narrow `event.type` *before* reading `event.endedAt`.
- The resumable-event selection is a pure function (`getResumableDurationEvent`) — ignores running rows and future-dated ends, picks the latest `endedAt` — so it is unit-tested independently of storage.
