-- Add pending_payment status so deliveries aren't visible to couriers before payment.
-- Run in Supabase Dashboard → SQL Editor

-- 1. Extend the status constraint to allow pending_payment
ALTER TABLE public.deliveries
  DROP CONSTRAINT IF EXISTS deliveries_status_check;

ALTER TABLE public.deliveries
  ADD CONSTRAINT deliveries_status_check
    CHECK (status IN ('pending_payment','placed','bought','on_the_way','arrived','delivered','cancelled'));

-- 2. Change the default so new rows start as pending_payment
ALTER TABLE public.deliveries
  ALTER COLUMN status SET DEFAULT 'pending_payment';

-- 3. Update pay_delivery_with_wallet to also flip status → placed
CREATE OR REPLACE FUNCTION public.pay_delivery_with_wallet(
  p_delivery_id uuid,
  p_user_id uuid,
  p_amount numeric
)
RETURNS void AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE public.profiles
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = p_user_id;

  UPDATE public.deliveries
    SET payment_method = 'wallet', payment_verified = true, status = 'placed'
    WHERE id = p_delivery_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, description, delivery_id)
  VALUES (
    p_user_id, 'payment', p_amount, v_balance - p_amount,
    'Wallet payment for delivery ' || left(p_delivery_id::text, 8),
    p_delivery_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
