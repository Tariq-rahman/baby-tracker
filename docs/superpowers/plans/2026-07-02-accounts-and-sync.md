# Baby Tracker — Accounts + Supabase Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user accounts and cloud sync so two caregivers can track the same baby from separate devices, with data surviving device loss — while keeping the app offline-capable. Notifications (interval "since last bottle") ride on top of the backend as the final phase. See **ADR-0002** for the decision and rationale; this plan supersedes `2026-07-02-notifications.md` (the standalone dumb-timer plan).

**Architecture (from ADR-0002):**
- **Supabase = source of truth** (Postgres + Auth + RLS + Realtime + Edge Functions).
- **Dexie = local write-through cache** so the UI stays instant and offline-capable.
- **`src/db/storage.ts` stays the single persistence boundary** — feature code barely changes; only what's *behind* storage changes.
- **UUID ids, `updated_at`, soft-delete `deleted_at`** on every synced record. **Last-write-wins** conflict resolution. **Outbox push + cursor pull + realtime.**

---

## Data model (Postgres)

```sql
-- households: the unit of sharing
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- membership: which users belong to which household
create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'caregiver',      -- 'owner' | 'caregiver'
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- babies (multi-baby falls out naturally)
create table babies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  date_of_birth date not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table medications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  default_dose numeric not null,
  unit text not null,                            -- 'ml'|'mg'|'IU'|'drops'
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- events: the append-only log. Common columns + jsonb payload for type-specifics.
create table events (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,  -- denormalised for RLS speed
  type text not null,                            -- 'feed'|'nappy'|'weight'|'dose'
  occurred_at timestamptz not null,
  payload jsonb not null default '{}',           -- volumeMl, nappyType, size, grams, medicationId, doseAmount, content
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on events (household_id, occurred_at desc);
create index on events (household_id, updated_at);   -- pull cursor

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  reminder_enabled boolean not null default false,
  interval_minutes int not null default 180,
  created_at timestamptz not null default now()
);
```

**Why `payload jsonb`:** the event is a discriminated union with different fields per type; aggregations (daily totals, weight trend) are already done client-side in `stats.ts` over the full event array pulled into Dexie, so the server doesn't need typed columns. `jsonb` keeps the schema stable as event types grow.

**Why denormalised `household_id` on `events`:** RLS policies check household membership on every row; having `household_id` directly on `events` avoids a join to `babies` in the policy (`babies` could be soft-deleted).

---

## Row-Level Security (the load-bearing security boundary)

Enable RLS on every table and scope to household membership. Helper:

```sql
alter table events enable row level security;
-- (repeat: households, household_members, babies, medications, push_subscriptions)

-- reusable predicate
create or replace function is_household_member(h uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from household_members m
    where m.household_id = h and m.user_id = auth.uid()
  );
$$;

create policy events_rw on events
  for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));
```

Analogous policies for `babies`, `medications`, `push_subscriptions` (`is_household_member(household_id)`), `households` (member can select; owner can update), and `household_members` (a user sees rows for households they belong to). **These policies are correctness-critical and get explicit tests** (Task in Phase 2).

---

## Sync engine

Local Dexie mirrors the server tables and adds bookkeeping:

- Every record has a client-generated `id` (UUID), `updatedAt`, `deletedAt`.
- An **outbox**: a Dexie table `_pending` of record refs (`{table, id}`) awaiting push. Every local write also enqueues here inside the same transaction.
- A **pull cursor**: last `updated_at` seen per table, in a `_sync` meta table.

**Push (outbox drain):** for each pending ref, `upsert` the record to Supabase. On success, clear it from `_pending`. Failures stay queued (offline-safe).

**Pull (cursor):** `select * where household_id = $h and updated_at > $cursor order by updated_at`; upsert into Dexie applying **last-write-wins** (only overwrite local if remote `updated_at` >= local `updated_at`); honour tombstones (`deleted_at` set → remove or mark deleted locally); advance cursor.

**Realtime:** subscribe to Postgres changes for the household's tables; on an event, run a pull. Debounce.

**Triggers to sync:** app foreground, after any local write, on realtime event, and a periodic timer while foreground. All sync is fire-and-forget — **a failed sync never blocks or errors a local write.** Offline-first is non-negotiable.

---

## PROGRESS (updated 2026-07-02)

