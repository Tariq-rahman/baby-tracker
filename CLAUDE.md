# Baby Tracker — Project Instructions

A local-first, installable **PWA** for tracking a baby's feeds, nappies, weight, and medication. It started single-caregiver/single-device (MVP) and now supports **multi-caregiver sharing + cloud sync** and **server-side feed reminders** — see `CONTEXT.md` for the domain glossary and `docs/adr/` for architectural decisions.

## Tech Stack

- **React + Vite + TypeScript** — TypeScript is mandatory; do not drop to plain JS.
- **Dexie.js over IndexedDB** as the local-first store. All persistence goes through the `src/db/storage.ts` abstraction (not scattered Dexie calls) so the sync layer sits underneath it — see `docs/adr/0001-local-first-storage.md`.
- **Supabase** (Postgres + Auth + RLS + Realtime + Edge Functions + `pg_cron`) as the cloud source of truth and sync backend — see `docs/adr/0002-accounts-and-supabase-sync.md`. Sync is outbox-push + cursor-pull + Realtime, last-write-wins on `updatedAt` with `deletedAt` tombstones.
- **Tailwind CSS** for styling. Favour large, one-handed tap targets.
- **Recharts** for the weight trend chart.
- **vite-plugin-pwa** (Workbox, `injectManifest`) for the service worker + manifest. We own `src/sw.ts` (not a generated SW) so it can handle Web Push `push` / `notificationclick` events. Feed reminders are Web Push (VAPID) sent by the `feed-reminder` Edge Function on a `pg_cron` schedule; the client half lives in `src/lib/push.ts`.
- **Deployment:** static build to **Vercel** (Cloudflare Pages interchangeable). HTTPS required for the service worker.

## Testing

- **Vitest** for unit tests. All pure logic MUST have tests, especially:
  - unit conversions (lb+oz ↔ grams, kg ↔ grams)
  - "time since last event" calculations
  - daily-total aggregation
  - export/import JSON round-trip
- **React Testing Library** for light component tests on the critical logging forms.
- **No E2E** for the MVP.
- New non-trivial functions get tests. Prefer table-driven test cases.

## Conventions

- Functions returning a collection are prefixed `list` (e.g. `listEvents`); functions returning a single item are prefixed `get` (e.g. `getEvent`).
- Weight is always stored internally as **grams (integer, rounded)**; convert only at the UI boundary.
- Event timestamps default to "now" but are always editable (backdating supported).
- Deletes are **soft**: set `deletedAt` and let it sync; never hard-delete synced rows. Every read path must filter `deletedAt == null` — do this in `storage.ts` (`listEvents`/`listMedications`) and read through those, not via direct Dexie queries in hooks/components. The `feed-reminder` Edge Function applies the same `deleted_at IS NULL` filter server-side.
