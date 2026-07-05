# Implementation Plan: Developer Experience & Testability (DX)

_Status: not started · Created 2026-07-05 · Distilled from a grilling session on 2026-07-05 · Companion to [ROADMAP.md](../../../ROADMAP.md)_

> **You are a fresh agent.** Read the Orientation first. Every decision below is already settled (recorded here + in ROADMAP's DX phase) — implement, don't relitigate. Where a decision is security-sensitive it says **SECURITY** — honour it exactly.

---

## Why this exists

Two concrete pains motivated this:

1. **AI can't see the UI.** When Claude makes a UI change it can only run `npm run build` / `eslint` / `vitest` — it cannot look at the result. The app is gated behind Supabase **magic-link** auth (`src/components/AuthGate.tsx`), so there is no way to reach a rendered screen headlessly, and screens are empty without data. Every UI task ends with "worth eyeballing the deploy" instead of a verified visual check.
2. **No safe place to exercise the real backend.** Auth / sync / RLS / the `feed-reminder` Edge Function can only be tested against **prod** today, which risks polluting real data.

## The four asks, and what the grilling turned them into

| Original ask | Resolved as |
| --- | --- |
| Browser automation for AI visual checks | Playwright **thin screenshot script** (`npm run shots`) — eyes, not an assertion suite. |
| Login bypass for testing | A **separate dev entry point** (`main.dev.tsx` + `index.dev.html`) that structurally skips `AuthGate`. **Never imported by the prod build.** |
| Test account with seeded data | A **shared TS fixture** (`src/dev/fixture.ts`) → seeds Dexie locally *and* the staging account via a script. One source of truth. |
| Staging environment | A **dedicated staging Supabase project** + automatic **Vercel preview** deploys; prod Supabase untouched. Test account logs in with a **real inbox** + magic link. |

## Settled decisions (with rationale — do not relitigate)

1. **The AI visual-check loop runs local, no backend.** `npm run dev` against the dev entry, session stubbed, data from Dexie only. The app is local-first, so the UI renders fully with zero network. Rationale: fastest loop, works inside Claude's sandbox (localhost allowed, Supabase cloud host is not), and exercises no auth/sync — which is exactly right for *visual* checks. Real backend paths are DX.2's job.
2. **The login bypass is a separate entry point, not a flag or runtime toggle.** `index.dev.html` → `main.dev.tsx` renders the app shell directly, skipping `AuthGate`. **SECURITY:** prod's `index.html` → `main.tsx` → `App` → `AuthGate` is never touched, and Vite's prod build only inputs `index.html`, so the bypass code is *physically absent* from the prod bundle — not merely disabled. This beats a `VITE_*` flag (which ships the branch and relies on env correctness) and a runtime toggle (which ships an attacker-flippable bypass).
3. **`useSync` already no-ops without a session** (`if (!userId) return`, `src/hooks/useSync.ts`) and **`AuthGate` is the only consumer of the session for rendering.** So the shell renders inert-sync with no fake-session plumbing required. A minimal fake session can be added later only if a screen needs to *display* user identity.
4. **Seed data is anchored to `new Date()` (relative to now), no clock freeze.** Screens are always populated and fresh and every insight gate is satisfied; screenshots vary run-to-run so they're for eyeballing, not pixel-diffing. Rationale: chosen simplicity over reproducibility — a frozen-clock harness was considered and rejected as not worth the layer.
5. **One fixture, two consumers.** `src/dev/fixture.ts` is the single demo dataset; `seedDevData()` writes it to Dexie for the local loop, and `npm run seed:staging` pushes the *same* fixture to the staging backend via the Supabase client. No hand-written `seed.sql` to drift.
6. **Staging is a dedicated Supabase project + Vercel previews; prod is never the test target.** Migrations land on staging before prod. **SECURITY:** the staging project is a separate ref with its own keys; nothing here grants test access to prod data.
7. **Staging test account uses a real inbox + magic link — no password auth.** A plus-address you control (e.g. `tariq+bt-staging@…`) receives the magic link normally. Rationale: password auth was considered and **rejected** — it would enlarge the auth surface on a build shared with prod and add a secret to guard, for no real gain over an inbox you already own.

## Phasing

**DX.1 — Local visual-check loop.** Self-contained, in-sandbox, immediate value. Ship first. No backend, no cloud, no cost.

**DX.2 — Staging + test account.** Backend-side, later, has a (free-tier) cloud footprint. Do when real auth/sync/RLS/push testing becomes the bottleneck.

---

## DX.1 — Local visual-check loop

### Task DX.1.1 — Extract the app shell

- In `src/App.tsx`, the route+nav shell is the private `AuthedApp`. Export it (rename to `AppShell` for clarity) so a non-`AuthGate` entry can mount it. `App` itself stays `<AuthGate><AppShell/></AuthGate>` — unchanged behaviour.
- **Done when:** prod entry renders identically; `AppShell` is importable; build + tests green.

### Task DX.1.2 — Dev entry point

- Add `index.dev.html` (copy of `index.html`, but `<script src="/src/main.dev.tsx">`; keep the pre-paint theme script).
- Add `src/main.dev.tsx`: same provider stack as `main.tsx` (`initTheme()`, `ThemeProvider`, `BrowserRouter`) but renders `<AppShell/>` directly — **no `AuthGate`**. Before render, `await seedDevData()` (idempotent).
- **SECURITY:** do **not** add `index.dev.html` to Vite's `build.rollupOptions.input`. Confirm `npm run build` emits no `main.dev` chunk (grep `dist/`). Committing the file is fine — it's a dev-server entry, not a build input.
- **Done when:** `npm run dev` → open `/index.dev.html` → app renders past the gate with seeded data; `dist/` after a prod build contains no dev-entry code.

### Task DX.1.3 — Shared fixture + Dexie seed

- `src/dev/fixture.ts`: a demo baby + ~10 days of events anchored to `new Date()` — bottle **and** breast feeds, nappies, sleep (incl. one recently-ended so resume/patterns show), doses, weight entries. Enough that every screen is non-empty and every insight fires (needs a full 7-day window + a complete "yesterday" — see [ADR-0006](../../adr/0006-insight-data-sufficiency-and-baseline.md)).
- `src/dev/seed.ts` `seedDevData()`: idempotent (clear the dev DB or guard on a marker), writes the fixture **through `src/db/storage.ts`** (not raw Dexie) so it goes through the real abstraction.
- **Done when:** a freshly seeded app shows populated Home dial, History, Trends (with insights firing), Weight; re-running the seed doesn't duplicate.

### Task DX.1.4 — Playwright screenshot harness

- Add `@playwright/test` (devDep). Script `npm run shots`: boot the dev server, visit `/`, `/history`, `/trends`, `/weight`, `/settings` in **light and dark**, write PNGs to a **gitignored** dir (`screenshots/`). Chromium, headless.
- Not an assertion suite — respects the project's "No E2E for the MVP" stance ([CLAUDE.md](../../../CLAUDE.md)). Not wired into CI.
- **Done when:** `npm run shots` produces readable PNGs Claude can open with the Read tool to verify a UI change; `screenshots/` is gitignored.

---

## DX.2 — Staging + test account

### Task DX.2.1 — Staging Supabase project

- Create a separate Supabase project (free tier) = staging. Apply all migrations (`supabase/migrations/`) + deploy the `feed-reminder` Edge Function + set its `pg_cron` schedule + VAPID keys.
- **Done when:** staging schema matches prod; advisors clean; cron healthy.

### Task DX.2.2 — Vercel preview → staging wiring

- Point Vercel **Preview** environment variables (`VITE_SUPABASE_URL` / `_ANON_KEY` / `VITE_VAPID_PUBLIC_KEY`) at the staging project. Production env stays on the prod project. Every PR branch then gets a preview URL backed by staging.
- **Done when:** a PR preview deploy signs in against staging, not prod.

### Task DX.2.3 — Staging seed script + test account

- Test account = a real plus-address you own; sign in via the normal magic link (no auth changes).
- `npm run seed:staging`: push `src/dev/fixture.ts` to staging via the Supabase client (as the test user, or service_role) — reusing the fixture from DX.1.3 and `src/lib/sync/mapping.ts` packing so there's one dataset definition.
- **SECURITY:** the script targets staging by URL/key; add a guard that **refuses to run against the prod ref**. Any service_role key is read from env, never committed.
- **Done when:** the test account on staging shows the same demo dataset; running the script cannot touch prod.

---

## File map (where things will live)

- `src/App.tsx` — export `AppShell` (was `AuthedApp`).
- `index.dev.html`, `src/main.dev.tsx` — dev-only entry (bypasses `AuthGate`). **Not** a prod build input.
- `src/dev/fixture.ts` — the single demo dataset.
- `src/dev/seed.ts` — `seedDevData()` (Dexie).
- `scripts/seed-staging.ts` — pushes the fixture to staging.
- `playwright.config.ts` (or a plain script) + `npm run shots`.
- `.gitignore` — add `screenshots/`.

## Non-goals (protecting scope)

- No assertion E2E suite / CI gating (revisit only if regressions demand it).
- No password auth, no runtime auth toggle, no `VITE_` bypass flag — all rejected above on security grounds.
- No pixel-diff / visual-regression baseline (data isn't reproducible by decision 4).
- No per-PR ephemeral Supabase branching (overkill for a single maintainer).
