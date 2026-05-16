-- STEP 6: Enable Realtime
alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.wallet_transactions;
alter publication supabase_realtime add table public.courier_earnings;
