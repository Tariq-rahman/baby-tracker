-- Invite-flow tests (pgTAP) for migration 0005. Proves create_invite/accept_invite
-- behave: an owner mints a code, an invitee redeems it to join, the invitee's own
-- EMPTY auto-created household is absorbed, a household WITH data is preserved, and
-- a used/invalid code is rejected.
--
-- Same impersonation trick as rls.test.sql: set the request.jwt.claims GUC (what
-- auth.uid() reads) and switch to the `authenticated` role. We `reset role` back to
-- superuser between actors to capture the (RLS-protected) invite code and to assert
-- final state without RLS in the way.

begin;
select plan(11);

-- --- Fixtures (as superuser) ------------------------------------------------
-- Each auth.users insert fires handle_new_user() → a household + owner membership.
insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'b@test.local'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'c@test.local');

create temporary table _ctx as
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid as a_user,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid as b_user,
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid as c_user,
  (select household_id from household_members where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as a_hh,
  (select household_id from household_members where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') as b_hh,
  (select household_id from household_members where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') as c_hh;
grant select on _ctx to authenticated;

-- C's household has data, so absorption must NOT delete it.
insert into babies (household_id, name, date_of_birth)
  values ((select c_hh from _ctx), 'Baby C', '2026-01-01');

-- === A mints an invite ======================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select a_user::text from _ctx), 'role', 'authenticated')::text, true);

select isnt(create_invite(), null, 'A can mint an invite code');

reset role;
create temporary table _inv as
  select code from invites where household_id = (select a_hh from _ctx) limit 1;
grant select on _inv to authenticated;
select is(length((select code from _inv)), 8, 'invite code is 8 characters');

-- === B redeems it ===========================================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select b_user::text from _ctx), 'role', 'authenticated')::text, true);

select isnt(accept_invite((select code from _inv)), null, 'B can accept A''s invite');

reset role;
select is(
  (select count(*)::int from household_members
   where household_id = (select a_hh from _ctx) and user_id = (select b_user from _ctx)),
  1, 'B is now a member of A''s household');
select is(
  (select count(*)::int from households where id = (select b_hh from _ctx)),
  0, 'B''s own empty household is absorbed');
select isnt(
  (select accepted_at from invites where code = (select code from _inv)),
  null, 'the invite is marked accepted (single-use)');

-- === Reuse + invalid codes are rejected =====================================
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select b_user::text from _ctx), 'role', 'authenticated')::text, true);

select throws_ok(
  format($$ select accept_invite(%L) $$, (select code from _inv)),
  'P0001', null, 'a used code cannot be redeemed again');
select throws_ok(
  $$ select accept_invite('ZZZZZZZZ') $$,
  'P0001', null, 'an unknown code is rejected');

-- === C (has data) joins: membership added, own household preserved ==========
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select a_user::text from _ctx), 'role', 'authenticated')::text, true);
select create_invite();  -- A mints a fresh code for C

reset role;
create temporary table _inv2 as
  select code from invites where household_id = (select a_hh from _ctx) and accepted_at is null limit 1;
grant select on _inv2 to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select c_user::text from _ctx), 'role', 'authenticated')::text, true);
select isnt(accept_invite((select code from _inv2)), null, 'C can accept a fresh invite');

reset role;
select is(
  (select count(*)::int from household_members
   where household_id = (select a_hh from _ctx) and user_id = (select c_user from _ctx)),
  1, 'C is now a member of A''s household');
select is(
  (select count(*)::int from households where id = (select c_hh from _ctx)),
  1, 'C''s household with data is NOT absorbed');

select * from finish();
rollback;
