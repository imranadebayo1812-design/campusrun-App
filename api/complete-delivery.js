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
    const { data: delivery } = await supabase
      .from('deliveries').select('*').eq('id', deliveryId).eq('status', 'delivered').single();
    if (!delivery) return res.status(404).json({ error: 'Delivery not found or not delivered' });
    if (!delivery.courier_id) return res.status(400).json({ error: 'No courier assigned' });

    const earnings = (delivery.delivery_fee || 0) + (delivery.food_cost || 0);

    const { data: courier } = await supabase
      .from('profiles').select('wallet_balance, total_earnings').eq('id', delivery.courier_id).single();

    const newBalance = (courier?.wallet_balance || 0) + earnings;

    await supabase.from('profiles').update({
      wallet_balance: newBalance,
      total_earnings: (courier?.total_earnings || 0) + earnings,
    }).eq('id', delivery.courier_id);

    await supabase.from('wallet_transactions').insert({
      user_id: delivery.courier_id,
      type: 'earning',
      amount: earnings,
      balance_after: newBalance,
      description: `Delivery ${deliveryId.slice(0, 8)} — ${delivery.pickup_location} → ${delivery.dropoff_location}`,
      delivery_id: deliveryId,
    });

    res.json({ ok: true, earnings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
