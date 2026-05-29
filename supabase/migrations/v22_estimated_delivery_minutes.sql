-- v22: Store courier's stated delivery time estimate on the delivery
alter table public.deliveries
  add column if not exists estimated_delivery_minutes integer;
