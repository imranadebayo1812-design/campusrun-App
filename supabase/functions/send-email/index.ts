import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FROM = 'CampusRun <hello@campusrun.online>';

function baseTemplate(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#7c3aed;letter-spacing:-0.5px;">CampusRun</span>
          <span style="font-size:11px;color:#6b7280;display:block;margin-top:2px;">Campus Deliveries · Nile University</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="font-size:11px;color:#4b5563;margin:0;">© ${new Date().getFullYear()} CampusRun · support@campusrun.online · 08144009370</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeEmail(name: string, referralCode: string) {
  return {
    subject: `Welcome to CampusRun, ${name}! 🎉`,
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;">Welcome, ${name}! 👋</h1>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px;">
        You're now part of CampusRun — the fastest way to get deliveries done at Nile University.
      </p>
      <table width="100%" style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#6b7280;font-size:12px;padding-bottom:4px;">How it works</td></tr>
        <tr><td style="color:#e5e7eb;font-size:13px;padding:3px 0;">🏠 Browse vendors on the Home tab</td></tr>
        <tr><td style="color:#e5e7eb;font-size:13px;padding:3px 0;">📦 Place your order in seconds</td></tr>
        <tr><td style="color:#e5e7eb;font-size:13px;padding:3px 0;">📍 Track your runner in real-time</td></tr>
        <tr><td style="color:#e5e7eb;font-size:13px;padding:3px 0;">💸 Pay with card or wallet balance</td></tr>
      </table>
      ${referralCode ? `
      <table width="100%" style="background:#1e1b4b;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px;margin-bottom:20px;">
        <tr><td style="color:#a78bfa;font-size:12px;padding-bottom:6px;">Your referral code</td></tr>
        <tr><td style="color:#fff;font-size:22px;font-weight:800;letter-spacing:4px;">${referralCode}</td></tr>
        <tr><td style="color:#6b7280;font-size:12px;padding-top:4px;">Earn ₦100 for every friend who joins</td></tr>
      </table>` : ''}
      <a href="https://campusrun-eqcenaour-campus-run.vercel.app" style="display:block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:14px;">
        Start Ordering →
      </a>
    `),
  };
}

function topupReceiptEmail(name: string, amount: number, newBalance: number, reference: string) {
  return {
    subject: `Wallet credited: ₦${amount.toLocaleString()}`,
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">Payment Confirmed ✅</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 20px;">Hi ${name}, your wallet has been topped up.</p>
      <table width="100%" style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;border-collapse:collapse;">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0;">Amount added</td>
          <td style="color:#34d399;font-size:16px;font-weight:700;text-align:right;">+₦${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0;border-top:1px solid rgba(255,255,255,0.06);">New balance</td>
          <td style="color:#fff;font-size:14px;font-weight:600;text-align:right;border-top:1px solid rgba(255,255,255,0.06);">₦${newBalance.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:12px;padding:6px 0;">Reference</td>
          <td style="color:#9ca3af;font-size:12px;font-family:monospace;text-align:right;">${reference}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:12px;padding:6px 0;">Date</td>
          <td style="color:#9ca3af;font-size:12px;text-align:right;">${new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
      <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">
        Not you? Contact us at support@campusrun.online
      </p>
    `),
  };
}

function orderReceiptEmail(name: string, pickup: string, dropoff: string, total: number, deliveryId: string) {
  return {
    subject: `Order placed — ₦${total.toLocaleString()}`,
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">Order Placed! 🎉</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 20px;">Hi ${name}, your order is confirmed. A runner will pick it up shortly.</p>
      <table width="100%" style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;border-collapse:collapse;">
        <tr>
          <td style="color:#6b7280;font-size:12px;padding:5px 0;">Pickup</td>
          <td style="color:#fff;font-size:13px;font-weight:500;text-align:right;">${pickup}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:12px;padding:5px 0;border-top:1px solid rgba(255,255,255,0.06);">Dropoff</td>
          <td style="color:#fff;font-size:13px;font-weight:500;text-align:right;border-top:1px solid rgba(255,255,255,0.06);">${dropoff}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:12px;padding:5px 0;border-top:1px solid rgba(255,255,255,0.06);">Total paid</td>
          <td style="color:#34d399;font-size:15px;font-weight:700;text-align:right;border-top:1px solid rgba(255,255,255,0.06);">₦${total.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:12px;padding:5px 0;">Order ID</td>
          <td style="color:#9ca3af;font-size:11px;font-family:monospace;text-align:right;">${deliveryId.slice(0, 8)}</td>
        </tr>
      </table>
      <a href="https://campusrun-eqcenaour-campus-run.vercel.app/track/${deliveryId}" style="display:block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:14px;">
        Track My Order →
      </a>
    `),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

    const { type, to, data } = await req.json();

    let emailContent: { subject: string; html: string };

    if (type === 'welcome') {
      emailContent = welcomeEmail(data.name, data.referral_code || '');
    } else if (type === 'topup_receipt') {
      emailContent = topupReceiptEmail(data.name, data.amount, data.new_balance, data.reference);
    } else if (type === 'order_receipt') {
      emailContent = orderReceiptEmail(data.name, data.pickup, data.dropoff, data.total, data.delivery_id);
    } else {
      return new Response(JSON.stringify({ error: 'Unknown email type' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], ...emailContent }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result?.message || 'Resend API error');

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
