import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, amount, reference } = req.body;
  if (!userId || !amount || !reference) return res.status(400).json({ error: 'userId, amount and reference required' });

  try {
    // Verify payment with Paystack before crediting
    if (process.env.PAYSTACK_SECRET_KEY) {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      const { data: txn } = await verifyRes.json();
      if (txn?.status !== 'success') {
        return res.status(400).json({ error: 'Payment not verified' });
      }
      if (Math.abs(txn.amount - Math.round(amount * 100)) > 1) {
        return res.status(400).json({ error: 'Amount mismatch' });
      }
    }

    const { data: profile } = await supabase
      .from('profiles').select('wallet_balance').eq('id', userId).single();

    const newBalance = (profile?.wallet_balance || 0) + amount;
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);

    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      type: 'topup',
      amount,
      balance_after: newBalance,
      description: 'Wallet top-up via Paystack',
      paystack_reference: reference,
    });

    res.json({ ok: true, newBalance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
