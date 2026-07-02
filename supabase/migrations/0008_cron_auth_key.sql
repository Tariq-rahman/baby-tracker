-- Re-point the feed-reminder cron at a dedicated `cron_auth_key` Vault secret
-- instead of `service_role_key`.
--
-- The Bearer token on the cron's http_post only has to satisfy the Edge
-- Function's `verify_jwt` gate — the function does its privileged work with the
-- auto-injected SERVICE_ROLE_KEY internally, never with the caller's token. So
-- the (public) anon key is a sufficient and safer bearer: no service-role secret
-- is placed in Vault, and triggering the function leaks nothing (it returns only
-- `{checked, sent}` counts and can't cause duplicate sends).
--
-- PREREQUISITE — store the anon key under `cron_auth_key` (and `project_url`)
-- before this cron will authenticate successfully:
--
--   select vault.create_secret('https://YOUR_REF.supabase.co', 'project_url');
--   select vault.create_secret('YOUR_ANON_KEY',                'cron_auth_key');

select cron.schedule(
  'feed-reminder-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/feed-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_auth_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
