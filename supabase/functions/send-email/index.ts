import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const _ALLOWED = new Set(['https://campusrun.online', 'https://admin.campusrun.online']);
const _getCors = (origin: string) => ({
  'Access-Control-Allow-Origin': _ALLOWED.has(origin) ? origin : 'https://campusrun.online',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const FROM = 'CampusRun <hello@campusrun.online>';

// Escape HTML to prevent injection in email templates
function h(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Decode JWT payload to check role without a network call
function jwtPayload(token: string): Record<string, unknown> {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

// Solid colors only — gradients and box-shadow are stripped by most email clients
function baseTemplate(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b0f19;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

        <!-- Logo pill -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" bgcolor="#00d1ff" style="background-color:#00d1ff;border-radius:14px;padding:11px 26px;">
              <span style="font-size:20px;font-weight:800;color:#0b0f19;letter-spacing:-0.5px;">CampusRun</span>
            </td></tr>
          </table>
          <p style="font-size:11px;color:#64748b;margin:8px 0 0;text-align:center;">Campus Deliveries &middot; Nile University</p>
        </td></tr>

        <!-- Cyan top bar -->
        <tr><td bgcolor="#00d1ff" style="background-color:#00d1ff;border-radius:16px 16px 0 0;height:5px;font-size:1px;line-height:1px;">&nbsp;</td></tr>

        <!-- Card body -->
        <tr><td bgcolor="#111827" style="background-color:#111827;border-left:1px solid #1e3a4a;border-right:1px solid #1e3a4a;border-bottom:1px solid #1e3a4a;border-radius:0 0 16px 16px;padding:32px 28px;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="font-size:11px;color:#334155;margin:0;">&copy; ${new Date().getFullYear()} CampusRun &middot; Nile University, Abuja</p>
          <p style="font-size:11px;color:#334155;margin:4px 0 0;">support@campusrun.online &middot; 08144009370</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeEmail(name: string, referralCode: string) {
  return {
    subject: `Welcome to CampusRun, ${h(name)}!`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;background-color:#0d2233;border-radius:50%;display:inline-block;line-height:56px;font-size:24px;border:2px solid #00d1ff;">&#x1F44B;</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 8px 0;text-align:center;">Welcome, ${h(name)}!</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;text-align:center;">
        You&rsquo;re now part of CampusRun &mdash; the fastest way to get deliveries done at Nile University.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#161f2e" style="background-color:#161f2e;border-left:3px solid #00d1ff;border-radius:12px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#00d1ff;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;padding-bottom:12px;">HOW IT WORKS</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">&#x1F3E0;&nbsp;&nbsp;Browse vendors on the Home tab</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">&#x1F4E6;&nbsp;&nbsp;Place your order in seconds</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">&#x1F4CD;&nbsp;&nbsp;Track your runner in real-time</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">&#x1F4B8;&nbsp;&nbsp;Pay with card or wallet balance</td></tr>
      </table>
      ${referralCode ? `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0d2233" style="background-color:#0d2233;border:2px solid #00d1ff;border-radius:12px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#00d1ff;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;padding-bottom:8px;">YOUR REFERRAL CODE</td></tr>
        <tr><td style="color:#f8fafc;font-size:26px;font-weight:800;letter-spacing:8px;padding-bottom:6px;">${h(referralCode)}</td></tr>
        <tr><td style="color:#64748b;font-size:12px;">Earn &#x20a6;100 for every friend who joins</td></tr>
      </table>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" bgcolor="#00d1ff" style="background-color:#00d1ff;border-radius:12px;padding:15px;">
          <a href="https://app.campusrun.online" style="color:#0b0f19;text-decoration:none;font-weight:700;font-size:15px;">Start Ordering &rarr;</a>
        </td></tr>
      </table>
    `),
  };
}

function topupReceiptEmail(name: string, amount: number, newBalance: number, reference: string) {
  return {
    subject: `Wallet credited: &#x20a6;${amount.toLocaleString()}`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;background-color:#0d2233;border-radius:50%;display:inline-block;line-height:56px;font-size:24px;border:2px solid #00d1ff;">&#x1F4B3;</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 6px 0;text-align:center;">Wallet Credited</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px 0;text-align:center;">Hi ${h(name)}, your wallet has been topped up.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#161f2e" style="background-color:#161f2e;border-left:3px solid #00d1ff;border-radius:12px;margin-bottom:20px;">
        <tr>
          <td style="color:#94a3b8;font-size:13px;padding:13px 16px;">Amount added</td>
          <td style="color:#4ade80;font-size:18px;font-weight:700;text-align:right;padding:13px 16px;">+&#x20a6;${amount.toLocaleString()}</td>
        </tr>
        <tr style="border-top:1px solid #1e3a4a;">
          <td style="color:#94a3b8;font-size:13px;padding:13px 16px;border-top:1px solid #1e3a4a;">New balance</td>
          <td style="color:#f8fafc;font-size:15px;font-weight:600;text-align:right;padding:13px 16px;border-top:1px solid #1e3a4a;">&#x20a6;${newBalance.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-size:12px;padding:11px 16px;border-top:1px solid #1e3a4a;">Reference</td>
          <td style="color:#94a3b8;font-size:11px;font-family:monospace;text-align:right;padding:11px 16px;border-top:1px solid #1e3a4a;">${h(reference)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-size:12px;padding:11px 16px;border-top:1px solid #1e3a4a;">Date</td>
          <td style="color:#94a3b8;font-size:12px;text-align:right;padding:11px 16px;border-top:1px solid #1e3a4a;">${new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
      <p style="color:#475569;font-size:12px;text-align:center;margin:0;">
        Not you? Contact us at <a href="mailto:support@campusrun.online" style="color:#00d1ff;text-decoration:none;">support@campusrun.online</a>
      </p>
    `),
  };
}

function orderReceiptEmail(name: string, pickup: string, dropoff: string, total: number, deliveryId: string) {
  return {
    subject: `Order confirmed &mdash; &#x20a6;${total.toLocaleString()}`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;background-color:#0d2233;border-radius:50%;display:inline-block;line-height:56px;font-size:24px;border:2px solid #00d1ff;">&#x1F4E6;</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 6px 0;text-align:center;">Order Confirmed</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px 0;text-align:center;">Hi ${h(name)}, your order is placed. A runner will pick it up shortly.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#161f2e" style="background-color:#161f2e;border-left:3px solid #00d1ff;border-radius:12px;margin-bottom:20px;">
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:12px 16px;">Pickup</td>
          <td style="color:#f8fafc;font-size:13px;font-weight:500;text-align:right;padding:12px 16px;">${h(pickup)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:12px 16px;border-top:1px solid #1e3a4a;">Dropoff</td>
          <td style="color:#f8fafc;font-size:13px;font-weight:500;text-align:right;padding:12px 16px;border-top:1px solid #1e3a4a;">${h(dropoff)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:12px 16px;border-top:1px solid #1e3a4a;">Total paid</td>
          <td style="color:#4ade80;font-size:16px;font-weight:700;text-align:right;padding:12px 16px;border-top:1px solid #1e3a4a;">&#x20a6;${total.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-size:12px;padding:11px 16px;border-top:1px solid #1e3a4a;">Order ID</td>
          <td style="color:#94a3b8;font-size:11px;font-family:monospace;text-align:right;padding:11px 16px;border-top:1px solid #1e3a4a;">${h(deliveryId.slice(0, 8)).toUpperCase()}</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" bgcolor="#00d1ff" style="background-color:#00d1ff;border-radius:12px;padding:15px;">
          <a href="https://app.campusrun.online/track/${h(deliveryId)}" style="color:#0b0f19;text-decoration:none;font-weight:700;font-size:15px;">Track My Order &rarr;</a>
        </td></tr>
      </table>
    `),
  };
}

function accountRestoredEmail(name: string) {
  return {
    subject: 'Your CampusRun account has been restored',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;background-color:#0d2d1a;border-radius:50%;display:inline-block;line-height:56px;font-size:24px;border:2px solid #4ade80;">&#x2705;</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 6px 0;text-align:center;">Account Restored</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;text-align:center;">
        Hi ${h(name)}, your CampusRun account has been reviewed and access has been fully restored.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#161f2e" style="background-color:#161f2e;border-left:3px solid #4ade80;border-radius:12px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#4ade80;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;padding-bottom:12px;">NEXT STEPS</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">1.&nbsp;&nbsp;Log in to CampusRun</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">2.&nbsp;&nbsp;Complete your profile details</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">3.&nbsp;&nbsp;Resume ordering as normal</td></tr>
      </table>
      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 20px 0;text-align:center;">
        Questions? Contact us at
        <a href="mailto:support@campusrun.online" style="color:#00d1ff;text-decoration:none;">support@campusrun.online</a>
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" bgcolor="#00d1ff" style="background-color:#00d1ff;border-radius:12px;padding:15px;">
          <a href="https://app.campusrun.online" style="color:#0b0f19;text-decoration:none;font-weight:700;font-size:15px;">Log In to CampusRun &rarr;</a>
        </td></tr>
      </table>
    `),
  };
}

serve(async (req) => {
  const CORS_HEADERS = _getCors(req.headers.get('Origin') ?? '');
  const res = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return res({ error: 'Email service not configured' }, 503);

    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (token) {
      const payload = jwtPayload(token);
      const userId = payload.sub as string | undefined;
      const role   = payload.role as string | undefined;
      if (userId && role !== 'service_role' && role !== 'anon') {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const { data: allowed } = await admin.rpc('check_rate_limit', {
          p_user_id:        userId,
          p_action:         'send_email',
          p_max_calls:      10,
          p_window_seconds: 3600,
        });
        if (!allowed) return res({ error: 'Too many requests. Try again later.' }, 429);
      }
    }

    const { type, to, data } = await req.json();

    let emailContent: { subject: string; html: string };

    if (type === 'welcome') {
      emailContent = welcomeEmail(data.name, data.referral_code || '');
    } else if (type === 'topup_receipt') {
      emailContent = topupReceiptEmail(data.name, data.amount, data.new_balance, data.reference);
    } else if (type === 'order_receipt') {
      emailContent = orderReceiptEmail(data.name, data.pickup, data.dropoff, data.total, data.delivery_id);
    } else if (type === 'account_restored') {
      emailContent = accountRestoredEmail(data.name || 'there');
    } else {
      return res({ error: 'Unknown email type' }, 400);
    }

    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], ...emailContent }),
    });

    const json = await result.json();
    if (!result.ok) throw new Error(json?.message || 'Resend API error');

    return res({ ok: true, id: json.id }, 200);
  } catch (err) {
    console.error('send-email error:', err);
    return res({ error: String(err) }, 500);
  }
});
