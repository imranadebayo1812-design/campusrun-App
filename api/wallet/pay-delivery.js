import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { deliveryId, userId, amount } = req.body;
  if (!deliveryId || !userId || !amount) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { data: profile } = await supabase
      .from('profiles').select('wallet_balance').eq('id', userId).single();

    if ((profile?.wallet_balance || 0) < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const newBalance = profile.wallet_balance - amount;
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
    await supabase.from('deliveries').update({
      payment_method: 'wallet',
      payment_verified: true,
    }).eq('id', deliveryId);

    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      type: 'payment',
      amount,
      balance_after: newBalance,
      description: `Payment for delivery ${deliveryId.slice(0, 8)}`,
      delivery_id: deliveryId,
    });

    res.json({ ok: true, newBalance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
