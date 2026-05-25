import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

function baseTemplate(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:28px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="display:inline-table;">
            <tr><td style="background:linear-gradient(135deg,#00d1ff 0%,#0080ff 100%);border-radius:14px;padding:10px 22px;">
              <span style="font-size:20px;font-weight:800;color:#0b0f19;letter-spacing:-0.5px;">CampusRun</span>
            </td></tr>
          </table>
          <span style="font-size:11px;color:#475569;display:block;margin-top:8px;">Campus Deliveries · Nile University</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#111827;border:1px solid rgba(0,209,255,0.15);border-radius:20px;padding:32px 28px;box-shadow:0 0 40px rgba(0,209,255,0.06);">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="font-size:11px;color:#334155;margin:0;">© ${new Date().getFullYear()} CampusRun · Nile University, Abuja</p>
          <p style="font-size:11px;color:#334155;margin:4px 0 0;">support@campusrun.online · 08144009370</p>
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
        <div style="width:52px;height:52px;background:rgba(0,209,255,0.12);border-radius:50%;display:inline-block;line-height:52px;font-size:22px;">👋</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;">Welcome, ${h(name)}!</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
        You're now part of CampusRun — the fastest way to get deliveries done at Nile University.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161f2e;border:1px solid rgba(0,209,255,0.08);border-radius:14px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding-bottom:10px;">How it works</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">🏠&nbsp; Browse vendors on the Home tab</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">📦&nbsp; Place your order in seconds</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">📍&nbsp; Track your runner in real-time</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">💸&nbsp; Pay with card or wallet balance</td></tr>
      </table>
      ${referralCode ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,209,255,0.06);border:1px solid rgba(0,209,255,0.2);border-radius:14px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#00d1ff;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding-bottom:6px;">Your Referral Code</td></tr>
        <tr><td style="color:#f8fafc;font-size:24px;font-weight:800;letter-spacing:6px;padding-bottom:4px;">${h(referralCode)}</td></tr>
        <tr><td style="color:#64748b;font-size:12px;">Earn ₦100 for every friend who joins</td></tr>
      </table>` : ''}
      <a href="https://app.campusrun.online" style="display:block;background:linear-gradient(135deg,#00d1ff 0%,#0080ff 100%);color:#0b0f19;text-decoration:none;text-align:center;padding:15px;border-radius:14px;font-weight:700;font-size:15px;box-shadow:0 0 24px rgba(0,209,255,0.3);">
        Start Ordering →
      </a>
    `),
  };
}

