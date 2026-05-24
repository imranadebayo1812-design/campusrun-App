-- Table for buyer issue reports against couriers
create table if not exists public.reported_orders (
  id          uuid        default gen_random_uuid() primary key,
  delivery_id uuid        not null references public.deliveries(id) on delete cascade,
  reporter_id uuid        not null references public.profiles(id) on delete cascade,
  courier_id  uuid        references public.profiles(id) on delete set null,
  issue_type  text        not null,
  details     text,
  calls_made  integer     not null default 0,
  status      text        not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now()
);

-- Only the reporter and admins can see the report
alter table public.reported_orders enable row level security;

create policy "Reporter can insert own reports"
  on public.reported_orders for insert
  with check (auth.uid() = reporter_id);

create policy "Reporter can view own reports"
  on public.reported_orders for select
  using (auth.uid() = reporter_id);

create policy "Admins can view all reports"
  on public.reported_orders for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update report status"
  on public.reported_orders for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Prevent spamming: one open report per delivery per reporter
create unique index if not exists reported_orders_one_open
  on public.reported_orders (delivery_id, reporter_id)
  where status = 'open';
