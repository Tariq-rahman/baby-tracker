# Plan: Sleep tracking

**Status:** implemented (2026-07-03). All 9 steps landed; tsc/build/lint clean, 153 tests pass.
**Decision record:** `docs/adr/0003-sleep-as-duration-event.md`. **Glossary:** `CONTEXT.md` → "Sleep".

Add a new **Sleep** event type: track daytime naps *and* the overnight sleep, log a finished sleep or start a live-timing one, and show sleeps as arcs on the clock. Feature, button, banner, toast all say **"Sleep"** (not "Nap").

## Design source (Claude Design)

Import via the `DesignSync` MCP (auth `/design-login`), project `5a7378e7-7e55-46c8-9c38-2ab3b30f3638`:
- `app.jsx` — `Sheet` (the nap sub-form), `RunningNapBanner`, `napDuration`, `fmtElapsed`, `startNap`/`stopNap` logic, the mauve `LogButton`.
- `clock.jsx` — `arcPath`, the nap-arc `<path>`s, the live-nap pulsing tip (`livepulse`).
- `icons.jsx` — `MoonIcon` (use for Sleep), `SunIcon`.
- Screenshots: `screenshots/nap-sheet.png`, `nap-start.png`, `nap-running.png`.

The design mocks everything client-side (nap = `{start, end}`, running nap in `localStorage`). **Do not copy that data model** — see decisions below.

## Locked decisions (from the grill)

