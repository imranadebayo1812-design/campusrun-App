-- cancel_delivery RPC
-- Cancels a delivery and refunds the buyer's wallet if payment was via wallet.
-- Paystack payments are NOT auto-refunded (admin processes manually).
-- Callers: buyer, courier (within grace period), admin.

create or replace function public.cancel_delivery(
  p_delivery_id  uuid,
  p_cancelled_by text default 'buyer'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_delivery  record;
  v_balance   numeric;
  v_refunded  boolean := false;
begin
  select * into v_delivery
  from public.deliveries
  where id = p_delivery_id
  for update;

  if not found then
    raise exception 'delivery_not_found';
  end if;

  -- Already cancelled — idempotent
  if v_delivery.status = 'cancelled' then
    return jsonb_build_object('refunded', false, 'reason', 'already_cancelled');
  end if;

  -- Cannot cancel after arrived / delivered
  if v_delivery.status in ('arrived', 'delivered') then
    raise exception 'cannot_cancel_at_this_stage';
  end if;

  -- Authorisation: caller must be buyer, courier, or admin
  if auth.uid() != v_delivery.buyer_id
     and auth.uid() != v_delivery.courier_id
     and not public.is_admin()
  then
    raise exception 'not_authorized';
  end if;

  -- Cancel the delivery
  update public.deliveries
  set status = 'cancelled', cancelled_by = p_cancelled_by
  where id = p_delivery_id;

  -- Wallet refund (wallet payments only)
  if v_delivery.payment_method = 'wallet'
     and v_delivery.payment_verified = true
     and coalesce(v_delivery.total_amount, 0) > 0
  then
    update public.profiles
    set wallet_balance = wallet_balance + v_delivery.total_amount
    where id = v_delivery.buyer_id
    returning wallet_balance into v_balance;

    insert into public.wallet_transactions (
      user_id, type, amount, balance_before, balance_after,
      description, delivery_id, reference
    ) values (
      v_delivery.buyer_id,
      'refund',
      v_delivery.total_amount,
      v_balance - v_delivery.total_amount,
      v_balance,
      'Refund for cancelled order #' || left(p_delivery_id::text, 8),
      p_delivery_id,
      'refund_' || p_delivery_id::text
    );

    -- Notify buyer about the refund
    insert into public.notifications (user_id, type, title, body)
    values (
      v_delivery.buyer_id,
      'refund',
      'Wallet Refunded',
      '₦' || v_delivery.total_amount::text || ' has been returned to your wallet for your cancelled order.'
    );

    v_refunded := true;
  end if;

  return jsonb_build_object(
    'refunded',        v_refunded,
    'amount',          v_delivery.total_amount,
    'payment_method',  v_delivery.payment_method
  );
end;
$$;

grant execute on function public.cancel_delivery(uuid, text) to authenticated;
