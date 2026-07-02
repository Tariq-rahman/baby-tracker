-- Baby Tracker — household invites (ADR-0002, Task 9).
-- A caregiver shares their household with a second caregiver via a short, single-
-- use code. The owner generates a code (create_invite); the invitee redeems it
-- (accept_invite), which adds them to the household and *absorbs* their own empty
-- auto-created household so getHouseholdId() keeps resolving a single household.
--
-- Acceptance runs through a `security definer` RPC (reserved for in 0002): the
-- invitee is not a member of the target household yet, so RLS would block a direct
-- insert into household_members. The RPC validates the code and writes across the
-- RLS boundary as the table owner.

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------

create table invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  code         text not null unique,
  created_by   uuid not null references auth.users (id) on delete cascade,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,          -- null until redeemed (single-use)
  created_at   timestamptz not null default now()
);

create index invites_household_idx on invites (household_id);

-- ---------------------------------------------------------------------------
-- RLS: only a household's owner sees or manages its invites. The invitee never
-- touches this table directly — accept_invite (security definer) does it for them.
-- ---------------------------------------------------------------------------

alter table invites enable row level security;

create policy invites_select on invites
  for select using (is_household_owner(household_id));

create policy invites_insert on invites
  for insert with check (is_household_owner(household_id));

create policy invites_update on invites
  for update using (is_household_owner(household_id)) with check (is_household_owner(household_id));

create policy invites_delete on invites
  for delete using (is_household_owner(household_id));

grant select, insert, update, delete on invites to authenticated;

-- ---------------------------------------------------------------------------
-- Code generation. A short, human-shareable code over an unambiguous alphabet
-- (no I/L/O/0/1). 31^8 ≈ 8.5e11 combinations; single-use + 7-day expiry.
-- ---------------------------------------------------------------------------

create or replace function gen_invite_code() returns text
language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1),
    ''
  )
  from generate_series(1, 8);
$$;

-- ---------------------------------------------------------------------------
-- create_invite() — mint a code for the caller's owned household. Retries on the
-- (astronomically unlikely) code collision. Returns the code for the owner to share.
-- ---------------------------------------------------------------------------

create or replace function create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_household uuid;
  v_code      text;
  v_attempts  int := 0;
begin
  select household_id into v_household
  from household_members
  where user_id = auth.uid() and role = 'owner'
  order by created_at
  limit 1;

  if v_household is null then
    raise exception 'caller does not own a household';
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := gen_invite_code();
    begin
      insert into invites (household_id, code, created_by, expires_at)
      values (v_household, v_code, auth.uid(), now() + interval '7 days');
      return v_code;
    exception when unique_violation then
      if v_attempts >= 5 then
        raise exception 'could not generate a unique invite code';
      end if;
    end;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- accept_invite(code) — redeem a code: join the household, mark the invite used,
-- and absorb the caller's own empty auto-created household(s) so they belong to a
-- single household. Only households with no other members and no live data are
-- removed — a pre-existing user's data is never merged/deleted (out of MVP scope).
-- Returns { household_id, household_name } for the client to confirm + re-pull.
-- ---------------------------------------------------------------------------

create or replace function accept_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_invite invites;
  v_name   text;
  v_own    uuid;
begin
  select * into v_invite
  from invites
  where code = upper(trim(p_code))
    and accepted_at is null
    and expires_at > now();

  if v_invite.id is null then
    raise exception 'invalid or expired invite code';
  end if;

  insert into household_members (household_id, user_id, role)
  values (v_invite.household_id, auth.uid(), 'caregiver')
  on conflict (household_id, user_id) do nothing;

  update invites set accepted_at = now() where id = v_invite.id;

  for v_own in
    select hm.household_id
    from household_members hm
    where hm.user_id = auth.uid()
      and hm.role = 'owner'
      and hm.household_id <> v_invite.household_id
  loop
    if not exists (select 1 from household_members m
                   where m.household_id = v_own and m.user_id <> auth.uid())
       and not exists (select 1 from babies b
                       where b.household_id = v_own and b.deleted_at is null)
       and not exists (select 1 from events e
                       where e.household_id = v_own and e.deleted_at is null)
    then
      delete from households where id = v_own; -- cascades members/babies/medications/events
    end if;
  end loop;

  select name into v_name from households where id = v_invite.household_id;
  return jsonb_build_object('household_id', v_invite.household_id, 'household_name', v_name);
end;
$$;

grant execute on function create_invite() to authenticated;
grant execute on function accept_invite(text) to authenticated;