function topupReceiptEmail(name: string, amount: number, newBalance: number, reference: string) {
  return {
    subject: `Wallet credited: ₦${amount.toLocaleString()}`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:52px;height:52px;background:rgba(0,209,255,0.12);border-radius:50%;display:inline-block;line-height:52px;font-size:22px;">💳</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 6px;text-align:center;">Wallet Credited</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;text-align:center;">Hi ${h(name)}, your wallet has been topped up.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161f2e;border:1px solid rgba(0,209,255,0.08);border-radius:14px;padding:0 16px;margin-bottom:20px;">
        <tr>
          <td style="color:#64748b;font-size:13px;padding:12px 0;">Amount added</td>
          <td style="color:#4ade80;font-size:18px;font-weight:700;text-align:right;padding:12px 0;">+₦${amount.toLocaleString()}</td>
        </tr>
        <tr style="border-top:1px solid rgba(255,255,255,0.06);">
          <td style="color:#64748b;font-size:13px;padding:12px 0;">New balance</td>
          <td style="color:#f8fafc;font-size:15px;font-weight:600;text-align:right;padding:12px 0;">₦${newBalance.toLocaleString()}</td>
        </tr>
        <tr style="border-top:1px solid rgba(255,255,255,0.06);">
          <td style="color:#64748b;font-size:12px;padding:10px 0;">Reference</td>
          <td style="color:#94a3b8;font-size:11px;font-family:monospace;text-align:right;padding:10px 0;">${h(reference)}</td>
        </tr>
        <tr style="border-top:1px solid rgba(255,255,255,0.06);">
          <td style="color:#64748b;font-size:12px;padding:10px 0;">Date</td>
          <td style="color:#94a3b8;font-size:12px;text-align:right;padding:10px 0;">${new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
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
    subject: `Order confirmed — ₦${total.toLocaleString()}`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:52px;height:52px;background:rgba(0,209,255,0.12);border-radius:50%;display:inline-block;line-height:52px;font-size:22px;">📦</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 6px;text-align:center;">Order Confirmed</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;text-align:center;">Hi ${h(name)}, your order is placed. A runner will pick it up shortly.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161f2e;border:1px solid rgba(0,209,255,0.08);border-radius:14px;padding:0 16px;margin-bottom:20px;">
        <tr>
          <td style="color:#64748b;font-size:12px;padding:11px 0;">Pickup</td>
          <td style="color:#f8fafc;font-size:13px;font-weight:500;text-align:right;padding:11px 0;">${h(pickup)}</td>
        </tr>
        <tr style="border-top:1px solid rgba(255,255,255,0.06);">
          <td style="color:#64748b;font-size:12px;padding:11px 0;">Dropoff</td>
          <td style="color:#f8fafc;font-size:13px;font-weight:500;text-align:right;padding:11px 0;">${h(dropoff)}</td>
        </tr>
        <tr style="border-top:1px solid rgba(255,255,255,0.06);">
          <td style="color:#64748b;font-size:12px;padding:11px 0;">Total paid</td>
          <td style="color:#4ade80;font-size:16px;font-weight:700;text-align:right;padding:11px 0;">₦${total.toLocaleString()}</td>
        </tr>
        <tr style="border-top:1px solid rgba(255,255,255,0.06);">
          <td style="color:#64748b;font-size:12px;padding:11px 0;">Order ID</td>
          <td style="color:#94a3b8;font-size:11px;font-family:monospace;text-align:right;padding:11px 0;">${h(deliveryId.slice(0, 8)).toUpperCase()}</td>
        </tr>
      </table>
      <a href="https://app.campusrun.online/track/${h(deliveryId)}" style="display:block;background:linear-gradient(135deg,#00d1ff 0%,#0080ff 100%);color:#0b0f19;text-decoration:none;text-align:center;padding:15px;border-radius:14px;font-weight:700;font-size:15px;box-shadow:0 0 24px rgba(0,209,255,0.3);">
        Track My Order →
      </a>
    `),
  };
}

function accountRestoredEmail(name: string) {
  return {
    subject: 'Your CampusRun account has been restored',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:52px;height:52px;background:rgba(74,222,128,0.12);border-radius:50%;display:inline-block;line-height:52px;font-size:22px;">✅</div>
      </div>
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 6px;text-align:center;">Account Restored</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
        Hi ${h(name)}, your CampusRun account has been reviewed and access has been fully restored.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161f2e;border:1px solid rgba(0,209,255,0.08);border-radius:14px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding-bottom:10px;">Next steps</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">1.&nbsp; Log in to CampusRun</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">2.&nbsp; Complete your profile details</td></tr>
        <tr><td style="color:#e2e8f0;font-size:13px;padding:4px 0;">3.&nbsp; Resume ordering as normal</td></tr>
      </table>
      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 20px;text-align:center;">
        Questions? Contact us at
        <a href="mailto:support@campusrun.online" style="color:#00d1ff;text-decoration:none;">support@campusrun.online</a>
      </p>
      <a href="https://app.campusrun.online" style="display:block;background:linear-gradient(135deg,#00d1ff 0%,#0080ff 100%);color:#0b0f19;text-decoration:none;text-align:center;padding:15px;border-radius:14px;font-weight:700;font-size:15px;box-shadow:0 0 24px rgba(0,209,255,0.3);">
        Log In to CampusRun →
      </a>
    `),
  };
}

function res(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return res({ error: 'Email service not configured' }, 503);

    // Rate limit user-triggered calls (service_role / anon system calls bypass)
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (token) {
      const payload = jwtPayload(token);
      const userId = payload.sub as string | undefined;
      const role   = payload.role as string | undefined;
      // Only rate-limit real user JWTs (not service_role or anon system calls)
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
