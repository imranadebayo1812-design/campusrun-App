-- ============================================================
-- CampusRun — Supabase Schema
-- Run this in the Supabase SQL Editor (in order, top to bottom)
-- ============================================================

-- ── Helpers ─────────────────────────────────────────────────

-- Generates a random 8-character uppercase alphanumeric code
create or replace function generate_referral_code()
returns text language sql as $$
  select upper(substring(replace(encode(gen_random_bytes(6), 'base64'), '/', 'A'), 1, 8))
$$;

-- ── 1. profiles ──────────────────────────────────────────────

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  phone_number    text,
  course          text,
  campus_status   text check (campus_status in ('resident', 'day_student')),
  hostel          text,
  terms_accepted       boolean   default false,
  terms_accepted_at    timestamptz,
  onboarding_complete  boolean   default false,
  is_admin        boolean   default false,
  is_courier      boolean   default false,
  is_blacklisted  boolean   default false,
  blacklist_reason text,
  wallet_balance  integer   default 0,  -- naira
  total_earnings  integer   default 0,  -- naira, courier lifetime
  referral_code   text      unique,
  referred_by     uuid      references public.profiles(id),
  pro_subscriber  boolean   default false,
  created_at      timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p2
    where p2.id = auth.uid() and p2.is_admin = true
  ));

-- Trigger: create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, referral_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    generate_referral_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC: accept terms (called by TermsModal)
create or replace function public.accept_terms()
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set terms_accepted = true, terms_accepted_at = now()
  where id = auth.uid();
end;
$$;


-- ── 2. deliveries ────────────────────────────────────────────

create type if not exists delivery_status as enum (
  'placed', 'bought', 'on_the_way', 'arrived', 'delivered', 'cancelled'
);

create type if not exists order_type_enum as enum ('purchase', 'errand');

create table if not exists public.deliveries (
  id                  uuid        primary key default gen_random_uuid(),
  buyer_id            uuid        not null references public.profiles(id),
  courier_id          uuid        references public.profiles(id),
  order_type          order_type_enum not null,
  pickup_location     text        not null,
  dropoff_location    text        not null,
  status              delivery_status default 'placed' not null,
  items               jsonb       default '[]',
  item_description    text,
  food_cost           integer     default 0,
  delivery_fee        integer     not null,
  service_fee         integer     default 0,
  tip                 integer     default 0,
  total_amount        integer     not null,
  delivery_code       text        not null,
  special_instructions text,
  payment_method      text        default 'wallet' check (payment_method in ('wallet', 'paystack')),
  payment_verified    boolean     default false,
  courier_accepted    boolean     default false,
  accepted_at         timestamptz,
  delivered_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.deliveries enable row level security;

-- Buyers see their own orders
create policy "Buyers can see their own orders"
  on public.deliveries for select
  using (auth.uid() = buyer_id);

-- Buyers can place orders
create policy "Buyers can insert orders"
  on public.deliveries for insert
  with check (auth.uid() = buyer_id);

-- Buyers can cancel their own unaccepted orders
create policy "Buyers can cancel their orders"
  on public.deliveries for update
  using (auth.uid() = buyer_id);

-- Couriers can browse available (unassigned, paid) orders
create policy "Couriers can see available orders"
  on public.deliveries for select
  using (
    courier_id is null
    and status = 'placed'
    and payment_verified = true
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_courier = true
    )
  );

-- Couriers can see and update their accepted orders
create policy "Couriers can see their assigned orders"
  on public.deliveries for select
  using (auth.uid() = courier_id);

create policy "Couriers can update their assigned orders"
  on public.deliveries for update
  using (auth.uid() = courier_id);

-- Admins can do everything
create policy "Admins full access to deliveries"
  on public.deliveries for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger deliveries_updated_at
  before update on public.deliveries
  for each row execute procedure public.set_updated_at();


-- ── 3. wallet_transactions ───────────────────────────────────

create table if not exists public.wallet_transactions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id),
  type          text        not null check (type in ('topup', 'payment', 'earning', 'withdrawal', 'refund', 'reimbursement')),
  amount        integer     not null,   -- always positive
  balance_after integer     not null,
  description   text,
  reference     text,                   -- Paystack reference
  delivery_id   uuid        references public.deliveries(id),
  created_at    timestamptz default now()
);

