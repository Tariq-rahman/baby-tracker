---
status: accepted
---

# Local-first storage with no backend for the MVP

The baby tracker MVP is single-caregiver, single-device. We store all data locally in the browser (IndexedDB) and provide manual JSON export/import as the backup-and-restore mechanism, rather than building a backend with cloud storage now.

## Context and trade-off

We know two future requirements point toward a backend: reliable push notifications (interval + scheduled reminders) and multi-caregiver shared/synced data. A backend now would serve both and survive device loss. We deliberately chose local-first anyway to ship a working, offline-capable app fast with zero hosting, accounts, or recurring cost.

## Considered options

- **Local-only, no backup** — rejected: a cleared cache or lost phone destroys months of baby records.
- **Local-first + manual JSON export/import** — chosen: cheap insurance against data loss, no infra, no accounts, fully offline.
- **Backend with cloud storage now** — rejected for MVP: accounts, hosting, and cost contradict the single-user "keep it simple" goal, despite being the eventual home for push and multi-caregiver.

## Consequences

- The data model and storage access must be abstracted behind a clear interface so a backend/sync layer can be added later without rewriting feature code.
- Reliable push notifications likely require revisiting this decision (a backend or push server). Best-effort local notifications are the fallback until then.
- Multi-caregiver sync is explicitly out of scope until storage moves server-side.
