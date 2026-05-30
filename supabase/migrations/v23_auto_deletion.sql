-- Auto-process account deletion requests after 30 days.
-- Satisfies Apple App Store and Google Play Store data-deletion requirements.
--
-- How it works:
--   1. A pg_cron job runs daily and calls process_pending_deletions().
--   2. Any deletion_requests row with status='pending' and
--      created_at older than 30 days is auto-approved and the user deleted.
--   3. Admins can still approve/reject earlier via the Admin Deletions panel.
--
-- Run this in Supabase SQL Editor.
-- pg_cron is available on Supabase Pro plans. If on Free plan, skip the
-- cron section and process manually via the Admin Deletions panel.

-- ── Add scheduled_for column (tracks when auto-deletion fires) ─────────────
alter table public.deletion_requests
  add column if not exists scheduled_for timestamptz
    generated always as (created_at + interval '30 days') stored;

-- ── Function: auto-delete all overdue pending requests ────────────────────
create or replace function public.process_pending_deletions()
returns void language plpgsql security definer as $$
declare
  r record;
begin
  for r in
    select user_id, email
    from public.deletion_requests
    where status = 'pending'
      and created_at < now() - interval '30 days'
  loop
    begin
      -- Wipe profile data first (foreign-key safe)
      perform public.admin_delete_user(r.user_id);

      -- Mark request as processed
      update public.deletion_requests
         set status = 'approved',
             processed_at = now(),
             processed_by = null  -- null = auto-processed
       where user_id = r.user_id and status = 'pending';

    exception when others then
      -- Log failure but continue processing other users
      raise warning 'auto-deletion failed for %: %', r.email, sqlerrm;
    end;
  end loop;
end;
$$;

grant execute on function public.process_pending_deletions() to service_role;

-- ── pg_cron: schedule daily at 02:00 UTC (Pro plan only) ─────────────────
-- If pg_cron is not available, comment this block out.
-- To verify availability: SELECT * FROM pg_extension WHERE extname = 'pg_cron';
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'auto-delete-accounts',          -- job name
      '0 2 * * *',                     -- daily at 02:00 UTC
      'select public.process_pending_deletions()'
    );
  end if;
end $$;
