-- ============================================================
-- v15: Financial field hardening
-- Prevents authenticated users from directly overwriting
-- wallet_balance, is_admin, or payment_verified via the REST API.
-- All legitimate mutations go through security definer RPCs or
-- service-role edge functions — those bypass RLS entirely.
-- ============================================================

-- Helper: read wallet_balance without triggering RLS recursion
create or replace function public._snap_wallet_balance(p_id uuid)
returns numeric language sql security definer stable as $$
  select wallet_balance from public.profiles where id = p_id;
$$;

-- Helper: read is_admin without triggering RLS recursion
create or replace function public._snap_is_admin(p_id uuid)
returns boolean language sql security definer stable as $$
  select is_admin from public.profiles where id = p_id;
$$;

-- Helper: read payment_verified without triggering RLS recursion
create or replace function public._snap_payment_verified(p_id uuid)
returns boolean language sql security definer stable as $$
  select payment_verified from public.deliveries where id = p_id;
$$;

-- ── Profiles: lock wallet_balance + is_admin ─────────────────
-- Drop existing buyer UPDATE policy and recreate with WITH CHECK
drop policy if exists "Users can update own profile"   on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using  (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Cannot self-increase or self-decrease wallet balance
    and wallet_balance = public._snap_wallet_balance(auth.uid())
    -- Cannot self-promote to admin
    and is_admin       = public._snap_is_admin(auth.uid())
  );

-- ── Deliveries: lock payment_verified ────────────────────────
-- Drop existing buyer UPDATE policy and recreate with WITH CHECK
drop policy if exists "Buyers can update own active deliveries" on public.deliveries;
drop policy if exists "Buyers can update own delivery"          on public.deliveries;

create policy "Buyers can update own active deliveries"
  on public.deliveries for update
  using  (buyer_id = auth.uid())
  with check (
    buyer_id = auth.uid()
    -- Cannot flip payment_verified directly — use verify-payment edge function
    and payment_verified = public._snap_payment_verified(id)
  );

-- ── record_topup: idempotency via unique index ───────────────
-- Prevents double-crediting if two simultaneous requests slip
-- through the check-then-insert window.
create unique index if not exists wallet_transactions_reference_uq
  on public.wallet_transactions (reference)
  where reference is not null;

-- Patch record_topup to use ON CONFLICT instead of a plain check
create or replace function public.record_topup(p_reference text, p_amount integer)
returns void language plpgsql security definer as $$
declare
  v_balance numeric;
begin
  update public.profiles
  set    wallet_balance = wallet_balance + p_amount
  where  id = auth.uid()
  returning wallet_balance into v_balance;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_after, description, reference)
  values
    (auth.uid(), 'topup', p_amount, v_balance, 'Wallet top-up', p_reference)
  on conflict (reference) do nothing;   -- idempotent: skip if already recorded
end;
$$;

grant execute on function public.record_topup(text, integer) to authenticated;
