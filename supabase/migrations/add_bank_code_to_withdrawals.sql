-- Add bank_code column and approved/rejected statuses to courier_withdrawals
-- Run in Supabase SQL Editor

alter table public.courier_withdrawals
  add column if not exists bank_code text,
  add column if not exists approved_at timestamptz,
  drop constraint if exists courier_withdrawals_status_check;

alter table public.courier_withdrawals
  add constraint courier_withdrawals_status_check
  check (status in ('pending','approved','processing','completed','failed','rejected'));
