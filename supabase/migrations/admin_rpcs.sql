-- admin_rpcs.sql
-- Run once in Supabase Dashboard → SQL Editor
-- Creates missing RPCs called by the admin portal

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Schema fixes for courier_withdrawals
--    Add 'rejected' and 'approved' to status, add rejection columns
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.courier_withdrawals
  add column if not exists rejected_at   timestamptz,
  add column if not exists reject_reason text,
  add column if not exists approved_at   timestamptz;

-- Widen the status check to include all states the UI uses
alter table public.courier_withdrawals
  drop constraint if exists courier_withdrawals_status_check;
alter table public.courier_withdrawals
  add constraint courier_withdrawals_status_check
  check (status in ('pending', 'processing', 'approved', 'completed', 'failed', 'rejected'));

-- Ensure deletion_requests table exists (used by AdminDeletions)
create table if not exists public.deletion_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  reason      text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);
alter table public.deletion_requests enable row level security;
create policy if not exists "Users submit own deletion requests"
  on public.deletion_requests for insert with check (user_id = auth.uid());
create policy if not exists "Admins manage deletion requests"
  on public.deletion_requests for all using (public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. admin_delete_user
--    Soft-deletes a user: blacklists the profile (blocks app access),
--    anonymises PII, and marks the deletion_request as approved.
--    Hard auth deletion is not possible client-side and must be done manually
--    in Supabase Dashboard → Authentication → Users if required.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  -- Block the account immediately
  update public.profiles
  set
    is_blacklisted    = true,
    blacklist_reason  = 'Account deleted by admin',
    full_name         = '[Deleted User]',
    phone_number      = null,
    hostel            = null,
    course            = null,
    referral_code     = null,
    referred_by       = null
  where id = p_user_id;

  -- Mark the deletion request as approved
  update public.deletion_requests
  set status = 'approved', reviewed_at = now()
  where user_id = p_user_id and status = 'pending';
end;
$$;
grant execute on function public.admin_delete_user(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. admin_reject_withdrawal
--    Rejects a pending withdrawal request with a reason.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason        text default 'Rejected by admin'
)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  update public.courier_withdrawals
  set
    status      = 'rejected',
    rejected_at = now(),
    reject_reason = p_reason
  where id = p_withdrawal_id
    and status = 'pending';

  if not found then
    raise exception 'withdrawal_not_found_or_already_actioned';
  end if;

  -- Notify the courier
  insert into public.notifications (user_id, type, title, body)
  select courier_id, 'withdrawal',
    'Withdrawal Request Rejected',
    'Your withdrawal of ₦' || gross_amount::text || ' was rejected. Reason: ' || p_reason
  from public.courier_withdrawals
  where id = p_withdrawal_id;
end;
$$;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;
