-- Run this once in Supabase Dashboard → SQL Editor
-- Enables Realtime change events for the four tables the app subscribes to.
alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.wallet_transactions;
alter publication supabase_realtime add table public.courier_earnings;
