-- ============================================================
-- CampusRun — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone_number text,
  course text,
  campus_status text check (campus_status in ('residential', 'commuter')),
  hostel text,
  avatar_url text,
  is_courier boolean default false,
  is_admin boolean default false,
  terms_accepted boolean default false,
  terms_accepted_at timestamptz,
  onboarding_complete boolean default false,
  wallet_balance numeric(10,2) default 0.00,
  total_earnings numeric(10,2) default 0.00,
  is_blacklisted boolean default false,
  blacklist_reason text,
  fraud_score integer default 0,
  pro_subscriber boolean default false,
  pro_expires_at timestamptz,
  device_fingerprint text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- DELIVERIES (orders)
-- ============================================================
create table public.deliveries (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid references public.profiles(id) on delete set null,
  courier_id uuid references public.profiles(id) on delete set null,

  -- order type
  order_type text not null check (order_type in ('purchase', 'errand')),

  -- locations
  pickup_location text not null,
  pickup_coords jsonb,
  dropoff_location text not null,
  dropoff_coords jsonb,
  is_residential boolean default false,

  -- items
  items jsonb default '[]',
  item_description text,
  package_value numeric(10,2),
  package_photo_url text,
  special_instructions text,

  -- pricing
  food_cost numeric(10,2) default 0,
  delivery_fee numeric(10,2) not null,
  service_fee numeric(10,2) default 100,
  tip numeric(10,2) default 0,
  total_amount numeric(10,2) not null,

  -- payment
  payment_method text check (payment_method in ('paystack', 'wallet')),
  payment_reference text,
  payment_verified boolean default false,

  -- status lifecycle
  status text default 'placed' check (status in ('placed','bought','on_the_way','arrived','delivered','cancelled')),
  cancellation_reason text,
  cancelled_by text check (cancelled_by in ('buyer','courier','admin')),

  -- courier acceptance
  courier_accepted boolean default false,
  courier_accepted_at timestamptz,
  grace_period_ends_at timestamptz,

  -- delivery verification
  delivery_code text not null,
  delivered_at timestamptz,

  -- dispatch flags
  campus_courier_unavailable boolean default false,
  gate_fallback_active boolean default false,

  -- price edit flag
  price_edit_flag boolean default false,
  price_edit_buyer_response text check (price_edit_buyer_response in ('accepted','rejected')),

  -- courier info snapshot
  courier_name text,
  courier_phone text,

  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- COURIER NOTIFICATIONS (dispatch)
-- ============================================================
create table public.courier_notifications (
  id uuid primary key default uuid_generate_v4(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  courier_id uuid references public.profiles(id) on delete cascade,
  gate_only boolean default false,
  seen boolean default false,
  responded boolean default false,
  response text check (response in ('accepted','rejected')),
  created_at timestamptz default now()
);

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
create table public.menu_categories (
  id uuid primary key default uuid_generate_v4(),
  vendor_name text not null,
  name text not null,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- MENU ITEMS
-- ============================================================
create table public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.menu_categories(id) on delete set null,
  vendor_name text not null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  is_available boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PRICE EDIT LOGS
-- ============================================================
create table public.price_edit_logs (
  id uuid primary key default uuid_generate_v4(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  courier_id uuid references public.profiles(id) on delete set null,
  item_name text not null,
  original_price numeric(10,2) not null,
  new_price numeric(10,2) not null,
  admin_approved boolean,
  admin_reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- WALLET TRANSACTIONS
-- ============================================================
create table public.wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('topup','payment','earning','tip','withdrawal','refund')),
  amount numeric(10,2) not null,
  balance_after numeric(10,2) not null,
  description text,
  delivery_id uuid references public.deliveries(id) on delete set null,
  paystack_reference text,
  created_at timestamptz default now()
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role text check (sender_role in ('buyer','courier')),
  message text not null,
  seen boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- DELIVERY FEEDBACK
-- ============================================================
create table public.delivery_feedback (
  id uuid primary key default uuid_generate_v4(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  courier_id uuid references public.profiles(id) on delete set null,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- ============================================================
-- FRAUD SCORES
-- ============================================================
create table public.fraud_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  score integer default 0,
  last_updated timestamptz default now()
);

-- ============================================================
-- SECURITY LOGS
-- ============================================================
create table public.security_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details text,
  risk_level text default 'low',
  device_fingerprint text,
  device_info jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- ============================================================
-- APP SETTINGS (admin-controlled)
-- ============================================================
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Seed default settings
insert into public.app_settings (key, value) values
  ('allowed_email_domain', '"nileuniversity.edu.ng"'),
  ('service_fee', '100'),
  ('pro_service_fee', '50'),
  ('orders_open', 'true'),
  ('max_active_couriers_per_dispatch', '5');

-- ============================================================
-- WITHDRAWAL REQUESTS
-- ============================================================
create table public.withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  courier_id uuid references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  status text default 'pending' check (status in ('pending','approved','rejected','paid')),
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index deliveries_buyer_id_idx on public.deliveries(buyer_id);
create index deliveries_courier_id_idx on public.deliveries(courier_id);
create index deliveries_status_idx on public.deliveries(status);
create index deliveries_created_at_idx on public.deliveries(created_at desc);
create index courier_notifications_courier_id_idx on public.courier_notifications(courier_id);
create index courier_notifications_delivery_id_idx on public.courier_notifications(delivery_id);
create index chat_messages_delivery_id_idx on public.chat_messages(delivery_id);
create index wallet_transactions_user_id_idx on public.wallet_transactions(user_id);
create index security_logs_user_id_idx on public.security_logs(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger deliveries_updated_at before update on public.deliveries
  for each row execute function public.handle_updated_at();
create trigger menu_items_updated_at before update on public.menu_items
  for each row execute function public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.deliveries enable row level security;
alter table public.courier_notifications enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.price_edit_logs enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.delivery_feedback enable row level security;
alter table public.fraud_scores enable row level security;
alter table public.security_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.withdrawal_requests enable row level security;

-- Helper function: is admin
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer stable;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles"
  on public.profiles for select using (public.is_admin());
create policy "Admins can update all profiles"
  on public.profiles for update using (public.is_admin());

-- DELIVERIES policies
create policy "Buyers see own deliveries"
  on public.deliveries for select using (buyer_id = auth.uid());
create policy "Couriers see assigned deliveries"
  on public.deliveries for select using (courier_id = auth.uid());
create policy "Buyers can create deliveries"
  on public.deliveries for insert with check (buyer_id = auth.uid());
create policy "Buyers can update own active deliveries"
  on public.deliveries for update using (buyer_id = auth.uid());
create policy "Couriers can update their deliveries"
  on public.deliveries for update using (courier_id = auth.uid());
create policy "Admins can see all deliveries"
  on public.deliveries for all using (public.is_admin());

-- COURIER NOTIFICATIONS policies
create policy "Couriers see own notifications"
  on public.courier_notifications for select using (courier_id = auth.uid());
create policy "Couriers can update own notifications"
  on public.courier_notifications for update using (courier_id = auth.uid());
create policy "Admins can manage notifications"
  on public.courier_notifications for all using (public.is_admin());

-- MENU policies (public read)
create policy "Anyone can view menu categories"
  on public.menu_categories for select using (true);
create policy "Admins can manage menu categories"
  on public.menu_categories for all using (public.is_admin());
create policy "Anyone can view menu items"
  on public.menu_items for select using (true);
create policy "Admins can manage menu items"
  on public.menu_items for all using (public.is_admin());

-- PRICE EDIT LOGS policies
create policy "Couriers can insert price edits"
  on public.price_edit_logs for insert with check (courier_id = auth.uid());
create policy "Buyers/couriers see their delivery price edits"
  on public.price_edit_logs for select using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id
        and (d.buyer_id = auth.uid() or d.courier_id = auth.uid())
    )
  );
create policy "Admins can manage price edits"
  on public.price_edit_logs for all using (public.is_admin());

-- WALLET TRANSACTIONS policies
create policy "Users see own transactions"
  on public.wallet_transactions for select using (user_id = auth.uid());
create policy "Admins can see all transactions"
  on public.wallet_transactions for select using (public.is_admin());

-- CHAT MESSAGES policies
create policy "Delivery participants can read chat"
  on public.chat_messages for select using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id
        and (d.buyer_id = auth.uid() or d.courier_id = auth.uid())
    )
  );
create policy "Delivery participants can send messages"
  on public.chat_messages for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id
        and (d.buyer_id = auth.uid() or d.courier_id = auth.uid())
    )
  );

