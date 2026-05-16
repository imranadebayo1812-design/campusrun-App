import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const body = await req.text();

  // Verify Paystack signature (HMAC-SHA512)
  const secret    = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
  const sigHeader = req.headers.get('x-paystack-signature') ?? '';

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (hex !== sigHeader) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (event.event === 'transfer.success') {
    await supabase
      .from('courier_withdrawals')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('paystack_reference', event.data.reference);
  }

  if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
    await supabase
      .from('courier_withdrawals')
      .update({
        status:         'failed',
        failure_reason: event.data.reason ?? event.event,
        completed_at:   new Date().toISOString(),
      })
      .eq('paystack_reference', event.data.reference);
  }

  return new Response('ok', { status: 200 });
});
