-- Baby Tracker — Row-Level Security (ADR-0002).
-- RLS is THE security boundary: a member of household A must never read or write
-- household B's data. Every table is locked down and scoped to household membership.
--
-- Recursion note: the helper functions are `security definer` and owned by the
-- migration role (which owns the tables and is therefore exempt from RLS), so a
-- policy on household_members can call is_household_member() without recursing
-- back through RLS.

-- ---------------------------------------------------------------------------
-- Membership predicates
-- ---------------------------------------------------------------------------

create or replace function is_household_member(h uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from household_members m
    where m.household_id = h and m.user_id = auth.uid()
  );
$$;

create or replace function is_household_owner(h uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from household_members m
    where m.household_id = h and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------

alter table households         enable row level security;
alter table household_members  enable row level security;
alter table babies             enable row level security;
alter table medications        enable row level security;
alter table events             enable row level security;
alter table push_subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------

create policy households_select on households
  for select using (is_household_member(id));

-- Any authenticated user may create a household (they add their own membership
-- separately, or the signup trigger does it).
create policy households_insert on households
  for insert to authenticated with check (true);

create policy households_update on households
  for update using (is_household_owner(id)) with check (is_household_owner(id));

create policy households_delete on households
  for delete using (is_household_owner(id));

-- ---------------------------------------------------------------------------
-- household_members
-- ---------------------------------------------------------------------------

create policy household_members_select on household_members
  for select using (is_household_member(household_id));

-- Owners manage membership. (Invite acceptance goes through a security-definer
-- RPC in a later phase, which bypasses this.)
create policy household_members_insert on household_members
  for insert with check (is_household_owner(household_id));

create policy household_members_update on household_members
  for update using (is_household_owner(household_id)) with check (is_household_owner(household_id));

create policy household_members_delete on household_members
  for delete using (is_household_owner(household_id));

-- ---------------------------------------------------------------------------
-- babies / medications / events — full CRUD scoped to household membership
-- ---------------------------------------------------------------------------

create policy babies_rw on babies
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy medications_rw on medications
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy events_rw on events
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- push_subscriptions — a user manages only their own device subscriptions,
-- and only within a household they belong to. (The reminder Edge Function reads
-- these with the service-role key, which bypasses RLS.)
-- ---------------------------------------------------------------------------

create policy push_subscriptions_rw on push_subscriptions
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- Table-level grants. RLS restricts which *rows* a role sees; these grants
-- give the `authenticated` role the *table* privileges to reach them at all.
-- Logged-out (`anon`) users get nothing. Do not depend on default privileges.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on
  households, household_members, babies, medications, events, push_subscriptions
  to authenticated;
