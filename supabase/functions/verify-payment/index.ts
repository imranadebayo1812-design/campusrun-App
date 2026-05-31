import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED = new Set(['https://campusrun.online', 'https://app.campusrun.online', 'https://admin.campusrun.online']);

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  const CORS = { 'Access-Control-Allow-Origin': ALLOWED.has(origin) ? origin : 'https://campusrun.online', 'Access-Control-Allow-Headers': 'authorization, content-type' };
  const json = (data: unknown, status: number) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userToken = authHeader.slice(7);
    const userClient = createClient(SUPABASE_URL, userToken);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { delivery_id, reference } = await req.json();
    if (!delivery_id || !reference) {
      return json({ error: 'delivery_id and reference are required' }, 400);
    }

    // Confirm the delivery belongs to this buyer
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: delivery } = await admin
      .from('deliveries')
      .select('buyer_id, total_amount, payment_verified, status')
      .eq('id', delivery_id)
      .single();

    if (!delivery) return json({ error: 'Delivery not found' }, 404);
    if (delivery.buyer_id !== user.id) return json({ error: 'Forbidden' }, 403);
    if (delivery.payment_verified) {
      // Already charged — webhook may have set payment_verified without status: placed.
      // Ensure status is corrected so the order becomes visible to couriers.
      if (delivery.status === 'pending_payment') {
        await admin.from('deliveries').update({ status: 'placed' }).eq('id', delivery_id);
      }
      return json({ success: true }, 200);
    }

    // Verify with Paystack
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } },
    );
    const psBody = await psRes.json();

    if (!psRes.ok || psBody.data?.status !== 'success') {
      return json({ error: 'Payment not confirmed by Paystack' }, 400);
    }

    // Amount check: Paystack returns kobo, we store naira
    const paidNaira = psBody.data.amount / 100;
    if (paidNaira < delivery.total_amount) {
      return json({ error: 'Amount mismatch' }, 400);
    }

    // Use service role to mark verified — bypasses RLS column guard
    const { error: updErr } = await admin
      .from('deliveries')
      .update({ payment_verified: true, status: 'placed', payment_method: 'paystack', payment_reference: reference })
      .eq('id', delivery_id);

    if (updErr) return json({ error: updErr.message }, 500);

    return json({ success: true }, 200);
  } catch (err) {
    console.error('verify-payment error:', err);
    return json({ error: String(err) }, 500);
  }
});

