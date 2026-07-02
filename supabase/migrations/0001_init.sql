-- Baby Tracker — core schema (ADR-0002).
-- Source of truth for households, babies, medications, and the append-only event log.
-- Every synced record carries updated_at + a nullable deleted_at tombstone so the
-- client sync layer can do last-write-wins reconciliation and propagate deletes.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- households: the unit of sharing. Multiple caregivers, multiple babies.
create table households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- membership: which users belong to which household.
create table household_members (
  household_id uuid not null references households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'caregiver', -- 'owner' | 'caregiver'
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on household_members (user_id);

-- babies (multi-baby falls out naturally).
create table babies (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households (id) on delete cascade,
  name          text not null,
  date_of_birth date not null,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index babies_household_idx on babies (household_id, updated_at);

create table medications (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  name         text not null,
  default_dose numeric not null,
  unit         text not null, -- 'ml' | 'mg' | 'IU' | 'drops'
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index medications_household_idx on medications (household_id, updated_at);

-- events: the append-only log. Common columns + jsonb payload for type-specifics.
-- payload holds: volumeMl, content (feed); nappyType, size (nappy); grams (weight);
-- medicationId, doseAmount (dose).
create table events (
  id           uuid primary key default gen_random_uuid(),
  baby_id      uuid not null references babies (id) on delete cascade,
  household_id uuid not null references households (id) on delete cascade, -- denormalised for RLS speed
  type         text not null, -- 'feed' | 'nappy' | 'weight' | 'dose'
  occurred_at  timestamptz not null,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index events_household_occurred_idx on events (household_id, occurred_at desc);
create index events_household_updated_idx on events (household_id, updated_at); -- pull cursor

-- push_subscriptions: Web Push endpoints per user/household + reminder config.
create table push_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  household_id          uuid not null references households (id) on delete cascade,
  endpoint              text not null unique,
  p256dh                text not null,
  auth                  text not null,
  reminder_enabled      boolean not null default false,
  interval_minutes      int not null default 180,
  last_notified_feed_id uuid,        -- de-dupe: don't re-notify for the same feed
  last_notified_at      timestamptz,
  created_at            timestamptz not null default now()
);

create index push_subscriptions_household_idx on push_subscriptions (household_id);

-- ---------------------------------------------------------------------------
-- updated_at auto-bump trigger
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger babies_set_updated_at
  before update on babies
  for each row execute function set_updated_at();

create trigger medications_set_updated_at
  before update on medications
  for each row execute function set_updated_at();

create trigger events_set_updated_at
  before update on events
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-household on signup
-- ---------------------------------------------------------------------------
-- Every new auth user gets their own household + owner membership so a first-time
-- user always has somewhere to write. Runs as security definer to write across
-- the RLS boundary during the auth trigger.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_household_id uuid;
begin
  insert into households (name)
  values (coalesce(new.raw_user_meta_data ->> 'household_name', 'My family'))
  returning id into new_household_id;

  insert into household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
