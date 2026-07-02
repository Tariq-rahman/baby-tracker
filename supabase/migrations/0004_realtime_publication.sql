-- Baby Tracker — enable Realtime for the synced tables (ADR-0002, Task 8).
-- The client's subscribeRealtime() listens to postgres_changes on these tables so
-- a change on one device pushes to others within a second. Without membership in
-- the supabase_realtime publication no change events are broadcast (the periodic
-- poll still converges, just not live). Soft-deletes are UPDATEs, so the default
-- replica identity (primary key) suffices — no DELETE replication needed.

alter publication supabase_realtime add table babies;
alter publication supabase_realtime add table medications;
alter publication supabase_realtime add table events;
