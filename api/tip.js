import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { deliveryId, courierId, amount, reference } = req.body;
  if (!deliveryId || !courierId || !amount) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { data: courier } = await supabase
      .from('profiles').select('wallet_balance').eq('id', courierId).single();

    const newBalance = (courier?.wallet_balance || 0) + amount;
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', courierId);
    await supabase.from('deliveries').update({ tip: amount }).eq('id', deliveryId);

    await supabase.from('wallet_transactions').insert({
      user_id: courierId,
      type: 'tip',
      amount,
      balance_after: newBalance,
      description: `Tip for delivery ${deliveryId.slice(0, 8)}`,
      delivery_id: deliveryId,
      paystack_reference: reference,
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
