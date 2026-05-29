-- ============================================================
-- v20: Security hardening
-- Locks wallet_balance and is_admin against direct REST updates.
-- is_courier is intentionally NOT locked — users freely toggle
-- between buyer and courier mode depending on their location.
-- ============================================================

-- Drop + recreate the profile update policy (same as v15 but explicit)
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using  (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Cannot self-modify wallet balance — must go through RPCs
    and wallet_balance = public._snap_wallet_balance(auth.uid())
    -- Cannot self-promote to admin — must go through admin panel
    and is_admin       = public._snap_is_admin(auth.uid())
    -- is_courier is intentionally free — users toggle buyer/courier mode themselves
  );
