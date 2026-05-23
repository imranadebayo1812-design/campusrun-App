-- v13_critical_fixes.sql
-- Run once in Supabase Dashboard → SQL Editor
-- Fixes: courier food reimbursement, cancel_delivery transaction logging,
--        accept_price_edit total update, order expiry, referral on first order

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure wallet_transactions has balance_before column (live DB may vary)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.wallet_transactions
  add column if not exists balance_before numeric(10,2);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix cancel_delivery — log balance_before in wallet transaction
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_delivery(
  p_delivery_id  uuid,
  p_cancelled_by text default 'buyer'
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_delivery  record;
  v_before    numeric;
  v_after     numeric;
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

  if v_delivery.status = 'cancelled' then
    return jsonb_build_object('refunded', false, 'reason', 'already_cancelled');
  end if;

  if v_delivery.status in ('arrived', 'delivered') then
    raise exception 'cannot_cancel_at_this_stage';
  end if;

  if auth.uid() != v_delivery.buyer_id
     and (v_delivery.courier_id is null or auth.uid() != v_delivery.courier_id)
     and not public.is_admin()
  then
    raise exception 'not_authorized';
  end if;

  -- Step 1: cancel
  update public.deliveries
  set status = 'cancelled', cancelled_by = p_cancelled_by
  where id = p_delivery_id;

  -- Step 2: refund to wallet (any confirmed payment — wallet or Paystack)
  if v_delivery.payment_verified = true
     and coalesce(v_delivery.total_amount, 0) > 0
  then
    begin
      select wallet_balance into v_before
      from public.profiles where id = v_delivery.buyer_id;

      update public.profiles
      set wallet_balance = wallet_balance + v_delivery.total_amount
      where id = v_delivery.buyer_id
      returning wallet_balance into v_after;

      insert into public.wallet_transactions (
        user_id, type, amount, balance_before, balance_after,
        description, delivery_id
      ) values (
        v_delivery.buyer_id,
        'refund',
        v_delivery.total_amount,
        v_before,
        v_after,
        'Refund for cancelled order #' || left(p_delivery_id::text, 8),
        p_delivery_id
      );

      v_refunded := true;
    exception when others then
      v_ref_err := sqlerrm;
    end;

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
      exception when others then null;
      end;
    end if;
  end if;

  return jsonb_build_object(
    'cancelled',      true,
    'refunded',       v_refunded,
    'amount',         v_delivery.total_amount,
    'payment_method', v_delivery.payment_method,
    'refund_error',   v_ref_err
  );
end;
$$;
grant execute on function public.cancel_delivery(uuid, text) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fix on_delivery_completed — add food_cost reimbursement for courier
--    Couriers front the item cost out of pocket; they must be reimbursed.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.on_delivery_completed()
returns trigger language plpgsql security definer as $$
declare
  v_before numeric;
begin
  if new.status = 'delivered' and (old.status is null or old.status != 'delivered') then
    begin
      -- Delivery fee earning
      if new.courier_id is not null and coalesce(new.delivery_fee, 0) > 0 then
        if not exists (
          select 1 from public.courier_earnings
          where delivery_id = new.id and type = 'delivery_fee'
        ) then
          insert into public.courier_earnings (courier_id, delivery_id, type, amount, status)
          values (new.courier_id, new.id, 'delivery_fee', new.delivery_fee::integer, 'pending');
        end if;
      end if;

      -- Tip earning
      if new.courier_id is not null and coalesce(new.tip, 0) > 0 then
        if not exists (
          select 1 from public.courier_earnings
          where delivery_id = new.id and type = 'tip'
        ) then
          insert into public.courier_earnings (courier_id, delivery_id, type, amount, status)
          values (new.courier_id, new.id, 'tip', new.tip::integer, 'pending');
        end if;
      end if;

      -- Food cost reimbursement — courier paid for items out of pocket
      if new.courier_id is not null
         and new.order_type = 'purchase'
         and coalesce(new.food_cost, 0) > 0
      then
        if not exists (
          select 1 from public.courier_earnings
          where delivery_id = new.id and type = 'reimbursement'
        ) then
          insert into public.courier_earnings (courier_id, delivery_id, type, amount, status)
          values (new.courier_id, new.id, 'reimbursement', new.food_cost::integer, 'pending');
        end if;
      end if;

    exception when others then
      null; -- never block the delivery status update
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists delivery_completed_trigger on public.deliveries;
create trigger delivery_completed_trigger
  after update on public.deliveries
  for each row
  execute function public.on_delivery_completed();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fix accept_price_edit — update total_amount and food_cost when accepted
--    The buyer accepts new prices so the delivery record must reflect the
--    actual cost, ensuring the courier reimbursement on completion is correct.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.accept_price_edit(p_delivery_id uuid)
returns void language plpgsql security definer as $$
declare
  v_delivery    record;
  v_extra       numeric := 0;
  v_new_food    numeric := 0;
  v_item        jsonb;
begin
  select * into v_delivery
  from public.deliveries
  where id = p_delivery_id
  for update;

  if not found then raise exception 'delivery_not_found'; end if;
  if auth.uid() != v_delivery.buyer_id then raise exception 'not_authorized'; end if;
  if not coalesce(v_delivery.price_edit_flag, false) then return; end if;

  -- Calculate new food total and the extra the courier paid
  for v_item in select value from jsonb_array_elements(coalesce(v_delivery.items, '[]'::jsonb)) loop
    v_new_food := v_new_food +
      (v_item->>'price')::numeric * coalesce((v_item->>'qty')::numeric, 1);
    if (v_item->>'original_price') is not null then
      v_extra := v_extra + (
        (v_item->>'price')::numeric - (v_item->>'original_price')::numeric
      ) * coalesce((v_item->>'qty')::numeric, 1);
    end if;
  end loop;

  -- Strip original_price from items, clear flag, update totals
  update public.deliveries
  set
    items                     = (select jsonb_agg(item - 'original_price')
                                  from jsonb_array_elements(items) as item),
    price_edit_flag           = false,
    price_edit_buyer_response = 'accepted',
    food_cost                 = v_new_food,
    total_amount              = v_new_food + coalesce(delivery_fee, 0) + coalesce(service_fee, 0)
  where id = p_delivery_id;

  -- Credit courier reimbursement for the extra they paid
  if v_extra > 0 and v_delivery.courier_id is not null then
    if not exists (
      select 1 from public.courier_earnings
      where delivery_id = p_delivery_id and type = 'reimbursement'
    ) then
      insert into public.courier_earnings (courier_id, delivery_id, type, amount, status)
      values (v_delivery.courier_id, p_delivery_id, 'reimbursement', v_extra::integer, 'pending');
    end if;
  end if;
end;
$$;
grant execute on function public.accept_price_edit(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Expire stale orders — cancel paid orders with no courier after 2 hours
--    Call this RPC from the client on app load (no pg_cron required).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.expire_stale_orders()
returns integer language plpgsql security definer as $$
declare
  v_row    record;
  v_before numeric;
  v_after  numeric;
  v_count  integer := 0;
begin
  for v_row in
    select * from public.deliveries
    where status = 'placed'
      and payment_verified = true
      and courier_id is null
      and created_at < now() - interval '2 hours'
    for update skip locked
  loop
    -- Cancel
    update public.deliveries
    set status = 'cancelled', cancelled_by = 'system'
    where id = v_row.id;

    -- Refund
    if coalesce(v_row.total_amount, 0) > 0 then
      begin
        select wallet_balance into v_before
        from public.profiles where id = v_row.buyer_id;

        update public.profiles
        set wallet_balance = wallet_balance + v_row.total_amount
        where id = v_row.buyer_id
        returning wallet_balance into v_after;

        insert into public.wallet_transactions (
          user_id, type, amount, balance_before, balance_after, description, delivery_id
        ) values (
          v_row.buyer_id, 'refund', v_row.total_amount, v_before, v_after,
          'Auto-refund: no courier available after 2 hours', v_row.id
        );

        insert into public.notifications (user_id, type, title, body)
        values (
          v_row.buyer_id, 'refund',
          'Order Expired — Refunded',
          'No runner was available within 2 hours. ₦' || v_row.total_amount::text || ' has been returned to your wallet.'
        );
      exception when others then null;
      end;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
grant execute on function public.expire_stale_orders() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Fix referral bonus — credit on first paid order, not on onboarding
--    Prevents fake account abuse (create account → collect referral bonus).
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the old onboarding trigger
drop trigger if exists on_onboarding_complete_credit_referral on public.profiles;

-- New trigger fires when a delivery's payment_verified flips to true
create or replace function public.credit_referral_on_first_order()
returns trigger language plpgsql security definer as $$
declare
  v_referrer_id uuid;
  v_count       integer;
begin
  -- Only care about payment_verified becoming true
  if not (new.payment_verified = true and (old.payment_verified = false or old.payment_verified is null)) then
    return new;
  end if;

  -- Check this is the buyer's first ever paid order
  select count(*) into v_count
  from public.deliveries
  where buyer_id = new.buyer_id
    and payment_verified = true
    and id != new.id;

  if v_count > 0 then return new; end if; -- not first order

  -- Look up referrer
  select referred_by into v_referrer_id
  from public.profiles where id = new.buyer_id;

  if v_referrer_id is null then return new; end if;

  -- Idempotent: only credit once per referred user
  if exists (
    select 1 from public.referrals
    where referred_id = new.buyer_id and earned = true
  ) then return new; end if;

  begin
    -- Credit ₦100 to referrer
    update public.profiles
    set wallet_balance = wallet_balance + 100
    where id = v_referrer_id;

    insert into public.wallet_transactions (
      user_id, type, amount, balance_after, description
    )
    select v_referrer_id, 'topup', 100, wallet_balance,
           'Referral bonus — friend placed first order'
    from public.profiles where id = v_referrer_id;

    insert into public.referrals (referrer_id, referred_id, earned)
    values (v_referrer_id, new.buyer_id, true)
    on conflict do nothing;

    insert into public.notifications (user_id, type, title, body)
    values (
      v_referrer_id, 'referral',
      '₦100 Referral Bonus!',
      'Your referral placed their first order. ₦100 has been added to your wallet.'
    );
  exception when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists on_first_order_credit_referral on public.deliveries;
create trigger on_first_order_credit_referral
  after update on public.deliveries
  for each row execute function public.credit_referral_on_first_order();
