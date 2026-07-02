-- Schedule the feed-reminder Edge Function every minute via pg_cron + pg_net.
--
-- PREREQUISITE — before this cron will actually fire, store two Vault secrets
-- (Dashboard → Project Settings → Vault, or SQL) so the job can reach the
-- function endpoint with the service-role key:
--
--   select vault.create_secret('https://YOUR_REF.supabase.co', 'project_url');
--   select vault.create_secret('YOUR_SERVICE_ROLE_KEY',        'service_role_key');
--
-- Creating the schedule succeeds without them; individual runs simply no-op
-- until the secrets exist.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'feed-reminder-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/feed-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
