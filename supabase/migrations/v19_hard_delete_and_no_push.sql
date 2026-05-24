-- 1. Drop push notification trigger (no more FCM calls on notification insert)
drop trigger if exists on_notification_insert_send_push on public.notifications;
drop function if exists public.call_send_push_on_notification();

-- 2. Table to store wallet balance before a user is hard-deleted
--    (no FK on user_id because the auth row will be gone)
create table if not exists public.deletion_refund_log (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        not null,
  email          text,
  wallet_balance numeric     not null default 0,
  deleted_at     timestamptz not null default now(),
  refunded       boolean     not null default false,
  refund_note    text
);

alter table public.deletion_refund_log enable row level security;

create policy "Admins can manage refund log"
  on public.deletion_refund_log for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- 3. Update admin_delete_user to hard-delete from auth.users
--    • Captures email + wallet balance into deletion_refund_log first
--    • Deletes from auth.users — cascades to profiles and linked rows
--    • User's email is freed so they can re-register as a brand new customer
create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_email   text;
  v_balance numeric;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  -- Read before deletion so we can log the refund amount
  select email, coalesce(wallet_balance, 0)
  into   v_email, v_balance
  from   public.profiles
  where  id = p_user_id;

  -- Store for admin refund reference
  insert into public.deletion_refund_log (user_id, email, wallet_balance)
  values (p_user_id, v_email, v_balance);

  -- Hard delete — cascades to profiles, deletion_requests, and all linked data
  -- User's email is now free; they can sign up again as a new customer
  delete from auth.users where id = p_user_id;
end;
$$;
