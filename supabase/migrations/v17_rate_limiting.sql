-- Sliding-window rate limiting via a simple calls log.
-- Used by edge functions to prevent email spam and payout flooding.

create table if not exists public.rate_limit_calls (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null,
  action     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_calls_lookup
  on public.rate_limit_calls (user_id, action, created_at desc);

-- RLS: only service_role can read/write (edge functions use service role)
alter table public.rate_limit_calls enable row level security;

-- Returns true (allowed) and records the call, or false (blocked) without recording.
create or replace function public.check_rate_limit(
  p_user_id       uuid,
  p_action        text,
  p_max_calls     integer,
  p_window_seconds integer
)
returns boolean language plpgsql security definer as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.rate_limit_calls
  where user_id = p_user_id
    and action  = p_action
    and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_calls then
    return false;
  end if;

  insert into public.rate_limit_calls (user_id, action)
  values (p_user_id, p_action);

  -- Prune entries older than 24 h to keep the table small
  delete from public.rate_limit_calls
  where action = p_action
    and created_at < now() - interval '24 hours';

  return true;
end;
$$;

grant execute on function public.check_rate_limit(uuid, text, integer, integer)
  to service_role;
