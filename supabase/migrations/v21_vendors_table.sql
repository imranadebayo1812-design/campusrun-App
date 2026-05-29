-- ============================================================
-- v21: Vendor metadata table
-- Stores zone, emoji, and GPS coordinates for vendors added
-- via the admin panel. Pickup/dropoff location lists in the
-- app read from this table so new vendors appear automatically.
-- ============================================================

create table if not exists public.vendors (
  name        text primary key,
  zone        text    not null default 'Campus',
  emoji       text    not null default '🏪',
  lat         numeric,
  lng         numeric,
  color       text    not null default 'bg-brand-500',
  created_at  timestamptz default now()
);

alter table public.vendors enable row level security;

create policy "Anyone can read vendors"
  on public.vendors for select using (true);

create policy "Admins can manage vendors"
  on public.vendors for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
