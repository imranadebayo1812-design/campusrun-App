import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { deliveryId } = req.body;
  if (!deliveryId) return res.status(400).json({ error: 'deliveryId required' });

  try {
    const { data: delivery, error } = await supabase
      .from('deliveries').select('*').eq('id', deliveryId).single();
    if (error || !delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.courier_accepted) return res.json({ ok: true, message: 'Already accepted' });

    let courierQuery = supabase.from('profiles').select('id')
      .eq('is_courier', true).eq('is_blacklisted', false).eq('onboarding_complete', true);

    if (delivery.is_residential) courierQuery = courierQuery.eq('campus_status', 'residential');

    const { data: couriers } = await courierQuery.limit(5);

    if (!couriers?.length) {
      if (delivery.is_residential) {
        await supabase.from('deliveries')
          .update({ campus_courier_unavailable: true, gate_fallback_active: true })
          .eq('id', deliveryId);
        const { data: allCouriers } = await supabase.from('profiles').select('id')
          .eq('is_courier', true).eq('is_blacklisted', false).limit(5);
        if (!allCouriers?.length) return res.json({ ok: true, message: 'No couriers available' });
        await supabase.from('courier_notifications').insert(
          allCouriers.map(c => ({ delivery_id: deliveryId, courier_id: c.id, gate_only: true }))
        );
        return res.json({ ok: true, dispatched: allCouriers.length });
      }
      return res.json({ ok: true, message: 'No couriers available' });
    }

    await supabase.from('courier_notifications').insert(
      couriers.map(c => ({ delivery_id: deliveryId, courier_id: c.id, gate_only: false }))
    );
    res.json({ ok: true, dispatched: couriers.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