-- DELIVERY FEEDBACK policies
create policy "Buyers can submit feedback"
  on public.delivery_feedback for insert with check (buyer_id = auth.uid());
create policy "Couriers see their feedback"
  on public.delivery_feedback for select using (courier_id = auth.uid());
create policy "Buyers see their feedback"
  on public.delivery_feedback for select using (buyer_id = auth.uid());
create policy "Admins can see all feedback"
  on public.delivery_feedback for select using (public.is_admin());

-- WALLET TRANSACTIONS insert policy (service role only via backend)
create policy "Service role can insert wallet transactions"
  on public.wallet_transactions for insert with check (auth.role() = 'service_role');

-- APP SETTINGS policies
create policy "Anyone can read settings"
  on public.app_settings for select using (true);
create policy "Admins can update settings"
  on public.app_settings for update using (public.is_admin());

-- WITHDRAWAL REQUESTS policies
create policy "Couriers see own withdrawals"
  on public.withdrawal_requests for select using (courier_id = auth.uid());
create policy "Couriers can create withdrawals"
  on public.withdrawal_requests for insert with check (courier_id = auth.uid());
create policy "Admins can manage withdrawals"
  on public.withdrawal_requests for all using (public.is_admin());

-- SECURITY LOGS policies
create policy "Admins can see security logs"
  on public.security_logs for select using (public.is_admin());
create policy "Service role can insert security logs"
  on public.security_logs for insert with check (true);

-- ============================================================
-- SEED: Make first admin user
-- (Run this after creating your account — replace email)
-- ============================================================
-- update public.profiles set is_admin = true where email = 'imranadebayo1812@gmail.com';
