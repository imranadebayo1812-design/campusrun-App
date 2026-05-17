-- Create reported_orders table and auto-freeze courier earnings on report
-- Run in Supabase SQL Editor

create table if not exists public.reported_orders (
  id            uuid        primary key default gen_random_uuid(),
  delivery_id   uuid        not null references public.deliveries(id) on delete cascade,
  reporter_id   uuid        not null references public.profiles(id) on delete cascade,
  courier_id    uuid        references public.profiles(id) on delete set null,
  issue_type    text        not null,
  details       text,
  calls_made    integer     default 0,
  status        text        default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution    text,
  resolved_by   uuid        references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz default now()
);

alter table public.reported_orders enable row level security;

-- Buyers can insert their own reports
create policy "Buyers can create reports"
  on public.reported_orders for insert
  with check (auth.uid() = reporter_id);

-- Buyers can view their own reports
create policy "Buyers can view own reports"
  on public.reported_orders for select
  using (auth.uid() = reporter_id);

-- Admins can do everything
create policy "Admins can manage reports"
  on public.reported_orders for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- Trigger: freeze courier earnings when a report is filed
create or replace function public.freeze_earnings_on_report()
returns trigger language plpgsql security definer as $$
begin
  if NEW.courier_id is not null and NEW.delivery_id is not null then
    update public.courier_earnings
    set status = 'frozen'
    where delivery_id = NEW.delivery_id
      and courier_id  = NEW.courier_id
      and status not in ('withdrawn');
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_report_freeze_earnings on public.reported_orders;
create trigger on_report_freeze_earnings
  after insert on public.reported_orders
  for each row
  execute function public.freeze_earnings_on_report();

-- Trigger: unfreeze earnings when admin resolves or dismisses a report
create or replace function public.unfreeze_earnings_on_resolve()
returns trigger language plpgsql security definer as $$
begin
  -- Only act when status changes to resolved or dismissed
  if OLD.status = NEW.status then return NEW; end if;

  if NEW.status = 'resolved' then
    -- Admin sided with buyer: keep earnings frozen (courier doesn't get paid)
    null;
  elsif NEW.status = 'dismissed' then
    -- Report dismissed: unfreeze earnings so courier can withdraw
    update public.courier_earnings
    set status = 'verified'
    where delivery_id = NEW.delivery_id
      and courier_id  = NEW.courier_id
      and status = 'frozen';
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_report_resolve on public.reported_orders;
create trigger on_report_resolve
  after update on public.reported_orders
  for each row
  execute function public.unfreeze_earnings_on_resolve();
