-- Baby Tracker — per-household Enabled Event Types (ADR-0004).
-- Stored as jsonb on the baby row so it rides the existing baby sync loop
-- (no new synced table). Absent/empty ({}) ⇒ the client applies
-- DEFAULT_ENABLED_EVENT_TYPES. Shape: { "enabledEventTypes": ["feed", ...] }.
alter table babies add column if not exists settings jsonb not null default '{}';
