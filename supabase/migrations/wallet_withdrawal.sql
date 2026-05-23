-- wallet_withdrawal.sql
-- Run once in Supabase Dashboard → SQL Editor
-- Adds wallet-to-bank withdrawal for buyers/users

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Widen courier_withdrawals.type to allow wallet withdrawals
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.courier_withdrawals
  drop constraint if exists courier_withdrawals_type_check;
alter table public.courier_withdrawals
  add constraint courier_withdrawals_type_check
  check (type in ('earnings', 'reimbursement', 'wallet_withdrawal'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC: request_bank_withdrawal
--    Buyer submits a bank withdrawal request. Immediately deducts from wallet
--    and creates a pending withdrawal record that admin processes manually.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.request_bank_withdrawal(
  p_amount         integer,
  p_bank_name      text,
  p_account_number text,
  p_account_name   text
)
returns void language plpgsql security definer as $$
declare
  v_before numeric;
  v_after  numeric;
begin
  select wallet_balance into v_before
  from public.profiles where id = auth.uid();

  if coalesce(v_before, 0) < p_amount then
    raise exception 'insufficient_balance';
  end if;

  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where id = auth.uid()
  returning wallet_balance into v_after;

  insert into public.wallet_transactions (
    user_id, type, amount, balance_before, balance_after, description
  ) values (
    auth.uid(), 'withdrawal', p_amount, v_before, v_after,
    'Wallet withdrawal to bank — pending admin transfer'
  );

  insert into public.courier_withdrawals (
    courier_id, type, destination, gross_amount, net_amount, commission,
    status, bank_name, account_number, account_name
  ) values (
    auth.uid(), 'wallet_withdrawal', 'bank', p_amount, p_amount, 0,
    'pending', p_bank_name, p_account_number, p_account_name
  );
end;
$$;
grant execute on function public.request_bank_withdrawal(integer, text, text, text) to authenticated;
