-- v14_reference_nullable.sql
-- Run once in Supabase Dashboard → SQL Editor
-- Fix: cancel/refund wallet_transactions fail because reference column is NOT NULL
-- Refunds, cancellations, and manual adjustments don't have a payment reference

alter table public.wallet_transactions
  alter column reference drop not null;
