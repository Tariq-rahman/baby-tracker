---
status: accepted
supersedes: 0001 (in part — see below)
---

# Accounts + Supabase-backed sync for multi-caregiver sharing

We are adding user accounts and cloud sync so more than one caregiver (e.g. both parents) can track the same baby from separate devices, with data surviving device loss. **Supabase** (managed Postgres + Auth + Row-Level Security + Realtime + Edge Functions) becomes the source of truth. The app stays offline-capable: IndexedDB (Dexie) is kept as a local write-through cache, and a sync layer reconciles it with Supabase.

This revisits — and partly supersedes — ADR-0001. Baby data is no longer local-only; it lives server-side, scoped to a household. ADR-0001's core engineering discipline (all persistence behind the `src/db/storage.ts` boundary) is what makes this change cheap, and it stands.

## Context and trade-off

ADR-0001 deliberately shipped the MVP local-first with no backend, while naming the two requirements that would eventually force a backend: reliable push notifications and multi-caregiver shared data. Both are now in scope. Rather than build a throwaway notification-only timer first, we go straight to the real backend; notifications become a small feature riding on server-side data (the server knows the last feed, so a scheduled function computes "since last" directly — no client-driven timer needed).

The data is favourable for sync: it is essentially an **append-only event log** (feeds, nappies, doses, weights). Two caregivers concurrently editing the *same* record is rare; almost all writes are independent appends. This means **last-write-wins per record + soft-delete tombstones** is sufficient — no CRDTs, no merge engine.

## Considered options

- **Firebase (Firestore)** — rejected: excellent automatic offline sync, but a NoSQL document model fits our relational, aggregation-heavy data (daily totals, weight trend, "since last") worse; sharing via Security Rules is fiddlier; higher lock-in. Its main advantage (built-in offline sync) matters most when conflict resolution is hard, and here it isn't.
- **Roll our own (Cloudflare Workers + D1)** — rejected for now: maximum control and lowest cost, but we would hand-build auth, sessions, invites, and sync plumbing. Strictly more work with no benefit at family scale.
- **Supabase** — chosen: Postgres fits the relational event log and SQL aggregations; Row-Level Security models "only this household sees this baby" declaratively and enforces it at the database; built-in Auth (magic-link / OAuth); Realtime for live cross-device updates; Edge Functions + `pg_cron` for scheduled Web Push. Low lock-in (portable Postgres). Generous free tier.
- **Dexie Cloud** — considered: purpose-built local-first sync that would minimise sync code, but it is a paid product tied to its own backend and would not host our auth/sharing/notifications the way Supabase does. Rejected to avoid a second vendor.

## Decision

- **Supabase is the source of truth.** Postgres holds `households`, `household_members`, `babies`, `medications`, `events`, and `push_subscriptions`. RLS scopes every row to members of the owning household.
- **Dexie stays as the offline cache.** The app reads/writes Dexie synchronously for instant, offline-capable UX; a sync layer pushes local changes to Supabase and pulls remote changes.
- **The `storage.ts` boundary is preserved.** Feature code keeps calling `addEvent` / `listEvents` / etc. Only the internals of `storage.ts` (+ a new sync module and hooks) change. This is ADR-0001's abstraction paying off exactly as intended.
- **IDs move to client-generated UUIDs.** Dexie's auto-increment (`++id`) is replaced by UUIDs so offline creates on two devices never collide. Every synced record carries `updated_at` and a nullable `deleted_at` tombstone.
- **Conflict resolution: last-write-wins on `updated_at`.** Deletes are soft (tombstones) so they propagate.
- **Auth: magic-link email as the primary method** (simplest for a PWA; no OAuth redirect setup), with Google optional later.
- **Sharing via household invites.** A user creates a household, invites a second caregiver by email; accepting adds a `household_members` row. Multi-baby falls out naturally (a household can own several babies).
- **Notifications ride on the backend.** Web Push subscriptions are stored server-side; a scheduled Edge Function (via `pg_cron`) computes interval reminders ("N hours since last feed") from the events table and sends pushes. No client timer.

## Consequences

- **New operational surface:** a Supabase project, database migrations, RLS policies, Edge Functions, and secrets (VAPID keys) to manage. This is the cost ADR-0001 deferred; we accept it now.
- **The app is no longer zero-cost/zero-account by default.** It still works offline once logged in, but first use requires an account and network. (A logged-out/local-only mode could be retained as a fallback but is out of scope for this ADR.)
- **JSON export/import (ADR-0001) is retained** as a belt-and-braces backup and as the migration input path for existing local data.
- **Migration required:** existing single-device installs must import their local IndexedDB data into a household on first login (int IDs → UUIDs).
- **Realtime sync between caregivers** is expected while online; offline edits reconcile on reconnect via the outbox + pull cursor.
- **Security posture:** correctness now depends on RLS policies being right. Policies must be tested (a member of household A must never read household B). This is the highest-risk area and gets explicit test coverage.
- **iOS Web Push caveat** (Home-Screen-installed PWAs, iOS 16.4+) still applies; Android is the primary target as in the MVP.
