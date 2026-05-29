-- ============================================================
-- v20: Security hardening
-- 1. Prevent users from self-promoting to courier via REST API
-- 2. Helper for is_courier snapshot (mirrors wallet/admin pattern)
-- ============================================================

-- Helper: read is_courier without RLS recursion
create or replace function public._snap_is_courier(p_id uuid)
returns boolean language sql security definer stable as $$
  select is_courier from public.profiles where id = p_id;
$$;

-- Drop + recreate the buyer profile update policy to lock is_courier
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using  (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Cannot self-increase or self-decrease wallet balance
    and wallet_balance = public._snap_wallet_balance(auth.uid())
    -- Cannot self-promote to admin
    and is_admin       = public._snap_is_admin(auth.uid())
    -- Cannot self-promote to courier — must go through admin toggle
    and is_courier     = public._snap_is_courier(auth.uid())
  );
