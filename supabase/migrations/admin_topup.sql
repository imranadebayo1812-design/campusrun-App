-- Run once in Supabase Dashboard → SQL Editor
-- Adds admin_topup RPC for manually crediting a user's wallet

create or replace function public.admin_topup(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text default 'Admin manual top-up'
)
returns void language plpgsql security definer as $$
declare
  v_before numeric;
  v_after  numeric;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  select wallet_balance into v_before from public.profiles where id = p_user_id;

  update public.profiles
  set wallet_balance = wallet_balance + p_amount
  where id = p_user_id
  returning wallet_balance into v_after;

  insert into public.wallet_transactions (
    user_id, type, amount, balance_before, balance_after, reference, description
  ) values (
    p_user_id, 'topup', p_amount, v_before, v_after,
    'admin_' || to_char(now(), 'YYYYMMDDHH24MISS') || '_' || left(p_user_id::text, 8),
    p_reason
  );
end;
$$;
grant execute on function public.admin_topup(uuid, integer, text) to authenticated;
