-- Resilient cancel_delivery RPC.
-- Cancellation always succeeds. Wallet refund is attempted separately
-- so a constraint error there never blocks the cancellation itself.

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
  v_ref_err   text    := null;
begin
  select * into v_delivery
  from public.deliveries
  where id = p_delivery_id
  for update;

  if not found then
    raise exception 'delivery_not_found';
  end if;

  -- Idempotent
  if v_delivery.status = 'cancelled' then
    return jsonb_build_object('refunded', false, 'reason', 'already_cancelled');
  end if;

  -- Cannot cancel after arrived/delivered
  if v_delivery.status in ('arrived', 'delivered') then
    raise exception 'cannot_cancel_at_this_stage';
  end if;

  -- Authorisation: buyer, assigned courier, or admin
  if auth.uid() != v_delivery.buyer_id
     and (v_delivery.courier_id is null or auth.uid() != v_delivery.courier_id)
     and not public.is_admin()
  then
    raise exception 'not_authorized';
  end if;

  -- ── Step 1: Cancel the delivery (always) ───────────────────────
  update public.deliveries
  set status = 'cancelled', cancelled_by = p_cancelled_by
  where id = p_delivery_id;

  -- ── Step 2: Wallet refund (best-effort, never blocks step 1) ───
  if v_delivery.payment_method = 'wallet'
     and v_delivery.payment_verified = true
     and coalesce(v_delivery.total_amount, 0) > 0
  then
    begin
      -- Update wallet balance
      update public.profiles
      set wallet_balance = wallet_balance + v_delivery.total_amount
      where id = v_delivery.buyer_id
      returning wallet_balance into v_balance;

      -- Log the transaction using the actual column names in the table
      insert into public.wallet_transactions (
        user_id, type, amount, balance_after,
        description, delivery_id
      ) values (
        v_delivery.buyer_id,
        'refund',
        v_delivery.total_amount,
        v_balance,
        'Refund for cancelled order #' || left(p_delivery_id::text, 8),
        p_delivery_id
      );

      v_refunded := true;
    exception when others then
      v_ref_err := sqlerrm;
    end;

    -- ── Step 3: Notification (best-effort) ──────────────────────
    if v_refunded then
      begin
        insert into public.notifications (user_id, type, title, body)
        values (
          v_delivery.buyer_id,
          'refund',
          'Wallet Refunded',
          '₦' || v_delivery.total_amount::text ||
            ' has been returned to your wallet for your cancelled order.'
        );
      exception when others then
        null;
      end;
    end if;
  end if;

  return jsonb_build_object(
    'cancelled',       true,
    'refunded',        v_refunded,
    'amount',          v_delivery.total_amount,
    'payment_method',  v_delivery.payment_method,
    'refund_error',    v_ref_err
  );
end;
$$;

grant execute on function public.cancel_delivery(uuid, text) to authenticated;
