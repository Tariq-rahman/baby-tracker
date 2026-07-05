# Progress: Product roadmap + implementation plan

_Updated: 2026-07-05 · Branch: feat/enabled-event-types (commit bb4ef67) · PR #12_

## Goal
Implement the roadmap (H0–H4). Planning is committed on `main` (`805b5d0`); now building, one task/PR at a time per the implementation plan.

## Status
**H0 Task 0.1 (Enabled Event Types) DONE — committed `bb4ef67`, PR #12 open, tested locally, migration 0009 applied to remote.** Checks green (tsc, 165 tests, eslint, build). Awaiting PR review/merge.

## Watch-outs
- **Remote migrations table lists only 0001–0007** — local `0008_cron_auth_key.sql` appears NOT applied to remote (feed-reminder cron auth depends on it). Unverified; flagged to user 2026-07-05.
- `gh` needs sandbox disabled (env blocks TLS to api.github.com).

## Done
- **Planning** — ROADMAP.md, CONTEXT.md glossary, ADRs 0004–0008, implementation plan. Committed `805b5d0` on `main`.
- **H0 Task 0.1 — Enabled Event Types** (uncommitted, branch `feat/enabled-event-types`):
  - `schema.ts`: `BabySettings { enabledEventTypes }`, `DEFAULT_ENABLED_EVENT_TYPES` (the five), `Baby.settings?`. No Dexie bump (non-indexed).
  - `mapping.ts`: `BabyRow.settings` jsonb; `babyToRow` writes `settings ?? {}`; `babyFromRow` maps back only when `enabledEventTypes` present (empty `{}` ⇒ undefined ⇒ defaults).
  - `storage.ts`: `getEnabledEventTypes` / `setEnabledEventTypes`; **`saveBaby` now preserves `settings`** (full `put` would otherwise wipe it on a name/DOB edit).
  - `useBaby.ts`: `useEnabledEventTypes()` reactive hook.
  - `LogButtons.tsx`: takes `enabled` prop, filters buttons; wired from `HomePage`.
  - `SettingsPage.tsx`: `TrackingCard` toggles feed/nappy/dose/sleep.
  - `supabase/migrations/0009_baby_settings.sql`: `alter table babies add column settings jsonb not null default '{}'`. **Not yet applied to remote.**
  - Tests added: storage (default/persist/preserve/no-baby), mapping (round-trip + empty), LogButtons (filtering).

## Next
1. **Verify Task 0.1 by hand** (`npm run dev`): toggle a type off in Settings › Tracking → its button disappears on Home; toggle on → returns; edit baby name → toggles survive. Then **apply migration 0009 to remote** (Supabase) and **commit** the branch.
2. H0 Task 0.2 — Insight strategy scaffold (`src/lib/insights/`, pure + tested, no UI).
3. Then H1 (breastfeeding is the priority item).

## Context & decisions
- **Depth-led roadmap**: invest in making the clock dial *smart* (insights), not in matching competitor feature checklists. Wedges = the **dial**, **beautiful+simple UI**, **local-first/privacy**.
- **One breadth exception pulled forward: breastfeeding** — "bottle only" disqualifies the largest segment and gates audience C. Modeled as a Feed `method` reusing the Sleep duration pattern (ADR-0007) — big reuse, no server migration.
- **The cost rule** (from reading the code): `events.payload` is `jsonb`, so new event fields/types need **no server migration and no Dexie bump** — only `schema.ts` + `mapping.ts`. But `babies`/`medications` have explicit columns, so Enabled Event Types and Medication Schedule **do** need migrations.
- **Deliberate shortcut to revisit**: Enabled Event Types stored on the baby row (rides existing sync, fine under one-baby-per-household). Most likely thing to rework if true multi-baby/per-household config is ever needed — flagged in the plan.
- **Theme (dark mode) is device-only** — `localStorage`, NOT synced. Colours live in *two* places (`tailwind.config.js` + `theme.ts`); unify via CSS custom properties.
- **Insights are reflective only** ("mirror, not doctor", ADR-0005) — state facts vs the baby's own baseline; never "enough"/"ok?"/"should".

## Blocked / open questions
- **Billing tiers (H4.5) never grilled** — free-vs-paid needs its own decision (likely: logging free, insights/predictions paid) before that phase.

## Key files & links
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Implementation plan (start here): [2026-07-03-roadmap-implementation.md](docs/superpowers/plans/2026-07-03-roadmap-implementation.md)
- Glossary: [CONTEXT.md](CONTEXT.md)
- ADRs: [0004 Enabled Event Types](docs/adr/0004-per-household-enabled-event-types.md) · [0005 reflective insights](docs/adr/0005-reflective-insights-mirror-not-doctor.md) · [0006 data-sufficiency/baseline](docs/adr/0006-insight-data-sufficiency-and-baseline.md) · [0007 breast feed](docs/adr/0007-breast-feed-as-feed-method-reusing-duration-pattern.md) · [0008 solids](docs/adr/0008-solids-curated-catalog-and-reflective-allergen-tracking.md)
- Pipeline touch-points for H0/H1: [schema.ts](src/db/schema.ts) · [storage.ts](src/db/storage.ts) · [mapping.ts](src/lib/sync/mapping.ts:140) · [LogButtons.tsx](src/components/LogButtons.tsx) · [SettingsPage.tsx](src/pages/SettingsPage.tsx)

## Verify & run
- Checks (all must pass before a task is done): `npx tsc --noEmit` · `npx vite build` · `npx eslint src/` · `npm test` (sets `TZ=UTC` — required).
- App: `npm run dev` (localhost is a secure context, so push works). Drive UI/timer/sync/theme by hand — Sleep shipped without a click-through; don't repeat that.
