-- RLS isolation tests (pgTAP). Proves a member of household A can never read or
-- write household B's data. Run via `supabase test db`.
--
-- We impersonate users by setting the `request.jwt.claims` GUC (what auth.uid()
-- reads) and switching to the `authenticated` role, exactly as PostgREST does per
-- request. All fixtures are created as superuser first, then we drop privileges.

begin;
select plan(7);

-- --- Fixtures (as superuser; RLS not enforced for the table owner) ----------
-- Inserting into auth.users fires handle_new_user(), which creates a household
-- and an owner membership for each user.
insert into auth.users (id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.local');

create temporary table _ctx as
select
  '11111111-1111-1111-1111-111111111111'::uuid as a_user,
  '22222222-2222-2222-2222-222222222222'::uuid as b_user,
  (select household_id from household_members where user_id = '11111111-1111-1111-1111-111111111111') as a_household,
  (select household_id from household_members where user_id = '22222222-2222-2222-2222-222222222222') as b_household;

-- The temp table is owned by the superuser; let the authenticated role read it.
grant select on _ctx to authenticated;

-- --- Act as user A ----------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select a_user::text from _ctx), 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$ insert into babies (household_id, name, date_of_birth)
     values ((select a_household from _ctx), 'Baby A', '2026-01-01') $$,
  'A can insert a baby into own household'
);

select lives_ok(
  $$ insert into events (baby_id, household_id, type, occurred_at, payload)
     values (
       (select id from babies where household_id = (select a_household from _ctx) limit 1),
       (select a_household from _ctx),
       'feed', now(), '{"volumeMl":120}'
     ) $$,
  'A can insert an event into own household'
);

select is(
  (select count(*)::int from events),
  1,
  'A sees exactly its own event'
);

-- A must not be able to write into B's household (RLS with-check → 42501).
select throws_ok(
  $$ insert into babies (household_id, name, date_of_birth)
     values ((select b_household from _ctx), 'Sneaky', '2026-01-01') $$,
  '42501',
  null,
  'A cannot insert a baby into B household (RLS with-check blocks it)'
);

-- --- Act as user B ----------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select b_user::text from _ctx), 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from events),
  0,
  'B cannot see any of A''s events'
);

select is(
  (select count(*)::int from babies),
  0,
  'B cannot see any of A''s babies'
);

select is(
  (select count(*)::int from households where id = (select a_household from _ctx)),
  0,
  'B cannot see A''s household row'
);

select * from finish();
rollback;
