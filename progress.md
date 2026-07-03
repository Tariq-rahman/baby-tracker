# Progress: Baby Tracker — Sleep tracking
_Updated: 2026-07-03 · Branch: feat/sleep-tracking · Status: IMPLEMENTED, ready to verify on-device + open PR_

## Goal
Add a **Sleep** event type — track daytime naps *and* the overnight sleep, log a finished sleep or start a live-timing one, and render sleeps as arcs on the clock. Done = start/stop a live sleep that syncs across caregivers, log finished sleeps, see them as arcs on the dial, and see total sleep today.

## Status
**Feature complete on `feat/sleep-tracking`, not yet committed to a PR.** All 9 plan steps landed. `npx tsc --noEmit` clean, `npx vite build` clean, `npx eslint src/` clean, `npm test` = 153 passing (incl. new geometry, stats, storage, mapping, and SleepSheet component tests). Dev server boots and serves all touched modules (200s). **Not yet driven click-by-click in a real browser** — that's the one remaining verification.

**Note (this repo only):** docs, plans, and `progress.md` are **tracked in git** here (overrides the global "never commit plans/specs" rule — see `CLAUDE.md`).

## Next (start here)
1. **Commit** the working tree on `feat/sleep-tracking` and open a PR (branch was Claude-created, so push is allowed).
2. **On-device / browser verify** (the plan's live checklist): log a finished sleep → arc appears; tap **Sleep** button → "Start sleep now" → banner + live timer + pulsing arc tip; reload → running sleep persists (it's a synced row); tap banner **Stop** → arc solidifies, sleep tile updates; log an overnight 7pm→7am sleep → arc splits at the noon/midnight boundary (evening on outer/PM, morning on inner/AM) and hours split across day tiles in History.
3. If anything looks off visually, the design mock (`DesignSync` project `5a7378e7-7e55-46c8-9c38-2ab3b30f3638`) has the reference `nap-sheet`/`nap-running` screenshots — I built to the app's existing tokens rather than pixel-matching, so a tweak pass may be wanted.

## Done (this session)
- **Schema** — `'sleep'` in `EventType`; `SleepEvent { endedAt: string|null }` in `BabyEvent`. No Dexie version bump (endedAt rides the object, not an index). `src/db/schema.ts`.
- **Sync mapping** — `packPayload`/`eventFromRow` sleep cases (`payload.endedAt`); round-trip tests. `src/lib/sync/mapping.ts`.
- **Storage** — `startSleep(occurredAt)` / `stopSleep(id, endedAt)`; tests. `src/db/storage.ts`.
- **Clock geometry** — `sleepArcSegments(start, end, now)` (clip to 24h window, split at noon/midnight, band-relative angles so a boundary reads 360°) + `arcPath()`; 6 geometry tests. `src/lib/clock.ts`.
- **Stats** — `getRunningSleep`, `isFlaggedSleep` (>18h), `sleepMinutesForDay` (day-clipped, excludes flagged), `formatSleepDuration`, `fmtElapsed`; `listEventsForDay` now sleep-aware (overlap membership); tests. `src/lib/stats.ts`.
- **Clock component** — renders sleep arcs (faint underlay + solid stroke) on AM/PM tracks; running sleep gets a `.livepulse` tip circle. `src/components/Clock.tsx` + `livepulse` keyframe in `src/index.css`.
- **UI** — new `SleepSheet` (start-now / log-finished / edit / stop states, live timer); `RunningSleepBanner` (live timer + Stop, flags >18h); `EventSheet` wires sleep + `hasRunningSleep` guard; `LogButtons` 4th mauve button; `HomePage` derives running sleep, shows banner + 4th "sleep" tile + `showToast` sleep case; `HistoryPage` sleep tile; `EventList` sleep row ("1h 15m sleep" / "in progress"). `StatStrip.Stat` gained optional `value?: string`.
- **Theme/icons** — mauve `#8C7BA0` in `theme.ts` + `tailwind.config.js`; `MoonIcon` + `EventIcon` sleep case. `src/components/icons.tsx`.

## Context & decisions
- **One `sleep` row per sleep**, `occurredAt`=start, `endedAt: string|null` (`null` ⇒ running). Running sleep is a real synced row → visible across caregivers; stop = `updateEvent(id,{endedAt})`. (ADR-0003.)
- **The sleep sheet routes through `EventSheet.handleSave`** (generic add/update) rather than calling `startSleep`/`stopSleep` — start-now = add with `endedAt:null`, stop-from-sheet = update with `endedAt`. The `startSleep`/`stopSleep` storage helpers exist + are tested and are used by the **banner's** Stop button (`HomePage.handleStopSleep`).
- **React Compiler gotcha**: adding code near HomePage's manual `useMemo` tripped `react-hooks/preserve-manual-memoization`. Fix was to drop the manual memo and compute `counts` inline (the compiler auto-memoizes). Don't reintroduce a manual `useMemo` there.
- **Point markers were left un-windowed** on the clock (pre-existing "all events" behaviour) — only arcs are 24h-windowed, per the plan's scope note.
- **TZ**: day-clipping tests run under `TZ=UTC` (via `npm test`); geometry/stats fixtures use unambiguous UTC times.
- I **did not run `/design-login`/DesignSync** — built to the app's existing design tokens and `polar`/`eventAngle` geometry instead of pixel-matching the mock. Clean and consistent, but a visual tweak pass against the screenshots is optional follow-up.

## Key files & links
- Plan: [2026-07-03-sleep-tracking.md](docs/superpowers/plans/2026-07-03-sleep-tracking.md)
- Decision record: [ADR-0003](docs/adr/0003-sleep-as-duration-event.md)
- Geometry: [clock.ts](src/lib/clock.ts) — `sleepArcSegments`, `arcPath`
- Stats: [stats.ts](src/lib/stats.ts) — `sleepMinutesForDay`, `getRunningSleep`, `isFlaggedSleep`
- Sheet: [SleepSheet.tsx](src/components/sheets/SleepSheet.tsx) · Banner: [RunningSleepBanner.tsx](src/components/RunningSleepBanner.tsx)
- Wiring: [HomePage.tsx](src/pages/HomePage.tsx), [Clock.tsx](src/components/Clock.tsx)

## Verify & run
- Tests: `npm test` (sets `TZ=UTC` — required for day-clipping). Typecheck: `npx tsc --noEmit`. Build: `npx vite build`. Lint: `npx eslint src/`. All currently green.
- App: `npm run dev` → the browser checklist under **Next #2**.
