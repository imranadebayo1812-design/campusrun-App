-- STEP 4: Indexes, Updated-At Triggers, RLS

-- Indexes
create index if not exists deliveries_buyer_id_idx      on public.deliveries(buyer_id);
create index if not exists deliveries_courier_id_idx    on public.deliveries(courier_id);
create index if not exists deliveries_status_idx        on public.deliveries(status);
create index if not exists wallet_tx_user_id_idx        on public.wallet_transactions(user_id);
create index if not exists notifications_user_id_idx    on public.notifications(user_id);
create index if not exists courier_earnings_courier_idx on public.courier_earnings(courier_id);

-- Updated-at triggers
drop trigger if exists profiles_updated_at   on public.profiles;
drop trigger if exists deliveries_updated_at on public.deliveries;
create trigger profiles_updated_at  before update on public.profiles  for each row execute function public.handle_updated_at();
create trigger deliveries_updated_at before update on public.deliveries for each row execute function public.handle_updated_at();

-- Enable RLS
alter table public.profiles            enable row level security;
alter table public.deliveries          enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications       enable row level security;
alter table public.referrals           enable row level security;
alter table public.courier_earnings    enable row level security;
alter table public.bank_accounts       enable row level security;
alter table public.courier_withdrawals enable row level security;
alter table public.push_tokens         enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.delivery_feedback   enable row level security;

-- Policies
create policy if not exists "Users view own profile"     on public.profiles for select using (auth.uid() = id);
create policy if not exists "Users update own profile"   on public.profiles for update using (auth.uid() = id);
create policy if not exists "Admin view all profiles"    on public.profiles for select using (public.is_admin());
create policy if not exists "Admin update all profiles"  on public.profiles for update using (public.is_admin());

create policy if not exists "Buyers see own deliveries"  on public.deliveries for select using (buyer_id = auth.uid());
create policy if not exists "Couriers see assigned"      on public.deliveries for select using (courier_id = auth.uid());
create policy if not exists "Buyers create deliveries"   on public.deliveries for insert with check (buyer_id = auth.uid());
create policy if not exists "Buyers update own"          on public.deliveries for update using (buyer_id = auth.uid());
create policy if not exists "Couriers update their"      on public.deliveries for update using (courier_id = auth.uid());
create policy if not exists "Admin all deliveries"       on public.deliveries for all using (public.is_admin());

create policy if not exists "Users see own transactions" on public.wallet_transactions for select using (user_id = auth.uid());
create policy if not exists "Users insert transactions"  on public.wallet_transactions for insert with check (user_id = auth.uid());

create policy if not exists "Users see notifications"    on public.notifications for select using (user_id = auth.uid());
create policy if not exists "Users update notifications" on public.notifications for update using (user_id = auth.uid());

create policy if not exists "Users see own referrals"    on public.referrals for select using (referrer_id = auth.uid());
create policy if not exists "Couriers see earnings"      on public.courier_earnings for select using (courier_id = auth.uid());
create policy if not exists "Users manage bank accounts" on public.bank_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "Couriers view withdrawals"  on public.courier_withdrawals for select using (auth.uid() = courier_id);
create policy if not exists "Users manage push tokens"   on public.push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Participants read chat"     on public.chat_messages for select using (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (d.buyer_id = auth.uid() or d.courier_id = auth.uid()))
);
create policy if not exists "Participants send messages" on public.chat_messages for insert with check (
  sender_id = auth.uid() and
  exists (select 1 from public.deliveries d where d.id = delivery_id and (d.buyer_id = auth.uid() or d.courier_id = auth.uid()))
);
create policy if not exists "Buyers submit feedback"     on public.delivery_feedback for insert with check (buyer_id = auth.uid());
create policy if not exists "Couriers see feedback"      on public.delivery_feedback for select using (courier_id = auth.uid());
