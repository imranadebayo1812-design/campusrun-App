import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')!;
const FCM_URL    = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

serve(async (req) => {
  try {
    const payload = await req.json();
    const record  = payload?.record;
    if (!record?.user_id) return ok();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', record.user_id);

    if (!tokens?.length) return ok();

    const accessToken = await getFCMAccessToken();

    await Promise.allSettled(tokens.map(({ token, platform }) => {
      const message: Record<string, unknown> = {
        token,
        notification: {
          title: record.title ?? 'CampusRun',
          body:  record.body  ?? '',
        },
        data: {
          type:     record.type     ?? 'info',
          notif_id: record.id       ?? '',
        },
      };

      // Native Android token — use android-specific channel config
      if (platform === 'android') {
        message.android = {
          notification: {
            icon:         'ic_launcher',
            channel_id:   'campusrun_default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        };
      } else {
        // Web push token — route through browser push service
        message.webpush = {
          notification: { icon: '/logo.png', badge: '/logo.png' },
        };
      }

      return fetch(FCM_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ message }),
      });
    }));

    return ok();
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function ok() {
  return new Response('ok', { status: 200 });
}

async function getFCMAccessToken(): Promise<string> {
  const sa   = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!);
  const jwt  = await signServiceAccountJWT(sa.client_email, sa.private_key);

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });

  const { access_token } = await res.json();
  return access_token;
}

async function signServiceAccountJWT(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now    = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim  = {
    iss:   clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  };

  const enc      = new TextEncoder();
  const b64url   = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const input    = `${b64url(header)}.${b64url(claim)}`;
  const pemBody  = privateKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  );

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(input));
  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${input}.${b64sig}`;
}
