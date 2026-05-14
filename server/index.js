import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PORT = process.env.PORT || 3001;

// ─── Health ───────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── Dispatch order to couriers ───────────────────────────────
app.post('/api/dispatch', async (req, res) => {
  const { deliveryId } = req.body;
  if (!deliveryId) return res.status(400).json({ error: 'deliveryId required' });

  try {
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (error || !delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.courier_accepted) return res.json({ ok: true, message: 'Already accepted' });

    // Find available couriers
    let courierQuery = supabase
      .from('profiles')
      .select('id')
      .eq('is_courier', true)
      .eq('is_blacklisted', false)
      .eq('onboarding_complete', true);

    // Phase 1: residential — prefer campus couriers
    if (delivery.is_residential) {
      courierQuery = courierQuery.eq('campus_status', 'residential');
    }

    const { data: couriers } = await courierQuery.limit(5);

    if (!couriers || couriers.length === 0) {
      // Phase 2: fallback to all couriers
      if (delivery.is_residential) {
        await supabase.from('deliveries').update({ campus_courier_unavailable: true, gate_fallback_active: true }).eq('id', deliveryId);
        const { data: allCouriers } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_courier', true)
          .eq('is_blacklisted', false)
          .limit(5);

        if (!allCouriers?.length) return res.json({ ok: true, message: 'No couriers available' });

        const notifications = allCouriers.map(c => ({
          delivery_id: deliveryId,
          courier_id: c.id,
          gate_only: true,
        }));
        await supabase.from('courier_notifications').insert(notifications);
        return res.json({ ok: true, dispatched: allCouriers.length });
      }
      return res.json({ ok: true, message: 'No couriers available' });
    }

    const notifications = couriers.map(c => ({
      delivery_id: deliveryId,
      courier_id: c.id,
      gate_only: false,
    }));
    await supabase.from('courier_notifications').insert(notifications);
    res.json({ ok: true, dispatched: couriers.length });

  } catch (e) {
    console.error('dispatch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Complete delivery (credit courier earnings) ───────────────
app.post('/api/complete-delivery', async (req, res) => {
  const { deliveryId } = req.body;
  if (!deliveryId) return res.status(400).json({ error: 'deliveryId required' });

  try {
    const { data: delivery } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('status', 'delivered')
      .single();

    if (!delivery) return res.status(404).json({ error: 'Delivery not found or not delivered' });
    if (!delivery.courier_id) return res.status(400).json({ error: 'No courier assigned' });

    const earnings = (delivery.delivery_fee || 0) + (delivery.food_cost || 0);

    // Get current balance
    const { data: courier } = await supabase
      .from('profiles')
      .select('wallet_balance, total_earnings')
      .eq('id', delivery.courier_id)
      .single();

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
    console.error('complete-delivery error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Wallet top-up (after Paystack callback) ─────────────────
app.post('/api/wallet/topup', async (req, res) => {
  const { userId, amount, reference } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

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
    console.error('topup error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Pay delivery with wallet ─────────────────────────────────
app.post('/api/wallet/pay-delivery', async (req, res) => {
  const { deliveryId, userId, amount } = req.body;
  if (!deliveryId || !userId || !amount) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

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
    console.error('wallet-pay error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Tip courier ──────────────────────────────────────────────
app.post('/api/tip', async (req, res) => {
  const { deliveryId, courierId, amount, reference } = req.body;
  if (!deliveryId || !courierId || !amount) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { data: courier } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', courierId)
      .single();

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
    console.error('tip error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Security event log ───────────────────────────────────────
app.post('/api/security/event', async (req, res) => {
  const { userId, action, details, risk_level, device_fingerprint, device_info } = req.body;
  try {
    await supabase.from('security_logs').insert({
      user_id: userId || null,
      action,
      details,
      risk_level: risk_level || 'low',
      device_fingerprint,
      device_info,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`CampusRun server running on http://localhost:${PORT}`);
});
