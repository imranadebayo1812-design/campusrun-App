-- fix_rejection_refund.sql
-- Run once in Supabase Dashboard → SQL Editor
-- Fixes: wallet_withdrawal rejections now refund money back to wallet

create or replace function public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason        text default 'Rejected by admin'
)
returns void language plpgsql security definer as $$
declare
  v_withdrawal public.courier_withdrawals%rowtype;
  v_before     numeric;
  v_after      numeric;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  -- Lock and fetch the withdrawal row
  select * into v_withdrawal
  from public.courier_withdrawals
  where id = p_withdrawal_id and status = 'pending'
  for update;

  if not found then
    raise exception 'withdrawal_not_found_or_already_actioned';
  end if;

  update public.courier_withdrawals
  set
    status        = 'rejected',
    rejected_at   = now(),
    reject_reason = p_reason
  where id = p_withdrawal_id;

  -- Refund wallet if money was already deducted (wallet_withdrawal type)
  if v_withdrawal.type = 'wallet_withdrawal' then
    select wallet_balance into v_before
    from public.profiles where id = v_withdrawal.courier_id;

    update public.profiles
    set wallet_balance = wallet_balance + v_withdrawal.gross_amount
    where id = v_withdrawal.courier_id
    returning wallet_balance into v_after;

    insert into public.wallet_transactions (
      user_id, type, amount, balance_before, balance_after, description
    ) values (
      v_withdrawal.courier_id, 'refund', v_withdrawal.gross_amount, v_before, v_after,
      'Withdrawal request rejected — funds returned to wallet'
    );
  end if;

  -- Notify the courier
  insert into public.notifications (user_id, type, title, body)
  values (
    v_withdrawal.courier_id, 'withdrawal_rejected',
    'Withdrawal Rejected',
    case
      when v_withdrawal.type = 'wallet_withdrawal'
        then '₦' || v_withdrawal.gross_amount::text || ' has been returned to your wallet. Reason: ' || p_reason
      else 'Your withdrawal of ₦' || v_withdrawal.gross_amount::text || ' was rejected. Reason: ' || p_reason
    end
  );
end;
$$;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;
