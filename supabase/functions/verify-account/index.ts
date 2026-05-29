import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ALLOWED = new Set(['https://campusrun.online', 'https://admin.campusrun.online']);
const getCors = (o: string) => ({ 'Access-Control-Allow-Origin': ALLOWED.has(o) ? o : 'https://campusrun.online', 'Access-Control-Allow-Headers': 'authorization, content-type' });

serve(async (req) => {
  const CORS = getCors(req.headers.get('Origin') ?? '');
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { account_number, bank_code } = await req.json();

  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
    { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } },
  );

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
