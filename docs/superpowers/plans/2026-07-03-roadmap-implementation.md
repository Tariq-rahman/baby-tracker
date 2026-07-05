# Implementation Plan: Roadmap (H0–H4)

_Status: Phase 0 ✅ · Phase 1 (H1) ✅ Tasks 1.1–1.6 (PRs #12–#20 merged) — H1 complete · next: pick H2 / DX / opportunistic H1 · Created 2026-07-03 · Companion to [ROADMAP.md](../../../ROADMAP.md)_

> **You are a fresh agent.** You have none of the context that produced this plan. Read the "Orientation" section first, in order, before touching code. Every design decision here is already settled and recorded in an ADR — do not relitigate; implement.

---

## Orientation (read these first, in this order)

1. [ROADMAP.md](../../../ROADMAP.md) — the what and why, horizons H0–H4, wedges, non-goals.
2. [CONTEXT.md](../../../CONTEXT.md) — domain glossary. Terms like **Enabled Event Types**, **Insight**, **Baseline**, **Duration Event**, **Schedule** are load-bearing; use them exactly.
3. ADRs — the settled decisions you must honour:
   - [0004](../../adr/0004-per-household-enabled-event-types.md) per-household Enabled Event Types
   - [0005](../../adr/0005-reflective-insights-mirror-not-doctor.md) insights are reflective only ("mirror, not doctor")
   - [0006](../../adr/0006-insight-data-sufficiency-and-baseline.md) data-sufficiency gate, own-baseline, confidence-aware, swappable strategy
   - [0007](../../adr/0007-breast-feed-as-feed-method-reusing-duration-pattern.md) breast feed = Feed method reusing the Sleep duration pattern
   - [0008](../../adr/0008-solids-curated-catalog-and-reflective-allergen-tracking.md) solids catalog + reflective allergen tracking
   - [0003](../../adr/0003-sleep-as-duration-event.md) — the pattern H1 breastfeeding reuses; read it closely.
   - [0001](../../adr/0001-local-first-storage.md) / [0002](../../adr/0002-accounts-and-supabase-sync.md) — storage + sync architecture.
4. This plan, top to bottom.

## Architecture cheat-sheet

The event pipeline (memorise this — it decides how much work any feature is):

```
UI sheet ─► src/db/storage.ts (addEvent/updateEvent) ─► Dexie (src/db/schema.ts, discriminated union on `type`)
                                                             │
                              outbox (_pending) ─► src/lib/sync/engine.ts
                                                             │
              src/lib/sync/mapping.ts  ◄── the ONLY place local⇄server shapes meet ──►  Supabase Postgres
              (packPayload / eventFromRow)                                              (events.payload jsonb)
```

**The single most important rule for cost estimation — where a change lands:**

| Change | Server migration? | Dexie version bump? | Files to touch |
| --- | --- | --- | --- |
| **New field on an existing *event* type** (e.g. breast `side`, feed `method`, feed `endedAt`) | **No** — `events.payload` is `jsonb` | **No** — the field isn't indexed; Dexie stores arbitrary props | `schema.ts` (union type) + `mapping.ts` (`packPayload` + `eventFromRow` cases) |
| **New *event* type** (e.g. `solid`) | **No** — `events.type` is free text, payload is jsonb | **No** — `type`/`occurredAt` already indexed | `schema.ts` (`EventType`, new interface, `BabyEvent`), `mapping.ts` (both switch cases), new sheet, `EventSheet.tsx`, `LogButtons.tsx`, `theme.ts` (color+label), `icons.tsx`, storage helper if a duration event |
| **New field on *medication* / *baby*** (e.g. med `schedule`, baby `settings`) | **Yes** — those tables have explicit columns | No (non-indexed) | migration SQL + `schema.ts` + `mapping.ts` (`*ToRow`/`*FromRow`) |
| **New synced table** | Yes | Yes | migration, RLS, realtime pub, `SyncTable`, `engine.ts`, `schema.ts`, `mapping.ts`, storage helpers |
| **Device-only preference** (e.g. theme) | No | No | `localStorage` + a context/hook. **Do not sync.** |

This is the payoff of ADR-0003: adding to events is nearly free. Prefer riding the `events`/`payload` path and the existing `babies`/`medications` sync loop over inventing new synced tables.

## Cross-cutting rules (from CLAUDE.md — non-negotiable)

- **TypeScript only.** All persistence through `src/db/storage.ts` — never scatter Dexie calls in components/hooks.
- **Naming:** collections `list*`, singles `get*`.
- **Weight** stored as integer grams; convert only at the UI edge. **Timestamps** default to now but always editable.
- **Soft delete only:** set `deletedAt`; every read filters `deletedAt == null` (do it in `storage.ts`).
- **Tests:** all new pure logic gets Vitest tests (prefer table-driven); critical forms get RTL tests. Run via `npm test` (it sets `TZ=UTC` — required; do not use bare `npx vitest`).
- **Docs are committed** in this repo (overrides the global "never commit plans" rule).
- **Verification gate for every task:** `npm run build` · `npx eslint src/` · `npm test` — all green before moving on. Use **`npm run build`** (it runs `tsc -b && vite build`), NOT `npx tsc --noEmit` — the project-references build (`tsc -b`) is stricter and catches errors `--noEmit` misses (e.g. interface-vs-`Record` index-signature mismatches).
- **Work in small PRs, one task at a time.** Update this file's status markers as you go.

---

## Phase 0 — Foundations (H0)

_Goal: the frame that lets every later feature slot in without cluttering the default UI or shipping garbage insights. No flashy user-facing output yet._

### Task 0.1 — Enabled Event Types infrastructure (ADR-0004) ✅ DONE (PR #12, merged)

- **Storage decision:** store the enabled set as a **`settings jsonb` column on the `babies` row** (rides the existing baby sync loop; no new synced table). Under "one baby per household" this is effectively per-household. _Trade-off to note in code:_ if true multi-baby/true per-household config is ever needed, promote to a household-level synced table — flagged, not now.
  - Server migration: `alter table babies add column settings jsonb not null default '{}';`
  - `schema.ts`: add `settings?: BabySettings` to `Baby`; define `BabySettings` with `enabledEventTypes: EventType[]` (default = the current five: feed, nappy, weight, dose, sleep).
  - `mapping.ts`: carry `settings` through `babyToRow`/`babyFromRow`.
  - `storage.ts`: `getEnabledEventTypes()` / `setEnabledEventTypes()` (or fold into `saveBaby`). Default set applied when `settings` absent (back-compat for existing rows).
- **UI:** `LogButtons.tsx` renders only enabled kinds. Add a "Tracking" section in Settings to toggle types (see Task 1.5 restructure). Disabling a type **hides its log button but never deletes data** — history/trends still show past events of that type.
- **Tests:** default set when unset; toggling persists; disabled type absent from `LogButtons`; historical events survive a disable.
- **Done when:** a household with only `[feed, nappy]` enabled shows exactly two log buttons; flipping one on/off syncs across devices.

### Task 0.2 — Insight strategy scaffold (ADR-0006) ✅ DONE (`src/lib/insights/`)

- New module `src/lib/insights/`. **No UI yet** — pure logic + the interface later phases plug into.
  - Define the strategy contract, e.g. `interface InsightStrategy { id: string; compute(input: InsightInput): Insight[] }` where `Insight` is `{ kind, fact: string, confidence?: number }` — copy is a *fact*, never advice (ADR-0005).
  - **Data-sufficiency gate** as a first-class result: a strategy returns "not enough data" explicitly; surfaces must render that state, never a noisy number.
  - **Baseline helper:** rolling trailing window over the baby's *own* events (default 7 days). Never population norms.
  - **Confidence:** predictions only emitted when recent-interval variance is under a threshold; otherwise degrade to a range or suppress.
  - Thresholds/window are **strategy parameters**, not magic numbers in the UI, so strategies are swappable/A-B-testable.
- **Tests (heavy — this is pure logic):** cold-start returns "insufficient data"; baseline math; high-variance suppresses a prediction; table-driven fixtures in UTC.
- **Done when:** strategies can be computed from a list of `BabyEvent` with no UI and no network, fully unit-tested.

---

## Phase 1 — Close the disqualifier + reflective depth (H1)

_Goal: ship breastfeeding (gates audience C), turn History into Trends with the first reflective insights, and land the QoL/beauty items. This phase also starts accumulating the data Phase 2 needs._

### Task 1.1 — Breastfeeding (ADR-0007) — the priority item ✅ DONE (PR #14, merged)

- `schema.ts`: give `FeedEvent` a `method: 'bottle' | 'breast'`.
  - Bottle: keeps `volumeMl` (required) + optional `content`.
  - Breast: **reuse the Sleep duration shape** — `occurredAt` = start, `endedAt: string | null` (null ⇒ nursing in progress), plus `side: 'left' | 'right' | 'both'`. No `volumeMl`. **No per-side switch logging.**
  - Model as a discriminated sub-shape so `volumeMl` is only required for bottle. (No server migration — all in `payload`.)
- `mapping.ts`: extend feed `packPayload`/`eventFromRow` for `method`, `side`, `endedAt`. Default legacy feeds (no `method`) to `bottle`.
- `storage.ts`: add `startBreastFeed(occurredAt, side)` / `stopBreastFeed(id, endedAt)` mirroring `startSleep`/`stopSleep`. Reuse the duration-resume helper from Task 1.6.
- **UI:** the feed log flow lets the user pick bottle vs breast; breast uses a live timer + running banner (model on `SleepSheet` + `RunningSleepBanner`). Enforce **one running breast feed at a time** (independent of a running sleep).
- **Reminders:** "last feed" = last feed of *either* method (a nursing session counts). Note for Phase 2's edge-function work.
- **Insight consequence (critical):** volume insights are **bottle-only**; breastfeeding households get **frequency / total-nursing-minutes** insights. Insight code must branch on method and must not read a breast feed's absent volume as 0.
- **Tests:** method round-trips through mapping; legacy feed defaults to bottle; running breast feed persists/syncs; nursing-minutes aggregation; "one running breast feed" enforced.
- **Done when:** a breastfeeding parent can start/stop/resume a timed feed on the dial and it syncs; a bottle parent sees no change.

### Task 1.2 — Trends view ✅ DONE (PR #15, merged)

- New route/page `TrendsPage` (separate from `HistoryPage`, which stays the raw log). Reuse the existing Recharts setup from the weight chart.
- A stack of small-multiple cards, **one per Enabled Event Type** (Task 0.1): feeds/day (+ml/day bottle, +minutes/day breast), sleep hours/day, nappies/day (wet vs dirty), doses. Weight's existing chart becomes one card.
- Selectable window (7d / 30d / since birth); overlay the **Baseline** band (Task 0.2).
- **This is where reflective Insights render** — the insight text sits on the card it describes.
- **Tests:** per-metric aggregation (table-driven, UTC); window selection; cards respect the enabled set.

### Task 1.3 — First reflective insights ✅ DONE (PR #16, + honesty fix PR #17, merged)

- Implement concrete strategies against the Task 0.2 scaffold: volume-vs-baseline (bottle), frequency/nursing-minutes-vs-baseline (breast), and a simple next-feed prediction (confidence-gated).
- Copy rules (ADR-0005): state the fact + own-baseline; **never** "enough"/"normal"/"ok?"/"should"; optional "worth mentioning to your pediatrician" hand-off only.
- Render on the matching Trends cards; render the "not enough data yet" state honestly.

### Task 1.4 — Dark mode ✅ DONE (PR #18, merged; see ADR-0009)

- **Not just aesthetics** — framed as a 3am-feed feature and part of the "beautiful" wedge.
- **Technical catch:** colours live in **two** places — `tailwind.config.js` static classes (`bg-cream`, `text-ink`, …) AND runtime hex in `src/lib/theme.ts` (`palette`, `eventColor`). Unify via **CSS custom properties**:
  - `index.css`: define `:root { --cream: …; … }` and `.dark { --cream: …; … }` for light + dark sets (design the dark palette to keep the warm identity).
  - `tailwind.config.js`: point the named colours at the vars (e.g. `cream: 'var(--cream)'`).
  - `theme.ts`: derive `palette`/`eventColor` from the CSS vars (read computed style) or expose light/dark objects switched by the active theme, so runtime-drawn bits (clock markers, arcs, day/night washes) follow the theme too.
  - Add a theme context/hook: **default to system preference** (`prefers-color-scheme`) with a **manual override in Settings**. Persist the override in **`localStorage` — device-only, NOT synced** (theme is a per-device preference).
- **Tests:** toggling sets the class + persists; system default respected when no override. Verify the clock arcs/markers visually in both themes (this needs a browser — see verification).

### Task 1.5 — Settings restructure (light) ✅ DONE (PR #19, merged)

- Regroup the current flat card stack into sections so new config has an obvious home: **Baby & Household · Tracking (Enabled Event Types + medications + later schedules) · Notifications (reminders + later insight nudges) · Appearance (theme) · Data (backup/export-import) · Account.**
- Pure restructure of `SettingsPage.tsx` (extract the existing cards into the sections). Full visual polish deferred to H4 with branding.

### Task 1.6 — Duration-event resume (QoL, ADR context in CONTEXT "Duration Event") ✅ DONE (PR #20, merged; see ADR-0010)

- Generalise: a **Duration Event** is Sleep or a breast Feed. Add a storage helper: when starting one, if the most recent ended duration event of that type ended **< ~5 min ago**, **offer-with-undo** to re-open it (set `endedAt` back to `null`) instead of creating a second row.
- **Offer-with-undo (option B):** auto-reopen but surface a toast "Resumed previous — Undo" (reuse `Toast.tsx`). A genuine double-nap must be recoverable.
- **Tests:** within-window reopens the same row (no new row); outside-window creates new; undo restores the prior end; applies to both sleep and breast feed.

### Opportunistic in H1 (cheap, toggled) — do if convenient

- **Growth** (height / head circumference): ✅ DONE (PR #22). New event type, sibling of Weight, same chart primitive. Opt-in (not in `DEFAULT_ENABLED_EVENT_TYPES`); one event carries optional `heightMm`/`headCircumferenceMm` (mm integers), cm/in toggle.
- **Pumping**: duration + volume event. Behind the toggle.
- **Free-text Note**: ✅ DONE (PR #23). Deliberately minimal timestamped note (single `text` field); a home quick-log type (button + sheet), opt-in via the toggle. No chart, no Trends card.

---

## Phase 2 — The smart layer (H2)

_Gated behind Phase 1 having shipped tracking, because insights/predictions are meaningless without accumulated data._

- **2.1 Predictive feed-reminder mode.** `push_subscriptions` gains a mode (fixed-interval | predictive). The `supabase/functions/feed-reminder` edge function learns to compute the baby's typical next-feed time server-side (mirror the client baseline logic; keep it confidence-gated) and fire ahead of it. Modes co-exist; parent picks in Settings › Notifications. (Migration on `push_subscriptions`; extend the function.)
- **2.2 Medication Schedule.** Add a **`schedule jsonb`** column to the `medications` table (server migration) → `Medication.schedule` in `schema.ts` → `mapping.ts`. Drives an in-app "next dose due" (reflective, no reminder required). A Reminder can be laid on top: extend the edge function to also consider scheduled meds + last dose. Settings UI under Tracking.
- **2.3 Insight Nudges.** Deliver an Insight as an **opt-in, once-daily digest** push (never real-time alarms). New scheduled edge function (or extend feed-reminder's cron sibling) that computes insights server-side and pushes a digest. Reflective phrasing verbatim (ADR-0005). Toggle in Settings › Notifications.

> Before starting Phase 2, write a dedicated detailed plan (server-side insight computation is the non-trivial part — it duplicates the client strategy logic in Deno/SQL; decide how to share the baseline definition).

## Phase 3 — Solids (H3) (ADR-0008)

- **3.1** New `solid` event type: food (from a curated **Food Catalog** + free-text fallback) + reaction (liked/disliked/neutral) + optional note; **no amount**. (Events path — no server migration; new sheet + LogButtons + theme/icon, behind Enabled Event Types.)
- **3.2** **Food Catalog** — a curated data asset (allergen flags, age stage). This is a *content dependency*, not just code; source a published age-staged weaning list. Decide catalog storage (bundled static JSON vs a synced table) in the phase plan.
- **3.3** First-class **allergen tracking**: reflect introduction state ("first tried peanut 3 days ago; egg not yet introduced") + whether a reaction was *noted*. **No severity, no triage** — a flagged reaction hands off to "seek medical advice."
- **3.4** Food **suggestions**: a filter over the published list (age-appropriate, not-yet-tried, ordered by liked flavours). Framed "ideas to try", never "should." Implement as another swappable strategy (ADR-0006).

## Phase 4 — Productization for C (H4)

_Deferred until depth (H1–H3) has proven the wedge. Do not interleave billing with the features that make the product worth paying for._

- **4.1 Onboarding** — includes the "what do you want to track?" step that writes Enabled Event Types (Task 0.1).
- **4.2 Branding / identity** — real name, icon, identity (today's "Baby Tracker" undersells the beauty wedge). Blocks the app-store and landing work.
- **4.3 Marketing landing page.**
- **4.4 Install / native packaging** — PWA install prompt or a Capacitor wrapper for the stores.
- **4.5 Billing / subscription.** **Open decision, not yet grilled:** free vs paid tiers (likely logging free, insights/predictions paid). Grill this before building.
- **4.6 Support / feedback** plumbing.
- **4.7 Settings full visual polish** (with branding).

---

## Explicit non-goals (do not build — protecting the wedge)

- Population-norm comparisons ("normal vs other babies"). Reaction severity / medical triage. Per-side breast-feed switch logging. Solids portion/amount. Real-time "below average!" alarms. (See ROADMAP.md and ADR-0005.)

## Verification (run before calling any task done)

```
npx tsc --noEmit
npx vite build
npx eslint src/
npm test            # sets TZ=UTC — required for day-clipping tests
```

For UI/timer/sync/theme behaviour, also drive it in a browser (`npm run dev`; localhost is a secure context so push works). The Sleep feature was merged without a hands-on click-through (see progress.md) — do not repeat that; verify duration timers, arc rendering, dark-mode colours, and cross-device sync by hand.
