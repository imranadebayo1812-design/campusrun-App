-- ============================================================
-- CampusRun — Full Deploy Script
-- Paste entire file into Supabase SQL Editor and click Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE everywhere.
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Generates a unique 8-char referral code
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := '';
  i     int;
begin
  for i in 1..8 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

-- ============================================================
-- PROFILES
-- ============================================================

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text        unique not null,
  full_name           text,
  phone_number        text,
  course              text,
  campus_status       text,
  hostel              text,
  avatar_url          text,
  is_courier          boolean     default false,
  is_admin            boolean     default false,
  terms_accepted      boolean     default false,
  terms_accepted_at   timestamptz,
  onboarding_complete boolean     default false,
  wallet_balance      integer     default 0,
  is_blacklisted      boolean     default false,
  blacklist_reason    text,
  referral_code       text        unique,
  referred_by         uuid        references public.profiles(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Add columns that may be missing if profiles table already existed
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
alter table public.profiles add column if not exists wallet_balance integer default 0;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- ============================================================
-- DELIVERIES
-- ============================================================

create table if not exists public.deliveries (
  id                      uuid        primary key default uuid_generate_v4(),
  buyer_id                uuid        references public.profiles(id) on delete set null,
  courier_id              uuid        references public.profiles(id) on delete set null,
  order_type              text        not null check (order_type in ('purchase','errand')),
  pickup_location         text        not null,
  pickup_coords           jsonb,
  dropoff_location        text        not null,
  dropoff_coords          jsonb,
  is_residential          boolean     default false,
  items                   jsonb       default '[]',
  item_description        text,
  special_instructions    text,
  food_cost               integer     default 0,
  delivery_fee            integer     not null,
  service_fee             integer     default 100,
  tip                     integer     default 0,
  total_amount            integer     not null,
  payment_method          text        check (payment_method in ('paystack','wallet')),
  payment_reference       text,
  payment_verified        boolean     default false,
  status                  text        default 'placed'
                                      check (status in ('placed','bought','on_the_way','arrived','delivered','cancelled')),
  cancellation_reason     text,
  cancelled_by            text        check (cancelled_by in ('buyer','courier','admin')),
  courier_accepted        boolean     default false,
  courier_accepted_at     timestamptz,
  grace_period_ends_at    timestamptz,
  delivery_code           text        not null,
  delivered_at            timestamptz,
  courier_name            text,
  courier_phone           text,
  price_edit_flag         boolean     default false,
  price_edit_buyer_response text      check (price_edit_buyer_response in ('accepted','rejected')),
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- WALLET TRANSACTIONS
-- ============================================================

create table if not exists public.wallet_transactions (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        references public.profiles(id) on delete cascade,
  type        text        not null check (type in ('topup','payment','earning','tip','withdrawal','refund')),
  amount      integer     not null,
  balance_after integer   not null,
  description text,
  delivery_id uuid        references public.deliveries(id) on delete set null,
  reference   text        unique,
  created_at  timestamptz default now()
);

alter table public.wallet_transactions add column if not exists reference text unique;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table if not exists public.notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  title      text        not null,
  body       text,
  type       text        default 'general',
  data       jsonb,
  read       boolean     default false,
  created_at timestamptz default now()
);

-- ============================================================
-- REFERRALS
-- ============================================================

create table if not exists public.referrals (
  id          uuid        primary key default uuid_generate_v4(),
  referrer_id uuid        not null references public.profiles(id) on delete cascade,
  referred_id uuid        not null references public.profiles(id) on delete cascade unique,
  earned      boolean     default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- COURIER EARNINGS
-- ============================================================

create table if not exists public.courier_earnings (
  id          uuid        primary key default uuid_generate_v4(),
  courier_id  uuid        not null references public.profiles(id) on delete cascade,
  delivery_id uuid        references public.deliveries(id) on delete set null,
  type        text        not null check (type in ('delivery_fee','tip','reimbursement')),
  amount      integer     not null,
  status      text        not null default 'available' check (status in ('available','withdrawn')),
  description text,
  created_at  timestamptz default now()
);

-- ============================================================
-- BANK ACCOUNTS
-- ============================================================

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

-- ============================================================
-- COURIER WITHDRAWALS
-- ============================================================

create table if not exists public.courier_withdrawals (
  id                   uuid        primary key default gen_random_uuid(),
  courier_id           uuid        not null references public.profiles(id),
  type                 text        not null check (type in ('earnings','reimbursement')),
  destination          text        not null check (destination in ('wallet','bank')),
  gross_amount         integer     not null,
  net_amount           integer     not null,
  commission           integer     not null default 0,
  status               text        not null default 'pending'
                                   check (status in ('pending','processing','completed','failed')),
  paystack_transfer_id text,
  paystack_reference   text        unique,
  bank_name            text,
  account_number       text,
  account_name         text,
  failure_reason       text,
  created_at           timestamptz default now(),
  completed_at         timestamptz
);

-- ============================================================
-- PUSH TOKENS
-- ============================================================

create table if not exists public.push_tokens (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  token      text        not null,
  platform   text        not null default 'web',
  updated_at timestamptz not null default now(),
  unique(user_id, token)
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================

create table if not exists public.chat_messages (
  id          uuid        primary key default uuid_generate_v4(),
  delivery_id uuid        references public.deliveries(id) on delete cascade,
  sender_id   uuid        references public.profiles(id) on delete set null,
  sender_role text        check (sender_role in ('buyer','courier')),
  message     text        not null,
  seen        boolean     default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- DELIVERY FEEDBACK
-- ============================================================

create table if not exists public.delivery_feedback (
  id          uuid        primary key default uuid_generate_v4(),
  delivery_id uuid        references public.deliveries(id) on delete cascade,
  buyer_id    uuid        references public.profiles(id) on delete set null,
  courier_id  uuid        references public.profiles(id) on delete set null,
  rating      integer     check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists deliveries_buyer_id_idx       on public.deliveries(buyer_id);
create index if not exists deliveries_courier_id_idx     on public.deliveries(courier_id);
create index if not exists deliveries_status_idx         on public.deliveries(status);
create index if not exists deliveries_created_at_idx     on public.deliveries(created_at desc);
create index if not exists wallet_tx_user_id_idx         on public.wallet_transactions(user_id);
create index if not exists notifications_user_id_idx     on public.notifications(user_id);
create index if not exists courier_earnings_courier_idx  on public.courier_earnings(courier_id);
create index if not exists chat_messages_delivery_idx    on public.chat_messages(delivery_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists profiles_updated_at  on public.profiles;
drop trigger if exists deliveries_updated_at on public.deliveries;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger deliveries_updated_at
  before update on public.deliveries
  for each row execute function public.handle_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.deliveries         enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications      enable row level security;
alter table public.referrals          enable row level security;
alter table public.courier_earnings   enable row level security;
alter table public.bank_accounts      enable row level security;
alter table public.courier_withdrawals enable row level security;
alter table public.push_tokens        enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.delivery_feedback  enable row level security;

-- PROFILES
create policy if not exists "Users view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy if not exists "Users update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy if not exists "Admin view all profiles"
  on public.profiles for select using (public.is_admin());
create policy if not exists "Admin update all profiles"
  on public.profiles for update using (public.is_admin());

-- DELIVERIES
create policy if not exists "Buyers see own deliveries"
  on public.deliveries for select using (buyer_id = auth.uid());
create policy if not exists "Couriers see assigned deliveries"
  on public.deliveries for select using (courier_id = auth.uid());
create policy if not exists "Buyers create deliveries"
  on public.deliveries for insert with check (buyer_id = auth.uid());
create policy if not exists "Buyers update own deliveries"
  on public.deliveries for update using (buyer_id = auth.uid());
create policy if not exists "Couriers update their deliveries"
  on public.deliveries for update using (courier_id = auth.uid());
create policy if not exists "Admin all deliveries"
  on public.deliveries for all using (public.is_admin());

-- WALLET TRANSACTIONS
create policy if not exists "Users see own transactions"
  on public.wallet_transactions for select using (user_id = auth.uid());
create policy if not exists "Users insert own transactions"
  on public.wallet_transactions for insert with check (user_id = auth.uid());

-- NOTIFICATIONS
create policy if not exists "Users see own notifications"
  on public.notifications for select using (user_id = auth.uid());
create policy if not exists "Users update own notifications"
  on public.notifications for update using (user_id = auth.uid());

-- REFERRALS
create policy if not exists "Users see own referrals"
  on public.referrals for select using (referrer_id = auth.uid());

-- COURIER EARNINGS
create policy if not exists "Couriers see own earnings"
  on public.courier_earnings for select using (courier_id = auth.uid());

-- BANK ACCOUNTS
create policy if not exists "Users manage own bank accounts"
  on public.bank_accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- COURIER WITHDRAWALS
create policy if not exists "Couriers view own withdrawals"
  on public.courier_withdrawals for select using (auth.uid() = courier_id);

-- PUSH TOKENS
create policy if not exists "Users manage own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CHAT MESSAGES
create policy if not exists "Participants read chat"
  on public.chat_messages for select using (
    exists (select 1 from public.deliveries d
            where d.id = delivery_id
              and (d.buyer_id = auth.uid() or d.courier_id = auth.uid()))
  );
create policy if not exists "Participants send messages"
  on public.chat_messages for insert with check (
    sender_id = auth.uid() and
    exists (select 1 from public.deliveries d
            where d.id = delivery_id
              and (d.buyer_id = auth.uid() or d.courier_id = auth.uid()))
  );

-- DELIVERY FEEDBACK
create policy if not exists "Buyers submit feedback"
  on public.delivery_feedback for insert with check (buyer_id = auth.uid());
create policy if not exists "Couriers see their feedback"
  on public.delivery_feedback for select using (courier_id = auth.uid());

-- ============================================================
-- RPCs
-- ============================================================

-- Record Paystack top-up (idempotent by reference)
create or replace function public.record_topup(p_reference text, p_amount integer)
returns void language plpgsql security definer as $$
declare v_balance integer;
begin
  if exists (select 1 from public.wallet_transactions where reference = p_reference) then return; end if;
  update public.profiles set wallet_balance = wallet_balance + p_amount
  where id = auth.uid() returning wallet_balance into v_balance;
  insert into public.wallet_transactions (user_id, type, amount, balance_after, description, reference)
  values (auth.uid(), 'topup', p_amount, v_balance, 'Wallet top-up', p_reference);
end;
$$;

-- Wallet payment for an order
create or replace function public.pay_delivery_with_wallet(
  p_delivery_id uuid, p_user_id uuid, p_amount integer
)
returns void language plpgsql security definer as $$
declare v_balance integer;
begin
  select wallet_balance into v_balance from public.profiles where id = p_user_id for update;
  if v_balance < p_amount then raise exception 'Insufficient wallet balance'; end if;
  update public.profiles set wallet_balance = wallet_balance - p_amount where id = p_user_id;
  update public.deliveries set payment_method = 'wallet', payment_verified = true where id = p_delivery_id;
  insert into public.wallet_transactions (user_id, type, amount, balance_after, description, delivery_id)
  values (p_user_id, 'payment', p_amount, v_balance - p_amount,
          'Wallet payment for delivery ' || left(p_delivery_id::text, 8), p_delivery_id);
end;
$$;

-- Transfer courier earnings/reimbursement to wallet
create or replace function public.transfer_earnings_to_wallet(p_amount integer, p_type text)
returns void language plpgsql security definer as $$
declare
  v_commission integer;
  v_net        integer;
  v_balance    integer;
  v_desc       text;
begin
  if p_type not in ('earnings','reimbursement') then raise exception 'invalid type'; end if;
  v_commission := case when p_type = 'earnings' then floor(p_amount * 0.15)::integer else 0 end;
  v_net        := p_amount - v_commission;
  v_desc       := case when p_type = 'earnings' then 'Earnings transferred to wallet'
                       else 'Reimbursement transferred to wallet' end;
  update public.profiles set wallet_balance = wallet_balance + v_net
  where id = auth.uid() returning wallet_balance into v_balance;
  insert into public.wallet_transactions (user_id, type, amount, balance_after, description, reference)
  values (auth.uid(), 'earning', v_net, v_balance, v_desc,
          'wallet-transfer-' || to_char(now(), 'YYYYMMDDHH24MISS'));
  insert into public.courier_withdrawals
    (courier_id, type, destination, gross_amount, net_amount, commission, status, completed_at)
  values (auth.uid(), p_type, 'wallet', p_amount, v_net, v_commission, 'completed', now());
end;
$$;

-- ============================================================
-- SIGNUP TRIGGER (with referral support)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_referrer_id uuid;
  v_ref_code    text;
begin
  v_ref_code := trim(upper(new.raw_user_meta_data ->> 'referral_code'));
  if v_ref_code is not null and v_ref_code <> '' then
    select id into v_referrer_id from public.profiles
    where referral_code = v_ref_code limit 1;
  end if;

  insert into public.profiles (id, email, full_name, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    public.generate_referral_code(),
    v_referrer_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- REFERRAL BONUS TRIGGER
-- ============================================================

create or replace function public.credit_referral_bonus()
returns trigger language plpgsql security definer as $$
declare v_new_balance integer;
begin
  if not ((OLD.onboarding_complete is distinct from true) and NEW.onboarding_complete = true) then
    return NEW;
  end if;
  if NEW.referred_by is null then return NEW; end if;
  if exists (select 1 from public.referrals where referred_id = NEW.id and earned = true) then
    return NEW;
  end if;

  update public.profiles set wallet_balance = wallet_balance + 100
  where id = NEW.referred_by returning wallet_balance into v_new_balance;

  insert into public.wallet_transactions (user_id, type, amount, balance_after, description)
  values (NEW.referred_by, 'earning', 100, v_new_balance, 'Referral bonus — friend joined CampusRun');

  insert into public.referrals (referrer_id, referred_id, earned)
  values (NEW.referred_by, NEW.id, true)
  on conflict (referred_id) do update set earned = true;

  return NEW;
end;
$$;

drop trigger if exists on_onboarding_complete on public.profiles;
create trigger on_onboarding_complete
  after update on public.profiles
  for each row execute function public.credit_referral_bonus();

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.wallet_transactions;
alter publication supabase_realtime add table public.courier_earnings;
