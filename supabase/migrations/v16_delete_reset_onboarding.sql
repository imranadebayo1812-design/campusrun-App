-- When a deletion is approved, reset onboarding + terms so that if the
-- account is ever restored, the user is forced to re-enter their details
-- and re-accept terms before accessing the app.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  update public.profiles
  set
    is_blacklisted      = true,
    blacklist_reason    = 'Account deleted by admin',
    full_name           = '[Deleted User]',
    phone_number        = null,
    hostel              = null,
    course              = null,
    referral_code       = null,
    referred_by         = null,
    onboarding_complete = false,
    terms_accepted      = false
  where id = p_user_id;

  update public.deletion_requests
  set status = 'approved', reviewed_at = now()
  where user_id = p_user_id and status = 'pending';
end;
$$;
