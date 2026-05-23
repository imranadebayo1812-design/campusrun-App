import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Only fire if there are actually unassigned orders waiting
  const { data: waiting } = await supabase
    .from('deliveries')
    .select('id')
    .eq('status', 'payment_verified')
    .is('courier_id', null)
    .limit(1);

  if (!waiting?.length) return new Response('no_orders_waiting');

  // Couriers who are offline and have not enabled Do Not Disturb
  const { data: couriers } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_courier', true)
    .eq('is_online', false)
    .eq('dnd_courier_reminders', false);

  if (!couriers?.length) return new Response('no_eligible_couriers');

  await supabase.from('notifications').insert(
    couriers.map(c => ({
      user_id: c.id,
      title:   'Orders waiting for a runner! 📦',
      body:    'There are delivery requests on CampusRun. Go online to start earning.',
      type:    'courier_reminder',
    }))
  );

  return new Response('ok');
});
