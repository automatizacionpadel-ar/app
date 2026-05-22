-- Verificar que pg_cron y pg_net están habilitados en el proyecto Supabase
-- (Database > Extensions > pg_cron y pg_net).
-- Reemplazar <PROJECT_URL> y <SERVICE_ROLE_KEY> con los valores del proyecto.

-- Eliminar jobs existentes si los hay (idempotente)
DO $$ BEGIN PERFORM cron.unschedule('reminders-24h'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('reminders-2h');  EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Recordatorio 24h: se ejecuta cada hora en punto
SELECT cron.schedule(
  'reminders-24h',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := '<PROJECT_URL>/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
    body    := '{"hours_before": 24}'::jsonb
  )
  $$
);

-- Recordatorio 2h: se ejecuta cada 30 minutos
SELECT cron.schedule(
  'reminders-2h',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := '<PROJECT_URL>/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
    body    := '{"hours_before": 2}'::jsonb
  )
  $$
);
