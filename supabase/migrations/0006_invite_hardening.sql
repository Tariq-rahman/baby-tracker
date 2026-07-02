-- Baby Tracker — invite-function hardening (follow-up to 0005).
-- Two advisor findings from 0005, both defence-in-depth:
--   1. gen_invite_code() had a role-mutable search_path (it references only
--      built-ins, but pin it to satisfy the linter and match the other funcs).
--   2. create_invite()/accept_invite() were executable by `anon` via the default
--      PUBLIC grant. They no-op/fail without auth.uid(), but restrict them to
--      signed-in users explicitly.

create or replace function gen_invite_code() returns text
language sql volatile set search_path = public as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1),
    ''
  )
  from generate_series(1, 8);
$$;

revoke execute on function create_invite() from public;
revoke execute on function accept_invite(text) from public;

-- authenticated keeps its explicit grant from 0005; re-assert for clarity.
grant execute on function create_invite() to authenticated;
grant execute on function accept_invite(text) to authenticated;
