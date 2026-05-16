-- Run in Supabase Dashboard → SQL Editor

-- ── 1. Bank accounts ────────────────────────────────────────
create table if not exists public.bank_accounts (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  bank_code      text        not null,
  bank_name      text        not null,
  account_number text        not null,
  account_name   text        not null,
  recipient_code text,
  created_at     timestamptz default now(),
  unique(user_id, bank_code, account_number)
);

alter table public.bank_accounts enable row level security;
create policy "Users manage own bank accounts"
  on public.bank_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. Courier withdrawals ───────────────────────────────────
create table if not exists public.courier_withdrawals (
  id                    uuid        primary key default gen_random_uuid(),
  courier_id            uuid        not null references public.profiles(id),
  type                  text        not null check (type in ('earnings', 'reimbursement')),
  destination           text        not null check (destination in ('wallet', 'bank')),
  gross_amount          integer     not null,
  net_amount            integer     not null,
  commission            integer     not null default 0,
  status                text        not null default 'pending'
                                    check (status in ('pending', 'processing', 'completed', 'failed')),
  paystack_transfer_id  text,
  paystack_reference    text unique,
  bank_name             text,
  account_number        text,
  account_name          text,
  failure_reason        text,
  created_at            timestamptz default now(),
  completed_at          timestamptz
);

alter table public.courier_withdrawals enable row level security;
create policy "Couriers view own withdrawals"
  on public.courier_withdrawals for select
  using (auth.uid() = courier_id);

-- ── 3. RPC: transfer earnings/reimbursement to wallet ────────
create or replace function public.transfer_earnings_to_wallet(
  p_amount integer,
  p_type   text   -- 'earnings' or 'reimbursement'
)
returns void language plpgsql security definer as $$
declare
  v_commission integer;
  v_net        integer;
  v_balance    integer;
  v_desc       text;
begin
  if p_type not in ('earnings', 'reimbursement') then
    raise exception 'invalid type';
  end if;

  v_commission := case when p_type = 'earnings' then floor(p_amount * 0.15)::integer else 0 end;
  v_net        := p_amount - v_commission;
  v_desc       := case when p_type = 'earnings'
                    then 'Earnings transferred to wallet'
                    else 'Reimbursement transferred to wallet' end;

  update public.profiles
  set wallet_balance = wallet_balance + v_net
  where id = auth.uid()
  returning wallet_balance into v_balance;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_after, description, reference)
  values
    (auth.uid(), 'earning', v_net, v_balance, v_desc,
     'wallet-transfer-' || to_char(now(), 'YYYYMMDDHH24MISS'));

  insert into public.courier_withdrawals
    (courier_id, type, destination, gross_amount, net_amount, commission, status, completed_at)
  values
    (auth.uid(), p_type, 'wallet', p_amount, v_net, v_commission, 'completed', now());
end;
$$;
