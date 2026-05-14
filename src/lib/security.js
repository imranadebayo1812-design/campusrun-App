/**
 * CampusRun — Lightweight Security Utilities
 * Device fingerprinting, rate limiting, security event logging.
 * See docs/SECURITY.md for full documentation.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function generateFingerprint() {
  try {
    const parts = [
      navigator.userAgent, navigator.language, navigator.platform || '',
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || '', navigator.deviceMemory || '',
    ];
    const raw = parts.join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    let installId = '';
    try {
      installId = localStorage.getItem('cr_iid');
      if (!installId) { installId = Math.random().toString(36).slice(2, 10); localStorage.setItem('cr_iid', installId); }
    } catch {}
    return `${hex}-${installId}`;
  } catch { return 'unknown'; }
}

export function getDeviceInfo() {
  try {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    let os = isIOS ? 'iOS' : isAndroid ? 'Android' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : 'Linux';
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    const browser = browserMatch ? browserMatch[0] : 'Unknown';
    return `${os} · ${isMobile ? 'Mobile' : 'Desktop'} · ${browser} · ${screen.width}x${screen.height}`;
  } catch { return 'Unknown device'; }
}

const RATE_LIMITS = {
  login:        { max: 5,  windowMs: 10 * 60 * 1000 },
  withdrawal:   { max: 3,  windowMs: 24 * 60 * 60 * 1000 },
  order_create: { max: 10, windowMs: 60 * 60 * 1000 },
  price_edit:   { max: 5,  windowMs: 60 * 60 * 1000 },
  referral:     { max: 3,  windowMs: 24 * 60 * 60 * 1000 },
  chat_message: { max: 20, windowMs: 60 * 1000 },
};

export function checkRateLimit(action) {
  try {
    const rule = RATE_LIMITS[action];
    if (!rule) return { allowed: true };
    const key = `cr_rl_${action}`;
    const now = Date.now();
    let history = JSON.parse(localStorage.getItem(key) || '[]');
    history = history.filter(ts => now - ts < rule.windowMs);
    if (history.length >= rule.max) {
      const retryMins = Math.ceil((rule.windowMs - (now - history[0])) / 60000);
      return { allowed: false, reason: `Too many ${action} attempts. Try again in ${retryMins} minute${retryMins !== 1 ? 's' : ''}.` };
    }
    history.push(now);
    localStorage.setItem(key, JSON.stringify(history));
    return { allowed: true };
  } catch { return { allowed: true }; }
}

export function logSecurityEvent({ userId, action, details = '', risk_level = 'low' }) {
  try {
    fetch(`${BACKEND_URL}/api/security/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        details,
        risk_level,
        device_fingerprint: generateFingerprint(),
        device_info: getDeviceInfo(),
      }),
    }).catch(() => {});
  } catch {}
}