-- Trigger: notify buyer + courier when delivery status changes
-- Run this once in Supabase SQL Editor

create or replace function public.notify_on_delivery_status_change()
returns trigger language plpgsql security definer as $$
declare
  v_buyer_id    uuid := NEW.buyer_id;
  v_courier_id  uuid := NEW.courier_id;
  v_short_id    text := left(NEW.id::text, 8);
begin
  -- Only fire when status actually changes
  if OLD.status = NEW.status then
    return NEW;
  end if;

  -- Notify BUYER based on new status
  if NEW.status = 'bought' then
    insert into public.notifications (user_id, title, body, type)
    values (v_buyer_id, 'Items purchased 🛍️', 'Your runner has bought your items and is heading to you.', 'delivery_update');

  elsif NEW.status = 'on_the_way' then
    insert into public.notifications (user_id, title, body, type)
    values (v_buyer_id, 'Order on the way 🏃', 'Your runner is heading to your location now.', 'delivery_update');

  elsif NEW.status = 'arrived' then
    insert into public.notifications (user_id, title, body, type)
    values (v_buyer_id, 'Runner has arrived! 📍', 'Your runner is at your location. Check the app for your delivery code.', 'delivery_update');

  elsif NEW.status = 'delivered' then
    insert into public.notifications (user_id, title, body, type)
    values (v_buyer_id, 'Order delivered ✅', 'Your order has been delivered. Enjoy!', 'delivery_update');

  elsif NEW.status = 'cancelled' then
    -- Notify buyer if a courier cancelled (courier_id was set)
    if v_buyer_id is not null then
      insert into public.notifications (user_id, title, body, type)
      values (v_buyer_id, 'Order cancelled', 'Your order #' || v_short_id || ' has been cancelled.', 'delivery_cancelled');
    end if;
    -- Notify courier if buyer cancelled (courier was already assigned)
    if v_courier_id is not null then
      insert into public.notifications (user_id, title, body, type)
      values (v_courier_id, 'Order cancelled', 'Order #' || v_short_id || ' was cancelled by the buyer.', 'delivery_cancelled');
    end if;
  end if;

  -- Notify COURIERS when a new order is placed (no courier assigned yet)
  if NEW.status = 'placed' and OLD.status is distinct from 'placed' then
    -- Insert one notification per courier (fetched via join)
    insert into public.notifications (user_id, title, body, type)
    select p.id, 'New order available! 📦',
           'A new delivery just came in. Open the app to accept it.',
           'new_order'
    from public.profiles p
    where p.is_courier = true
      and p.is_blacklisted is not true;
  end if;

  -- Notify COURIER when they're assigned to an order
  if NEW.courier_id is not null and OLD.courier_id is distinct from NEW.courier_id then
    insert into public.notifications (user_id, title, body, type)
    values (v_courier_id, 'Order assigned to you 🎯', 'You have been assigned order #' || v_short_id || '. Check the app.', 'delivery_update');
  end if;

  return NEW;
end;
$$;

-- Drop and recreate trigger
drop trigger if exists on_delivery_status_change on public.deliveries;

create trigger on_delivery_status_change
  after update on public.deliveries
  for each row
  execute function public.notify_on_delivery_status_change();

-- Also fire when a new delivery is inserted (placed)
drop trigger if exists on_delivery_insert on public.deliveries;

create trigger on_delivery_insert
  after insert on public.deliveries
  for each row
  execute function public.notify_on_delivery_status_change();
