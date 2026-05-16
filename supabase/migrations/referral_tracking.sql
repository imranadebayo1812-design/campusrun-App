-- Run in Supabase Dashboard → SQL Editor
-- Wires referral code tracking: sets referred_by on signup, credits ₦100 on onboarding completion.

-- ── 1. Update handle_new_user to resolve referral code → referred_by ──────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_referrer_id uuid;
  v_ref_code    text;
begin
  v_ref_code := trim(upper(new.raw_user_meta_data ->> 'referral_code'));

  if v_ref_code is not null and v_ref_code <> '' then
    select id into v_referrer_id
    from public.profiles
    where referral_code = v_ref_code
    limit 1;
  end if;

  insert into public.profiles (id, email, full_name, referral_code, referred_by)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    generate_referral_code(),
    v_referrer_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ── 2. Credit ₦100 to referrer when referee completes onboarding ──────────────
create or replace function public.credit_referral_bonus()
returns trigger language plpgsql security definer as $$
declare
  v_new_balance integer;
begin
  -- Only fire when onboarding_complete transitions false → true
  if not (
    (OLD.onboarding_complete is distinct from true) and
    NEW.onboarding_complete = true
  ) then
    return NEW;
  end if;

  if NEW.referred_by is null then return NEW; end if;

  -- Idempotent: skip if already credited
  if exists (
    select 1 from public.referrals
    where referred_id = NEW.id and earned = true
  ) then
    return NEW;
  end if;

  -- Credit referrer
  update public.profiles
  set wallet_balance = wallet_balance + 100
  where id = NEW.referred_by
  returning wallet_balance into v_new_balance;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_after, description)
  values
    (NEW.referred_by, 'earning', 100, v_new_balance,
     'Referral bonus — friend joined CampusRun');

  -- Record referral as earned
  insert into public.referrals (referrer_id, referred_id, earned)
  values (NEW.referred_by, NEW.id, true)
  on conflict (referred_id) do update set earned = true;

  return NEW;
end;
$$;

drop trigger if exists on_onboarding_complete on public.profiles;
create trigger on_onboarding_complete
  after update on public.profiles
  for each row execute function public.credit_referral_bonus();
