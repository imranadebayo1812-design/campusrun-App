-- Run once in Supabase Dashboard → SQL Editor

-- 1. New profile columns
alter table public.profiles
  add column if not exists gender                text check (gender in ('male', 'female')),
  add column if not exists is_online             boolean not null default false,
  add column if not exists dnd_courier_reminders boolean not null default false;

-- 2. Allow off-campus fallback flag on orders
alter table public.deliveries
  add column if not exists allow_offcampus boolean not null default false;

-- 3. Chat → push notification trigger
create or replace function public.notify_on_chat_message()
returns trigger language plpgsql security definer as $$
declare
  v_buyer_id   uuid;
  v_courier_id uuid;
begin
  select buyer_id, courier_id
  into   v_buyer_id, v_courier_id
  from   public.deliveries
  where  id = NEW.delivery_id;

  if NEW.sender_role = 'buyer' and v_courier_id is not null then
    insert into public.notifications (user_id, title, body, type)
    values (v_courier_id, 'Message from buyer', left(NEW.message, 100), 'chat');

  elsif NEW.sender_role != 'buyer' and v_buyer_id is not null then
    insert into public.notifications (user_id, title, body, type)
    values (v_buyer_id, 'Message from your runner', left(NEW.message, 100), 'chat');
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_chat_message_notify on public.chat_messages;
create trigger on_chat_message_notify
  after insert on public.chat_messages
  for each row execute function public.notify_on_chat_message();