1. **One `sleep` event per sleep.** New `SleepEvent` union member: `type: 'sleep'`, `occurredAt` = **start**, flat field `endedAt: string | null` (ISO). `endedAt === null` ⇒ **in progress**. In sync it goes to `payload.endedAt`.
2. **Running sleep is a synced row** (not localStorage) so both caregivers see it. Start it → `addEvent` with `endedAt: null`. Stop it → `updateEvent(id, { endedAt })`. Editing a running sleep's end IS the stop action.
3. **At most one open sleep**, guarded in the UI: hide "Start sleep" when a local open sleep exists. If a sync race yields two open sleeps, treat the **earliest-started** as the running one.
4. **Includes overnight.** **Auto-cap ~18h**: a sleep still running past 18h is flagged "check this" and **excluded from totals** until an end is set.
5. **Clock arcs split at the noon/midnight band boundary** — evening portion on the outer (PM) track, morning portion on the inner (AM) track. Running sleep gets a pulsing tip. Arcs windowed to sleeps **overlapping the last 24h** (also fixes the current "all events forever" feed to the dial — arcs only; leave point-markers as-is to keep scope tight).
6. **StatStrip gains a 4th "sleep" tile** = **total sleep today, clipped to the day**. A 7pm→7am sleep contributes ~7h to today (and ~5h to yesterday).
7. **"Today" list** shows a sleep on any day its interval **overlaps**; the row shows the full span/duration (running → "in progress"). (Tile shows today's *portion*; list row shows *full* duration — intentional, both honest.)
8. **Full start + end editing** in the sheet.
9. **No server migration** — `payload jsonb` already carries `endedAt`. **Reminders unaffected** — `feed-reminder` filters `type='feed'`. **Export/import** rides the generic events path for free.
10. Colour **mauve `#8C7BA0`**; icon = moon.

## Files & changes (suggested order — each step compiles + tests green before the next)

### 1. Data model — `src/db/schema.ts`
- `EventType`: add `'sleep'`.
- Add `SleepEvent extends BaseEvent { type: 'sleep'; endedAt: string | null }` and include in `BabyEvent` union.
- (`occurredAt` = start; no new Dexie index needed — `occurredAt`/`type` already indexed. No schema `version()` bump — no new columns/tables.)

### 2. Sync mapping — `src/lib/sync/mapping.ts` (TS will force these)
- `packPayload`: `case 'sleep': return { endedAt: e.endedAt }`.
- `eventFromRow`: `case 'sleep': return { ...base, type: 'sleep', endedAt: (p.endedAt as string | null) ?? null }`.
- Round-trip test in `mapping.test.ts` for both `endedAt: null` and a set end.

### 3. Storage helpers — `src/db/storage.ts`
- `startSleep(occurredAt: string): Promise<number>` → `addEvent({ type:'sleep', occurredAt, endedAt:null, createdAt: now })`.
- `stopSleep(id: number, endedAt: string)` → `updateEvent(id, { endedAt })`.
- `getRunningSleep(events): SleepEvent | undefined` — sleeps with `endedAt == null`, earliest `occurredAt`. (Pure helper; can live in `lib/stats.ts` instead — see below.)
- Tests: start creates open row; stop sets end; one-open-guard behaviour (helper returns earliest when two open).

### 4. Clock geometry — `src/lib/clock.ts` (pure, fully unit-tested)
Add sleep-arc math. A sleep `[start, end]` (end = `now` if running) → **array of segments**, each `{ track: 'am' | 'pm'; deg1: number; deg2: number }`:
- Clip the interval to the render window `[now − 24h, now]`.
- Split at every midnight/noon crossing (band boundary = dial 0°). Each resulting sub-interval lies entirely in one band → map its start/end to angles via `eventAngle`.
- Clamp any single band segment to ≤ 360° (a >12h stretch within one band fills the band).
- Helper `sleepArcSegments(start: Date, end: Date, now: Date): Segment[]`.
Tests: same-band nap (1 segment), cross-noon, cross-midnight overnight (evening-outer + morning-inner), running (end=now), >12h clamp, fully-outside-window → `[]`.

### 5. Clock component — `src/components/Clock.tsx`
- Accept sleeps; render `sleepArcSegments` as `<path>` arcs (port `arcPath` + the two-stroke faint/solid style from `clock.jsx`).
- Running sleep: pulsing tip circle (`livepulse` keyframe — check it exists in `index.css`, else port from the design `<style>`).
- Window the arcs to last 24h. Point-markers unchanged.
- Prop for the running sleep (or derive from events).

### 6. Stats — `src/lib/stats.ts`
- `sleepMinutesForDay(events, day, now): number` — sum of each sleep's **overlap** with `[dayStart, dayEnd)`. Running sleep uses `end = now`. **Exclude** a running sleep whose elapsed > 18h (flagged).
- `isFlaggedSleep(sleep, now): boolean` — running && elapsed > 18h.
- Optionally fold sleep into `getDailyTotals`, or keep separate.
- Duration formatter (mirror design `napDuration`/`fmtElapsed`): `1h 15m`, live `m:ss`/`h:mm:ss`.
- Tests: overnight 7pm→7am splits 5h/7h across days (mind TZ — tests run `TZ=UTC`, so pick fixture times that are unambiguous under UTC); running counts up; >18h excluded.

### 7. UI — sheet, buttons, banner, list
- **`src/components/sheets/SleepSheet.tsx`** (new): two states —
  - *No open sleep*: "Start sleep now" (calls `startSleep`) + divider "or log a finished sleep" + **start & end** time rows (default end = now, start = end − 45m or a duration quick-pick). Save → `addEvent` completed sleep.
  - *Editing a completed sleep*: start + end rows, delete.
  - *Running sleep opened*: live timer + "Stop & save" (calls `stopSleep` with now).
- **`src/components/sheets/EventSheet.tsx`**: add `'sleep'` to `adding` union; render `SleepSheet`; pass the running sleep down; wire start/stop (via storage helpers, not just `handleSave`).
- **`src/components/LogButtons.tsx`**: add `'sleep'` to `LogKind` and `KINDS` (`{ kind:'sleep', type:'sleep' }`) → 4th mauve button.
- **`RunningSleepBanner`** (port `RunningNapBanner`): render on `HomePage` above the clock when a sleep is open — live elapsed + Stop.
- **`src/pages/HomePage.tsx`**: derive running sleep; pass sleeps to Clock; add banner; add sleep tile to Header stats; extend `showToast` for `'sleep'`.
- **`src/components/EventList.tsx`** / `detailText`: add sleep row ("1h 15m sleep" / "in progress").

### 8. Theme & icons
- `src/lib/theme.ts`: `eventColor.sleep = '#8C7BA0'`, `eventLabel.sleep = 'Sleep'`.
- `tailwind.config.js`: add `sleep: '#8C7BA0'` (match existing colour tokens).
- `src/components/icons.tsx`: add `MoonIcon` (from design `icons.jsx`) and a `'sleep'` case in `EventIcon`.

### 9. Sweep for exhaustive `type` switches
`grep -rn "\.type ===\|switch.*type\|case 'weight'" src` — any exhaustive handling of the event union (Header, EventList, HomePage `showToast`, WeightPage, format helpers) needs a `sleep` branch. TS `case` exhaustiveness will surface most.

## Verification
- `npm test` (sets `TZ=UTC` — required for the day-clipping tests; see memory "Run tests via repo script").
- `npx tsc --noEmit` / build clean (exhaustive switches).
- Run the app: log a finished sleep → arc appears; start a sleep → banner + live timer + pulsing arc; reload → running sleep persists (it's a synced row); stop → arc solidifies, sleep tile updates. Confirm an overnight sleep splits across the noon/midnight boundary on the dial and its hours split across day tiles.

## Gotchas
- **occurredAt = start**, so `listEvents`/`getLastEventOfType` ordering already works; but the *list membership* rule for sleeps is "overlaps the day", not "occurredAt on the day" — `listEventsForDay` needs a sleep-aware branch.
- **TZ**: day boundaries are *local*; tests run under UTC. Choose fixture times that don't straddle a UTC/local edge, or assert via the same helpers.
- **Running sleep in totals**: count up to `now`, but exclude entirely once flagged (>18h).
- Keep the arc-window change scoped to arcs; don't also re-window point markers in this change (pre-existing behaviour, separate concern).
- The design's `localStorage` running-nap and `{start,end}` shape are throwaway — the real model is decision #1.
