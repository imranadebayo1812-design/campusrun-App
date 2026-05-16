-- STEP 2: Core Tables (profiles, deliveries, wallet_transactions)

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
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
alter table public.profiles add column if not exists wallet_balance integer default 0;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz default now();

create table if not exists public.deliveries (
  id                        uuid        primary key default uuid_generate_v4(),
  buyer_id                  uuid        references public.profiles(id) on delete set null,
  courier_id                uuid        references public.profiles(id) on delete set null,
  order_type                text        not null check (order_type in ('purchase','errand')),
  pickup_location           text        not null,
  pickup_coords             jsonb,
  dropoff_location          text        not null,
  dropoff_coords            jsonb,
  is_residential            boolean     default false,
  items                     jsonb       default '[]',
  item_description          text,
  special_instructions      text,
  food_cost                 integer     default 0,
  delivery_fee              integer     not null,
  service_fee               integer     default 100,
  tip                       integer     default 0,
  total_amount              integer     not null,
  payment_method            text        check (payment_method in ('paystack','wallet')),
  payment_reference         text,
  payment_verified          boolean     default false,
  status                    text        default 'placed'
                                        check (status in ('placed','bought','on_the_way','arrived','delivered','cancelled')),
  cancellation_reason       text,
  cancelled_by              text        check (cancelled_by in ('buyer','courier','admin')),
  courier_accepted          boolean     default false,
  courier_accepted_at       timestamptz,
  grace_period_ends_at      timestamptz,
  delivery_code             text        not null,
  delivered_at              timestamptz,
  courier_name              text,
  courier_phone             text,
  price_edit_flag           boolean     default false,
  price_edit_buyer_response text        check (price_edit_buyer_response in ('accepted','rejected')),
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

create table if not exists public.wallet_transactions (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        references public.profiles(id) on delete cascade,
  type          text        not null check (type in ('topup','payment','earning','tip','withdrawal','refund')),
  amount        integer     not null,
  balance_after integer     not null,
  description   text,
  delivery_id   uuid        references public.deliveries(id) on delete set null,
  reference     text        unique,
  created_at    timestamptz default now()
);
alter table public.wallet_transactions add column if not exists reference text unique;
