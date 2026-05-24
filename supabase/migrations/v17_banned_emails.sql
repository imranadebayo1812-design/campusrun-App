-- Stores emails that are permanently banned from re-registering
create table if not exists public.banned_emails (
  email      text primary key,
  banned_at  timestamptz default now(),
  reason     text
);

alter table public.banned_emails enable row level security;

-- Only admins can read/manage the list
create policy "Admins manage banned emails"
  on public.banned_emails for all using (public.is_admin());

-- Security definer so the anon/authenticated role can call it
-- without needing direct read access to the table
create or replace function public.is_email_banned(p_email text)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.banned_emails
    where lower(email) = lower(p_email)
  );
$$;

grant execute on function public.is_email_banned(text) to anon, authenticated;
