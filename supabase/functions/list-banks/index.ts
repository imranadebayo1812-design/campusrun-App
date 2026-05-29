import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ALLOWED = new Set(['https://campusrun.online', 'https://admin.campusrun.online']);
const getCors = (o: string) => ({ 'Access-Control-Allow-Origin': ALLOWED.has(o) ? o : 'https://campusrun.online', 'Access-Control-Allow-Headers': 'authorization, content-type' });

serve(async (req) => {
  const CORS = getCors(req.headers.get('Origin') ?? '');
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const res = await fetch(
    'https://api.paystack.co/bank?currency=NGN&perPage=100&use_cursor=false',
    { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } },
  );

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
