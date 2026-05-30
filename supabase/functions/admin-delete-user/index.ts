import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED = new Set(['https://campusrun.online', 'https://app.campusrun.online', 'https://admin.campusrun.online']);

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  const CORS = { 'Access-Control-Allow-Origin': ALLOWED.has(origin) ? origin : 'https://campusrun.online', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const json = (data: unknown, status: number) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Verify caller is an authenticated admin
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userToken  = authHeader.slice(7);
    const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, userToken);
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) return json({ error: 'Unauthorized' }, 401);

    // Confirm caller is admin
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: callerProfile } = await admin
      .from('profiles').select('is_admin').eq('id', caller.id).single();
    if (!callerProfile?.is_admin) return json({ error: 'Forbidden — admin only' }, 403);

    const { target_user_id } = await req.json();
    if (!target_user_id) return json({ error: 'target_user_id is required' }, 400);

    // Prevent admin from deleting themselves
    if (target_user_id === caller.id) {
      return json({ error: 'You cannot delete your own account' }, 400);
    }

    // Step 1: Wipe PII via RPC (blacklist + anonymise profile fields)
    await admin.rpc('admin_delete_user', { p_user_id: target_user_id });

    // Step 2: Hard-delete from auth.users — removes login credentials permanently
    const { error: delErr } = await admin.auth.admin.deleteUser(target_user_id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true }, 200);
  } catch (err) {
    console.error('admin-delete-user error:', err);
    return json({ error: String(err) }, 500);
  }
});

