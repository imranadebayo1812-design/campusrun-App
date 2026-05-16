-- STEP 5: RPCs + Auth Triggers

create or replace function public.record_topup(p_reference text, p_amount integer)
returns void language plpgsql security definer as $$
declare v_balance integer;
begin
  if exists (select 1 from public.wallet_transactions where reference = p_reference) then return; end if;
  update public.profiles set wallet_balance = wallet_balance + p_amount
  where id = auth.uid() returning wallet_balance into v_balance;
  insert into public.wallet_transactions (user_id, type, amount, balance_after, description, reference)
  values (auth.uid(), 'topup', p_amount, v_balance, 'Wallet top-up', p_reference);
end;
$$;

create or replace function public.pay_delivery_with_wallet(p_delivery_id uuid, p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
declare v_balance integer;
begin
  select wallet_balance into v_balance from public.profiles where id = p_user_id for update;
  if v_balance < p_amount then raise exception 'Insufficient wallet balance'; end if;
  update public.profiles set wallet_balance = wallet_balance - p_amount where id = p_user_id;
  update public.deliveries set payment_method = 'wallet', payment_verified = true where id = p_delivery_id;
  insert into public.wallet_transactions (user_id, type, amount, balance_after, description, delivery_id)
  values (p_user_id, 'payment', p_amount, v_balance - p_amount,
          'Wallet payment for delivery ' || left(p_delivery_id::text, 8), p_delivery_id);
end;
$$;

create or replace function public.transfer_earnings_to_wallet(p_amount integer, p_type text)
returns void language plpgsql security definer as $$
declare v_commission integer; v_net integer; v_balance integer; v_desc text;
begin
  if p_type not in ('earnings','reimbursement') then raise exception 'invalid type'; end if;
  v_commission := case when p_type = 'earnings' then floor(p_amount * 0.15)::integer else 0 end;
  v_net := p_amount - v_commission;
  v_desc := case when p_type = 'earnings' then 'Earnings transferred to wallet' else 'Reimbursement transferred to wallet' end;
  update public.profiles set wallet_balance = wallet_balance + v_net where id = auth.uid() returning wallet_balance into v_balance;
  insert into public.wallet_transactions (user_id, type, amount, balance_after, description, reference)
  values (auth.uid(), 'earning', v_net, v_balance, v_desc, 'wallet-transfer-' || to_char(now(), 'YYYYMMDDHH24MISS'));
  insert into public.courier_withdrawals (courier_id, type, destination, gross_amount, net_amount, commission, status, completed_at)
  values (auth.uid(), p_type, 'wallet', p_amount, v_net, v_commission, 'completed', now());
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare v_referrer_id uuid; v_ref_code text;
begin
  v_ref_code := trim(upper(new.raw_user_meta_data ->> 'referral_code'));
  if v_ref_code is not null and v_ref_code <> '' then
    select id into v_referrer_id from public.profiles where referral_code = v_ref_code limit 1;
  end if;
  insert into public.profiles (id, email, full_name, referral_code, referred_by)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), public.generate_referral_code(), v_referrer_id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.credit_referral_bonus()
returns trigger language plpgsql security definer as $$
declare v_new_balance integer;
begin
  if not ((OLD.onboarding_complete is distinct from true) and NEW.onboarding_complete = true) then return NEW; end if;
  if NEW.referred_by is null then return NEW; end if;
  if exists (select 1 from public.referrals where referred_id = NEW.id and earned = true) then return NEW; end if;
  update public.profiles set wallet_balance = wallet_balance + 100 where id = NEW.referred_by returning wallet_balance into v_new_balance;
  insert into public.wallet_transactions (user_id, type, amount, balance_after, description)
  values (NEW.referred_by, 'earning', 100, v_new_balance, 'Referral bonus — friend joined CampusRun');
  insert into public.referrals (referrer_id, referred_id, earned)
  values (NEW.referred_by, NEW.id, true)
  on conflict (referred_id) do update set earned = true;
  return NEW;
end;
$$;

drop trigger if exists on_onboarding_complete on public.profiles;
create trigger on_onboarding_complete after update on public.profiles for each row execute function public.credit_referral_bonus();
