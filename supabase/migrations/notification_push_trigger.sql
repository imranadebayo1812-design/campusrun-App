-- Wire push notifications: call send-push Edge Function on every notification insert.
-- This is the missing link — without this trigger, send-push never fires.
-- Run ONCE in Supabase Dashboard → SQL Editor

create or replace function public.call_send_push_on_notification()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://xwnedkgpwhbmoxanhmth.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bmVka2dwd2hibW94YW5obXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDUyMDcsImV4cCI6MjA5NDI4MTIwN30.grC_0lH2WNbA6pDv4z3yKhv_5myqXWcP6rroR1xm5A0'
    ),
    body    := jsonb_build_object('record', row_to_json(NEW))
  );
  return NEW;
exception when others then
  -- Never let a push failure block the notification insert
  return NEW;
end;
$$;

drop trigger if exists on_notification_insert_send_push on public.notifications;
create trigger on_notification_insert_send_push
  after insert on public.notifications
  for each row
  execute function public.call_send_push_on_notification();
