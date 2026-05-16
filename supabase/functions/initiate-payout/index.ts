import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // Authenticate caller
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { amount, type, bank_code, account_number, account_name, bank_name } = await req.json();

  if (!amount || amount < 500) return json({ error: 'Minimum payout is ₦500' }, 400);
  if (!['earnings', 'reimbursement'].includes(type)) return json({ error: 'Invalid type' }, 400);

  const commission = type === 'earnings' ? Math.floor(amount * 0.15) : 0;
  const net        = amount - commission;
  const reference  = `cr-${user.id.slice(0, 8)}-${Date.now()}`;

  // 1. Create Paystack transfer recipient
  const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type:           'nuban',
      name:           account_name,
      account_number,
      bank_code,
      currency:       'NGN',
    }),
  });
  const recipient = await recipientRes.json();
  if (!recipient.status) {
    return json({ error: recipient.message ?? 'Could not create transfer recipient' }, 400);
  }

  // 2. Initiate transfer
  const transferRes = await fetch('https://api.paystack.co/transfer', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source:    'balance',
      reason:    `CampusRun courier ${type} payout`,
      amount:    net * 100, // kobo
      recipient: recipient.data.recipient_code,
      reference,
    }),
  });
  const transfer = await transferRes.json();
  if (!transfer.status) {
    return json({ error: transfer.message ?? 'Transfer initiation failed' }, 400);
  }

  // 3. Record withdrawal
  await supabase.from('courier_withdrawals').insert({
    courier_id:           user.id,
    type,
    destination:          'bank',
    gross_amount:         amount,
    net_amount:           net,
    commission,
    status:               transfer.data.status === 'success' ? 'completed' : 'processing',
    paystack_transfer_id: String(transfer.data.id ?? ''),
    paystack_reference:   reference,
    bank_name,
    account_number,
    account_name,
  });

  return json({ success: true, reference });
});