Server-side backend is **built, validated locally, and merged-pending** on branch
`feat/accounts-supabase-backend` (PR: https://github.com/Tariq-rahman/baby-tracker/pull/2).

**Done & committed:**
- ✅ **Task 1** (Phase 0) — Supabase client (`src/lib/supabase.ts`), typed env (`src/vite-env.d.ts`), `@supabase/supabase-js` installed. *(Not done: cloud project creation, `.env.example`/Vercel env — see below.)*
- ✅ **Task 3** (Phase 2) — migrations `0001_init.sql` + `0002_rls.sql` written; validated via local `supabase db reset`. *(Not done: `supabase link` + `db push` to a real cloud project.)*
- ✅ **Task 4** (Phase 2) — pgTAP RLS tests (`supabase/tests/rls.test.sql`), **7/7 passing** against local Postgres.
- ✅ **Task 7** (Phase 5) — pure reconcile logic (`src/lib/sync/reconcile.ts`) + 12 tests.
- ✅ **Task 10 (server half)** — edge function `supabase/functions/feed-reminder/index.ts` + cron migration `0003_schedule_feed_reminder.sql`.

**Blocked on the human (needs Supabase dashboard):**
- Create the cloud project, then `supabase link` + `db push` + deploy the edge function.
- Create `.env.local` (real keys) — the sandbox/Write tool refuses `.env*`, so it must be hand-created. Keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
- Set Vault secrets `project_url` + `service_role_key` (see `0003` header) for cron to fire.
- Generate VAPID keypair (`npx web-push generate-vapid-keys`) for notifications.

**Not started (the next work — client integration):**
- ✅ **Task 2** (Phase 1) — auth gate + session hook + LoginPage (1a51fe5). *(Interactive magic-link round-trip is checkpoint S-B — user verifies live.)*
- **Task 5** (Phase 3) — Dexie v3 UUID migration + soft-delete + outbox, behind the stable `storage.ts` API.
- **Task 6** (Phase 4) — migrate existing local data into a household on first login.
- **Task 8** (Phase 5) — sync orchestrator (`engine.ts`, `useSync.ts`) wiring reconcile into push/pull/realtime.
- **Task 9** (Phase 6) — household invites.
- **Task 10 (client half)** — push-subscribe UI + service-worker push handlers.

**How to validate locally:** `export HOME=$TMPDIR/supahome` then `npx supabase start` / `db reset` / `test db` (sandbox blocks `~/.supabase`, so HOME is redirected). `gh` needs the sandbox disabled (Go TLS cert failure).

---

## CHECKPOINT MODEL

**7 phases, 6 checkpoints.** Stop at each; let the user verify.

- **S-A** — Supabase project wired; app boots with the client configured (no behaviour change yet).
- **S-B** — Auth works: log in via magic link, session persists, logged-out users see a login gate.
- **S-C** — Server schema + RLS deployed and **RLS-tested** (member of A cannot read B).
- **S-D** — Local schema on UUIDs + sync bookkeeping; existing local data migrates into a household on first login.
- **S-E** — Full sync works: log on device 1, see it on device 2 (and offline→reconnect reconciles).
- **S-F** — Invite a second caregiver; both see shared data. Then notifications fire server-side.

---

# PHASE 0 — Supabase project + client

### Task 1: Create the project and wire the client
**Files:** Create `src/lib/supabase.ts`; modify `.env.example`, Vercel env.

- [ ] Create a Supabase project; note the project URL and anon key.
- [ ] `npm install @supabase/supabase-js`
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.example` and Vercel env vars.
- [ ] `src/lib/supabase.ts`: `export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)`.
- [ ] Type-check + `npm run build`. **Commit:** `chore: add Supabase client and env config`.

> **CHECKPOINT S-A** — app boots with Supabase configured, no behaviour change. Pause.

---

# PHASE 1 — Auth

### Task 2: Login gate + session
**Files:** Create `src/lib/auth.ts`, `src/hooks/useSession.ts`, `src/pages/LoginPage.tsx`; modify `src/App.tsx`, `src/main.tsx`.

- [x] `useSession()` — subscribes to `supabase.auth.onAuthStateChange`, returns `{ session, loading }`. (`src/hooks/useSession.ts`)
- [x] `LoginPage` — email input → `supabase.auth.signInWithOtp({ email })` (magic link); show "check your email" state. Handle the redirect callback (`detectSessionInUrl`). (`src/pages/LoginPage.tsx`, `src/lib/auth.ts`)
- [x] Gate `App` routes: while `loading` show a splash; if no session → `LoginPage`; else the app. (`src/components/AuthGate.tsx`)
- [x] Add a "Sign out" button to Settings (`supabase.auth.signOut()`).
- [x] Light RTL test for the gate (renders login when no session). **Commit:** `feat: magic-link auth with login gate and session hook` (1a51fe5). 3 gate tests + 76/76 suite green, `tsc -b` + `vite build` clean.

> **CHECKPOINT S-B** — log in via magic link, refresh keeps you in, sign out returns to the gate. Pause.

---

# PHASE 2 — Server schema + RLS

### Task 3: Migrations for tables + RLS
**Files:** Create `supabase/migrations/0001_init.sql` (schema above), `supabase/migrations/0002_rls.sql` (policies above).

- [ ] Install Supabase CLI; `supabase init`; link the project.
- [ ] Write the schema migration (tables + indexes) and the RLS migration (enable RLS + `is_household_member` + policies for every table).
- [ ] Add a trigger to auto-bump `updated_at` on update for `babies`/`medications`/`events`.
- [ ] Add a trigger/function: on new `auth.users` signup, create a household + owner membership (so a first-time user always has a household). Alternatively do this client-side on first login (pick one; server trigger is more robust).
- [ ] `supabase db push`. **Commit:** `feat: Supabase schema and RLS migrations`.

### Task 4: RLS tests (correctness-critical)
**Files:** Create `supabase/tests/rls.test.sql` (pgTAP) or a Vitest integration test using two anon clients.

- [ ] Seed two households with two users. Assert: user A can CRUD A's events; user A `select` on B's events returns **zero rows**; user A cannot `insert` an event into B's household (RLS `with check` rejects).
- [ ] Run in CI or locally against a test project. **Commit:** `test: RLS isolation between households`.

> **CHECKPOINT S-C** — schema + RLS deployed; isolation proven by tests. Pause.

---

# PHASE 3 — Local schema on UUIDs + bookkeeping

### Task 5: Dexie v3 — UUIDs, sync fields, outbox
**Files:** Modify `src/db/schema.ts`, `src/db/storage.ts`; add `src/db/storage.test.ts` cases.

- [ ] Bump Dexie to `version(3)`: change primary keys from `++id` to `id` (string UUID); add `updatedAt`, `deletedAt` to `babies`/`medications`/`events`; add `_pending` and `_sync` meta tables. Provide a `version(3).upgrade()` that rewrites existing int-id rows to UUIDs (build an old→new id map; remap `events` FKs if any).
- [ ] Update types in `schema.ts`: `id: string`, add `householdId`, `babyId`, `updatedAt`, `deletedAt`. Move the discriminated-union type-specific fields under the same shape the `payload` jsonb expects (or map at the sync boundary).
- [ ] Update `storage.ts` writes: generate UUIDs (`crypto.randomUUID()`), set `updatedAt`, and enqueue into `_pending` **inside the same Dexie transaction**. Deletes set `deletedAt` (soft) + enqueue, instead of hard `delete`.
- [ ] Keep the public API (`addEvent`/`listEvents`/`updateEvent`/`deleteEvent`/`saveBaby`/…) **unchanged in signature** so pages/components don't change. `listEvents` filters out `deletedAt != null`.
- [ ] Update all existing storage tests for UUIDs + soft delete; add outbox-enqueue assertions. **Commit:** `feat: local UUID ids, soft-delete and sync outbox`.

---

# PHASE 4 — Data migration

### Task 6: Import existing local data into a household on first login
**Files:** Create `src/lib/migrateLocal.ts`; wire into first-login flow.

- [ ] On first authenticated boot with legacy data present (detect pre-v3 marker / int ids already remapped in Task 5), ensure the user has a household, then push all local records (with their new UUIDs, `householdId` stamped) to Supabase via the outbox.
- [ ] Idempotent: guard with a `_sync.migratedAt` flag so it runs once.
- [ ] Offer the existing JSON export as a safety net before migrating (reuse `backup.ts`). **Commit:** `feat: migrate existing local data into the account`.

> **CHECKPOINT S-D** — local data is on UUIDs, and an existing install's data appears in Supabase after login. Pause.

---

# PHASE 5 — Sync engine

### Task 7: Pure sync-reconciliation logic — TDD
**Files:** Create `src/lib/sync/reconcile.test.ts`, `reconcile.ts`.

- [ ] Pure functions (no network/Dexie): `mergeRecord(local, remote)` → last-write-wins on `updatedAt`, tombstone wins on equal timestamps; `nextCursor(records, cursor)`. Table-driven tests: remote newer wins, local newer kept, remote tombstone deletes, equal-timestamp determinism.
- [ ] **Commit:** `feat: pure sync reconciliation with tests`.

### Task 8: Sync orchestrator behind storage
**Files:** Create `src/lib/sync/engine.ts`, `src/hooks/useSync.ts`.

- [ ] `pushOutbox()` — drain `_pending` via Supabase `upsert`; clear on success; leave on failure.
- [ ] `pull()` — per table, fetch `updated_at > cursor`; apply `mergeRecord` into Dexie; advance cursor.
- [ ] `subscribeRealtime(householdId)` — on change, debounce → `pull()`.
- [ ] `useSync()` — runs push+pull on: login, foreground (`visibilitychange`), realtime event, and a periodic interval while foreground. All fire-and-forget; log failures; never throw into the UI.
- [ ] Map Dexie record shape ↔ Postgres row (`payload` jsonb pack/unpack) at this boundary only.
- [ ] Manual: two browser profiles logged into the same household — log on one, see it on the other within a second (realtime). Toggle offline on one, log, reconnect → it appears. **Commit:** `feat: sync engine (outbox push, cursor pull, realtime)`.

> **CHECKPOINT S-E** — cross-device sync works online; offline edits reconcile on reconnect. Pause.

---

# PHASE 6 — Sharing + notifications

### Task 9: Household invites
**Files:** Create `src/pages/InvitePage.tsx` (or a Settings section); a Supabase Edge Function or an `invites` table + RLS.

- [ ] Owner enters an invitee email → create an invite (token). Simplest path: an `invites` table (`household_id`, `email`, `token`, `expires_at`) with RLS; the invitee, on logging in with that email, sees a "Join <household>" prompt that inserts a `household_members` row (validated by an Edge Function or a `security definer` RPC that checks the token).
- [ ] Handle "user already has their own household" (choose: switch active household vs. merge — MVP: switch; add a household switcher in Settings).
- [ ] Manual: invite a second account; both devices see and edit the same baby. **Commit:** `feat: household invites and caregiver sharing`.

### Task 10: Notifications via scheduled Edge Function
**Files:** Create `supabase/functions/feed-reminder/index.ts`; modify Settings (reminder toggle + interval) and the service worker (push handler — reuse the `injectManifest` switch + `src/sw.ts` from the shelved notifications plan, Tasks 1 & the SW handlers there).

- [ ] Client: on enabling reminders, request permission, `pushManager.subscribe` with VAPID public key, and upsert the row into `push_subscriptions` (with `reminder_enabled`, `interval_minutes`). Toggle off → `reminder_enabled=false`.
- [ ] Store VAPID keys: public in `VITE_VAPID_PUBLIC_KEY`; private as a Supabase function secret.
- [ ] Edge Function `feed-reminder` (scheduled via `pg_cron` every minute): for each `push_subscriptions` row with `reminder_enabled`, query the latest non-deleted `feed` event for that household; if `now - occurred_at >= interval_minutes` and we haven't already notified for that feed (track `last_notified_feed_id` on the subscription), send Web Push and record it. **Server owns the data, so no client re-arm is needed** — this is the payoff of doing the backend first.
- [ ] SW `push` + `notificationclick` handlers (from the shelved plan) show the reminder and focus the app.
- [ ] Manual on phone: enable reminders, log a bottle, close the app, wait the interval → push arrives. Log another bottle → next reminder recomputes off it. **Commit:** `feat: server-side feed-interval push notifications`.

> **CHECKPOINT S-F** ✅ — two caregivers share a baby across devices with live sync, and interval reminders fire server-side. **ACCOUNTS + SYNC COMPLETE.**

---

# PHASE 7 — Docs + regression

### Task 11: Finalise
- [ ] Update `CLAUDE.md` tech stack (Supabase, sync layer) and `CONTEXT.md` glossary (household, caregiver, sync, tombstone).
- [ ] Confirm ADR-0002 matches what was built; note any deviations.
- [ ] `npm run test` fully green (unit + RLS + sync reconcile); `npm run build` clean; deploy client (Vercel env set) + Supabase migrations + Edge Function.
- [ ] Delete the superseded `2026-07-02-notifications.md` plan.

---

## Risks & notes for the implementer

- **RLS is the security boundary — get it right and test it.** A missing/incorrect policy leaks another family's data. Phase 2's tests are not optional.
- **Keep `storage.ts`'s public API stable.** The whole point (ADR-0001) is that pages/components don't change. If a signature has to change, that's a smell — push the change into the sync layer instead.
- **Sync must never block local writes.** Every push/pull is fire-and-forget; offline must feel identical to online for logging.
- **UUID migration is one-way and touches existing users' data.** Force a JSON export first (reuse `backup.ts`) and make the Dexie `upgrade()` idempotent and well-tested before shipping.
- **Timestamps in UTC everywhere** (`timestamptz`, epoch-ms locally); day-bucketing stays client-side in `stats.ts` (keep `TZ=UTC` in the test script).
- **Notifications reuse the SW work** from `2026-07-02-notifications.md` (the `injectManifest` switch + `src/sw.ts` push/notificationclick handlers). Only the *scheduling* differs: server-side Edge Function instead of a client timer.
- **iOS Web Push** needs a Home-Screen-installed PWA on 16.4+; Android is the primary target.
- **Free-tier pause:** a Supabase free project pauses after ~1 week of inactivity — fine for a daily-used app; note it.
- **Secrets:** never commit anon key is fine to ship (public), but service-role key and VAPID private key are secrets — Supabase function secrets only.
