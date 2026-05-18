-- Run once in Supabase Dashboard → SQL Editor
-- Adds courier rating aggregation + location tracking for order matching

-- 1. Add columns to profiles
alter table public.profiles
  add column if not exists avg_rating    numeric(3,2) default null,
  add column if not exists total_ratings integer      default 0,
  add column if not exists courier_lat   numeric      default null,
  add column if not exists courier_lng   numeric      default null;

-- 2. Trigger function: recompute courier avg_rating after each feedback insert
create or replace function public.update_courier_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set
    avg_rating    = (select round(avg(rating)::numeric, 2) from public.delivery_feedback where courier_id = new.courier_id),
    total_ratings = (select count(*)                        from public.delivery_feedback where courier_id = new.courier_id)
  where id = new.courier_id;
  return new;
end;
$$;

drop trigger if exists trg_update_courier_rating on public.delivery_feedback;
create trigger trg_update_courier_rating
  after insert on public.delivery_feedback
  for each row execute function public.update_courier_rating();

-- 3. Backfill existing ratings
update public.profiles p
set
  avg_rating    = (select round(avg(rating)::numeric, 2) from public.delivery_feedback where courier_id = p.id),
  total_ratings = (select count(*)                        from public.delivery_feedback where courier_id = p.id)
where p.is_courier = true;

-- 4. Allow couriers to update their own location
drop policy if exists "Couriers update own location" on public.profiles;
create policy "Couriers update own location"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
