-- Wallet payment RPC (called from frontend for wallet payments)
-- Uses service-role-equivalent logic via server; this is a helper
create or replace function public.pay_delivery_with_wallet(
  p_delivery_id uuid,
  p_user_id uuid,
  p_amount numeric
)
returns void as $$
declare
  v_balance numeric;
begin
  select wallet_balance into v_balance from public.profiles where id = p_user_id for update;
  if v_balance < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where id = p_user_id;

  update public.deliveries
  set payment_method = 'wallet', payment_verified = true
  where id = p_delivery_id;

  insert into public.wallet_transactions (user_id, type, amount, balance_after, description, delivery_id)
  values (
    p_user_id, 'payment', p_amount, v_balance - p_amount,
    'Wallet payment for delivery ' || left(p_delivery_id::text, 8),
    p_delivery_id
  );
end;
$$ language plpgsql security definer;
