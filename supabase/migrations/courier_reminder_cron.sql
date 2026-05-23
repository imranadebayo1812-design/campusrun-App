-- 30-minute courier reminder cron
-- Requires pg_cron (available on Supabase Pro).
-- On free tier: Supabase Dashboard → Edge Functions → select courier-reminder → Schedule → add */30 * * * *

select cron.schedule(
  'courier-reminder',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://xwnedkgpwhbmoxanhmth.supabase.co/functions/v1/courier-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bmVka2dwd2hibW94YW5obXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDUyMDcsImV4cCI6MjA5NDI4MTIwN30.grC_0lH2WNbA6pDv4z3yKhv_5myqXWcP6rroR1xm5A0'
    ),
    body    := '{}'::jsonb
  )
  $$
);