alter table public.wallet_transactions enable row level security;

create policy "Users can view their own transactions"
  on public.wallet_transactions for select
  using (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on public.wallet_transactions for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));


-- ── 4. courier_earnings ──────────────────────────────────────

create table if not exists public.courier_earnings (
  id            uuid        primary key default gen_random_uuid(),
  courier_id    uuid        not null references public.profiles(id),
  delivery_id   uuid        references public.deliveries(id),
  type          text        not null check (type in ('delivery_fee', 'tip', 'reimbursement')),
  amount        integer     not null,
  status        text        default 'pending' check (status in ('pending', 'verified', 'withdrawn', 'frozen')),
  created_at    timestamptz default now()
);

alter table public.courier_earnings enable row level security;

create policy "Couriers can see their own earnings"
  on public.courier_earnings for select
  using (auth.uid() = courier_id);

create policy "Admins can view all earnings"
  on public.courier_earnings for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));


-- ── 5. notifications ─────────────────────────────────────────

create table if not exists public.notifications (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id),
  type          text        not null,
  title         text        not null,
  body          text        not null,
  read          boolean     default false,
  action        text,
  created_at    timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role can insert notifications"
  on public.notifications for insert
  with check (true);  -- restrict in prod via service role


-- ── 6. price_edits ───────────────────────────────────────────

create table if not exists public.price_edits (
  id              uuid        primary key default gen_random_uuid(),
  courier_id      uuid        not null references public.profiles(id),
  delivery_id     uuid        not null references public.deliveries(id),
  item_name       text        not null,
  original_price  integer     not null,
  new_price       integer     not null,
  difference      integer     not null,  -- new_price - original_price
  qty             integer     default 1,
  status          text        default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz default now()
);

alter table public.price_edits enable row level security;

create policy "Couriers can insert and see their price edits"
  on public.price_edits for all
  using (auth.uid() = courier_id);

create policy "Buyers can see price edits on their orders"
  on public.price_edits for select
  using (exists (
    select 1 from public.deliveries d
    where d.id = delivery_id and d.buyer_id = auth.uid()
  ));

create policy "Admins can see all price edits"
  on public.price_edits for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));


-- ── 7. referrals ─────────────────────────────────────────────

create table if not exists public.referrals (
  id            uuid        primary key default gen_random_uuid(),
  referrer_id   uuid        not null references public.profiles(id),
  referred_id   uuid        not null unique references public.profiles(id),
  earned        boolean     default false,  -- true when ₦100 credited
  created_at    timestamptz default now()
);

alter table public.referrals enable row level security;

create policy "Users can see their own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id);


-- ── 8. Realtime ──────────────────────────────────────────────
-- Enable Realtime on the tables the app subscribes to:
-- (Run in Supabase Dashboard → Database → Replication)
-- Or uncomment these:
-- alter publication supabase_realtime add table public.deliveries;
-- alter publication supabase_realtime add table public.notifications;


-- ── 9. Wallet payment RPC ─────────────────────────────────────
-- Atomic: deduct balance + record tx + verify delivery
create or replace function public.process_wallet_payment(
  p_delivery_id uuid,
  p_amount integer
)
returns void language plpgsql security definer as $$
declare
  v_balance integer;
  v_pickup text;
begin
  select wallet_balance into v_balance
  from public.profiles where id = auth.uid() for update;

  if v_balance is null or v_balance < p_amount then
    raise exception 'insufficient_balance';
  end if;

  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where id = auth.uid();

  select pickup_location into v_pickup
  from public.deliveries where id = p_delivery_id;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_after, description, delivery_id)
  values
    (auth.uid(), 'payment', p_amount, v_balance - p_amount,
     'Delivery — ' || coalesce(v_pickup, ''), p_delivery_id);

  update public.deliveries
  set payment_verified = true, payment_method = 'wallet'
  where id = p_delivery_id and buyer_id = auth.uid();
end;
$$;
