CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cron_config TO service_role;
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_config (key, value) VALUES
  ('veille_cron_token', md5(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text)),
  ('veille_cron_url', 'https://commerce.rmsenergies.com/api/public/cron/veille-daily')
ON CONFLICT (key) DO NOTHING;

SELECT cron.schedule(
  'veille-daily-recap',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM public.cron_config WHERE key = 'veille_cron_url'),
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM public.cron_config WHERE key = 'veille_cron_token'),
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 120000
  );
  $$
);