-- Baby Tracker — finish the 0006 invite hardening.
-- Supabase's default privileges grant EXECUTE directly to `anon` (not via PUBLIC),
-- so 0006's `revoke ... from public` left the anon grant intact. Revoke it
-- explicitly: only signed-in users mint or redeem invites.

revoke execute on function create_invite() from anon;
revoke execute on function accept_invite(text) from anon;
