-- STEP 3: Supporting Tables

create table if not exists public.notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  title      text        not null,
  body       text,
  type       text        default 'general',
  data       jsonb,
  read       boolean     default false,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id          uuid        primary key default uuid_generate_v4(),
  referrer_id uuid        not null references public.profiles(id) on delete cascade,
  referred_id uuid        not null references public.profiles(id) on delete cascade unique,
  earned      boolean     default false,
  created_at  timestamptz default now()
);

create table if not exists public.courier_earnings (
  id          uuid        primary key default uuid_generate_v4(),
  courier_id  uuid        not null references public.profiles(id) on delete cascade,
  delivery_id uuid        references public.deliveries(id) on delete set null,
  type        text        not null check (type in ('delivery_fee','tip','reimbursement')),
  amount      integer     not null,
  status      text        not null default 'available' check (status in ('available','withdrawn')),
  description text,
  created_at  timestamptz default now()
);

create table if not exists public.bank_accounts (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  bank_code      text        not null,
  bank_name      text        not null,
  account_number text        not null,
  account_name   text        not null,
  recipient_code text,
  created_at     timestamptz default now(),
  unique(user_id, bank_code, account_number)
);

create table if not exists public.courier_withdrawals (
  id                   uuid        primary key default gen_random_uuid(),
  courier_id           uuid        not null references public.profiles(id),
  type                 text        not null check (type in ('earnings','reimbursement')),
  destination          text        not null check (destination in ('wallet','bank')),
  gross_amount         integer     not null,
  net_amount           integer     not null,
  commission           integer     not null default 0,
  status               text        not null default 'pending'
                                   check (status in ('pending','processing','completed','failed')),
  paystack_transfer_id text,
  paystack_reference   text        unique,
  bank_name            text,
  account_number       text,
  account_name         text,
  failure_reason       text,
  created_at           timestamptz default now(),
  completed_at         timestamptz
);

create table if not exists public.push_tokens (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  token      text        not null,
  platform   text        not null default 'web',
  updated_at timestamptz not null default now(),
  unique(user_id, token)
);

create table if not exists public.chat_messages (
  id          uuid        primary key default uuid_generate_v4(),
  delivery_id uuid        references public.deliveries(id) on delete cascade,
  sender_id   uuid        references public.profiles(id) on delete set null,
  sender_role text        check (sender_role in ('buyer','courier')),
  message     text        not null,
  seen        boolean     default false,
  created_at  timestamptz default now()
);

create table if not exists public.delivery_feedback (
  id          uuid        primary key default uuid_generate_v4(),
  delivery_id uuid        references public.deliveries(id) on delete cascade,
  buyer_id    uuid        references public.profiles(id) on delete set null,
  courier_id  uuid        references public.profiles(id) on delete set null,
  rating      integer     check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now()
);
