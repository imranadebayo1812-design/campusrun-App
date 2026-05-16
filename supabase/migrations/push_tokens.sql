-- Run this in Supabase Dashboard → SQL Editor

create table if not exists public.push_tokens (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  token      text        not null,
  platform   text        not null default 'web',
  updated_at timestamptz not null default now(),
  unique(user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow the edge function (service role) to read tokens for any user
-- (service role bypasses RLS by default — no extra policy needed)
