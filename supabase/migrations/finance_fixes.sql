-- ============================================================
-- FINANCE FIXES — run once in Supabase SQL Editor
-- ============================================================

-- ── 1. Fix record_topup ──────────────────────────────────────
-- Was inserting into column named 'reference' which doesn't exist.
-- Correct column name is 'paystack_reference'.

create or replace function public.record_topup(p_reference text, p_amount integer)
returns void language plpgsql security definer as $$
declare v_balance numeric;
begin
  if exists (
    select 1 from public.wallet_transactions where paystack_reference = p_reference
  ) then return; end if;

  update public.profiles
  set wallet_balance = wallet_balance + p_amount
  where id = auth.uid()
  returning wallet_balance into v_balance;

  insert into public.wallet_transactions (
    user_id, type, amount, balance_after, description, paystack_reference
  ) values (
    auth.uid(), 'topup', p_amount, v_balance, 'Wallet top-up via Paystack', p_reference
  );
end;
$$;
grant execute on function public.record_topup(text, integer) to authenticated;


-- ── 2. Fix transfer_earnings_to_wallet ──────────────────────
-- Was inserting into column named 'reference' which doesn't exist.

create or replace function public.transfer_earnings_to_wallet(
  p_amount integer,
  p_type   text
)
returns void language plpgsql security definer as $$
declare
  v_commission integer;
  v_net        integer;
  v_balance    numeric;
  v_desc       text;
begin
  if p_type not in ('earnings', 'reimbursement') then
    raise exception 'invalid type';
  end if;

  v_commission := case when p_type = 'earnings' then floor(p_amount * 0.15)::integer else 0 end;
  v_net        := p_amount - v_commission;
  v_desc       := case when p_type = 'earnings'
                    then 'Earnings transferred to wallet'
                    else 'Reimbursement transferred to wallet' end;

  update public.profiles
  set wallet_balance = wallet_balance + v_net
  where id = auth.uid()
  returning wallet_balance into v_balance;

  insert into public.wallet_transactions (
    user_id, type, amount, balance_after, description
  ) values (
    auth.uid(), 'earning', v_net, v_balance, v_desc
  );

  insert into public.courier_withdrawals (
    courier_id, type, destination, gross_amount, net_amount, commission, status, completed_at
  ) values (
    auth.uid(), p_type, 'wallet', p_amount, v_net, v_commission, 'completed', now()
  );
end;
$$;
grant execute on function public.transfer_earnings_to_wallet(integer, text) to authenticated;


-- ── 3. Fix wallet_transactions RLS ──────────────────────────
-- Old policy only allowed service_role, blocking all our security
-- definer RPCs from logging transactions.

drop policy if exists "Service role can insert wallet transactions" on public.wallet_transactions;
create policy "Users can log their own wallet transactions"
  on public.wallet_transactions for insert
  with check (user_id = auth.uid());


-- ── 4. Auto-create courier earnings on delivery complete ─────
-- No trigger existed — couriers never got earnings credited.

create or replace function public.on_delivery_completed()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'delivered' and (old.status is null or old.status != 'delivered') then
    begin
      if new.courier_id is not null and coalesce(new.delivery_fee, 0) > 0 then
        if not exists (
          select 1 from public.courier_earnings
          where delivery_id = new.id and type = 'delivery_fee'
        ) then
          insert into public.courier_earnings (courier_id, delivery_id, type, amount, status)
          values (new.courier_id, new.id, 'delivery_fee', new.delivery_fee::integer, 'pending');
        end if;
      end if;

      if new.courier_id is not null and coalesce(new.tip, 0) > 0 then
        if not exists (
          select 1 from public.courier_earnings
          where delivery_id = new.id and type = 'tip'
        ) then
          insert into public.courier_earnings (courier_id, delivery_id, type, amount, status)
          values (new.courier_id, new.id, 'tip', new.tip::integer, 'pending');
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


-- ── 5. accept_price_edit RPC ─────────────────────────────────
-- Clears price_edit_flag, strips original_price from items, and
-- logs a reimbursement earning for the courier (for the extra they paid).

create or replace function public.accept_price_edit(p_delivery_id uuid)
returns void language plpgsql security definer as $$
declare
  v_delivery record;
  v_diff     numeric := 0;
  v_item     jsonb;
begin
  select * into v_delivery
  from public.deliveries
  where id = p_delivery_id
  for update;

  if not found then raise exception 'delivery_not_found'; end if;
  if auth.uid() != v_delivery.buyer_id then raise exception 'not_authorized'; end if;
  if not coalesce(v_delivery.price_edit_flag, false) then return; end if;

  -- Calculate total extra the courier paid
  for v_item in select value from jsonb_array_elements(coalesce(v_delivery.items, '[]'::jsonb)) loop
    if (v_item->>'original_price') is not null then
      v_diff := v_diff + (
        (v_item->>'price')::numeric - (v_item->>'original_price')::numeric
      ) * coalesce((v_item->>'qty')::numeric, 1);
    end if;
  end loop;

  -- Strip original_price from items, clear flag
  update public.deliveries
  set
    items                    = (select jsonb_agg(item - 'original_price')
                                 from jsonb_array_elements(items) as item),
    price_edit_flag          = false,
    price_edit_buyer_response = 'accepted'
  where id = p_delivery_id;

  -- Credit courier reimbursement
  if v_diff > 0 and v_delivery.courier_id is not null then
    if not exists (
      select 1 from public.courier_earnings
      where delivery_id = p_delivery_id and type = 'reimbursement'
    ) then
      insert into public.courier_earnings (courier_id, delivery_id, type, amount, status)
      values (v_delivery.courier_id, p_delivery_id, 'reimbursement', v_diff::integer, 'pending');
    end if;
  end if;
end;
$$;
grant execute on function public.accept_price_edit(uuid) to authenticated;
