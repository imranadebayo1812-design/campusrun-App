import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED = new Set(['https://campusrun.online', 'https://app.campusrun.online', 'https://admin.campusrun.online']);

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  const CORS = { 'Access-Control-Allow-Origin': ALLOWED.has(origin) ? origin : 'https://campusrun.online', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify caller is admin
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: caller } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!caller?.is_admin) return json({ error: 'Admin access required' }, 403);

  const { withdrawal_id } = await req.json();
  if (!withdrawal_id) return json({ error: 'withdrawal_id required' }, 400);

  // Fetch the withdrawal
  const { data: w, error: fetchErr } = await supabase
    .from('courier_withdrawals')
    .select('*')
    .eq('id', withdrawal_id)
    .single();

  if (fetchErr || !w) return json({ error: 'Withdrawal not found' }, 404);
  if (w.status !== 'pending') return json({ error: `Cannot approve a ${w.status} withdrawal` }, 400);
  if (!w.account_number || !w.account_name) return json({ error: 'Missing bank details' }, 400);

  const PAYSTACK_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
  const reference = `cr-adm-${w.id.slice(0, 8)}-${Date.now()}`;

  // If we have bank_code use it; otherwise resolve from bank_name
  let recipientCode: string;
  try {
    let bankCode = w.bank_code;

    if (!bankCode) {
      // Try to resolve bank code from Paystack banks list
      const banksRes = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=200', {
        headers: { Authorization: `Bearer ${PAYSTACK_KEY}` },
      });
      const banksData = await banksRes.json();
      const match = (banksData.data ?? []).find((b: { name: string; code: string }) =>
        b.name.toLowerCase().includes((w.bank_name ?? '').toLowerCase()) ||
        (w.bank_name ?? '').toLowerCase().includes(b.name.toLowerCase())
      );
      if (!match) return json({ error: `Could not resolve bank code for "${w.bank_name}". Edit the withdrawal and add the bank code manually.` }, 400);
      bankCode = match.code;
    }

    // Create Paystack transfer recipient
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'nuban',
        name: w.account_name,
        account_number: w.account_number,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });
    const recipientData = await recipientRes.json();
    if (!recipientData.status) {
      return json({ error: recipientData.message ?? 'Could not create transfer recipient' }, 400);
    }
    recipientCode = recipientData.data.recipient_code;
  } catch (err) {
    return json({ error: `Paystack error: ${String(err)}` }, 500);
  }

  // Initiate transfer
  const transferRes = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'balance',
      reason: `CampusRun courier payout — ${w.type}`,
      amount: w.net_amount * 100, // kobo
      recipient: recipientCode,
      reference,
    }),
  });
  const transferData = await transferRes.json();
  if (!transferData.status) {
    return json({ error: transferData.message ?? 'Transfer initiation failed' }, 400);
  }

  // Update withdrawal record
  await supabase.from('courier_withdrawals').update({
    status: transferData.data.status === 'success' ? 'completed' : 'processing',
    paystack_transfer_id: String(transferData.data.id ?? ''),
    paystack_reference: reference,
    approved_at: new Date().toISOString(),
  }).eq('id', withdrawal_id);

  // Notify courier
  await supabase.from('notifications').insert({
    user_id: w.courier_id,
    title: 'Payout initiated 💸',
    body: `Your withdrawal of ₦${w.net_amount.toLocaleString()} has been approved and is on the way to your bank.`,
    type: 'withdrawal_update',
  });

  return json({ success: true, reference, status: transferData.data.status });
});
