import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── THEME DEFINITIONS ─────────────────────────────────────────────────────────

const IVORY = {
  name: 'Ivory & Ink',
  bg:        '#000000',
  card:      '#0f0f0f',
  card2:     '#181818',
  border:    'rgba(255,255,255,0.08)',
  border2:   'rgba(255,255,255,0.14)',
  brand:     '#ffffff',
  brandText: '#000000',
  text:      '#ffffff',
  textSub:   '#9ca3af',
  textMuted: '#4b5563',
  pill:      'rgba(255,255,255,0.06)',
  glow:      '0 0 32px rgba(255,255,255,0.08)',
  btnGrad:   'linear-gradient(135deg,#ffffff,#d1d5db)',
  activeDot: '#ffffff',
  badge:     { bg: 'rgba(255,255,255,0.1)', text: '#ffffff' },
  status:    { bg: 'rgba(255,255,255,0.08)', text: '#e5e7eb' },
  nav:       '#0a0a0a',
};

const NOIR = {
  name: 'Noir & Flame',
  bg:        '#080808',
  card:      '#111111',
  card2:     '#1a1a1a',
  border:    'rgba(255,255,255,0.06)',
  border2:   'rgba(220,38,38,0.3)',
  brand:     '#dc2626',
  brandText: '#ffffff',
  text:      '#ffffff',
  textSub:   '#9ca3af',
  textMuted: '#4b5563',
  pill:      'rgba(255,255,255,0.04)',
  glow:      '0 0 32px rgba(220,38,38,0.15)',
  btnGrad:   'linear-gradient(135deg,#dc2626,#991b1b)',
  activeDot: '#dc2626',
  badge:     { bg: 'rgba(220,38,38,0.15)', text: '#f87171' },
  status:    { bg: 'rgba(220,38,38,0.1)', text: '#fca5a5' },
  nav:       '#0a0a0a',
};

// ── MOCK PHONE ────────────────────────────────────────────────────────────────

function Phone({ t }) {
  const [activeNav, setActiveNav] = useState('home');

  const vendors = [
    { name: "B's Chops", tag: 'Fast Food', time: '~12 min', emoji: '🍗' },
    { name: 'JAJ Plate',  tag: 'Local',    time: '~8 min',  emoji: '🍛' },
    { name: 'Food Court', tag: 'Variety',  time: '~5 min',  emoji: '🥗' },
    { name: 'Turkish',    tag: 'Grill',    time: '~15 min', emoji: '🥙' },
  ];

  const orders = [
    { loc: "B's Chops", dest: 'Zambezi — Room 14', amount: '₦3,400', status: 'On the Way', dot: t.activeDot },
    { loc: 'JAJ Plate',  dest: 'Blue Nile — Room 8', amount: '₦2,100', status: 'Waiting',    dot: t.textMuted },
  ];

  return (
    <div style={{
      width: 320,
      height: 640,
      borderRadius: 36,
      background: t.bg,
      border: `2px solid ${t.border2}`,
      boxShadow: t.glow + ', 0 24px 60px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      flexShrink: 0,
    }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', background: t.card, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: t.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: t.brandText }}>CR</span>
          </div>
          <span style={{ color: t.text, fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>CampusRun</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: t.card2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '2px 2px' }}>
          <div style={{ padding: '4px 10px', borderRadius: 16, background: t.brand, fontSize: 10, fontWeight: 700, color: t.brandText }}>Buyer</div>
          <div style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, color: t.textMuted }}>Courier</div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', background: t.bg, scrollbarWidth: 'none' }}>

        {/* Hero greeting */}
        <div style={{ padding: '20px 16px 12px' }}>
          <p style={{ color: t.textSub, fontSize: 12, marginBottom: 2 }}>Good afternoon 👋</p>
          <p style={{ color: t.text, fontSize: 19, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2 }}>What are you<br/>ordering today?</p>
        </div>

        {/* Wallet card */}
        <div style={{ margin: '0 16px 16px', padding: '14px 16px', background: t.brand, borderRadius: 18, boxShadow: t.glow }}>
          <p style={{ color: t.brandText, fontSize: 10, fontWeight: 600, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Wallet Balance</p>
          <p style={{ color: t.brandText, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>₦4,700</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: t.brandText, fontSize: 10, opacity: 0.6 }}>Tap to top up</span>
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: t.brandText }}>Top Up →</div>
          </div>
        </div>

        {/* Section label */}
        <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: t.text, fontSize: 13, fontWeight: 700 }}>Vendors</p>
          <span style={{ color: t.textMuted, fontSize: 11 }}>See all</span>
        </div>

        {/* Vendor grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
          {vendors.map((v, i) => (
            <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '12px 12px 10px', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: t.card2, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>{v.emoji}</div>
              <p style={{ color: t.text, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{v.name}</p>
              <p style={{ color: t.textMuted, fontSize: 10 }}>{v.tag}</p>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.activeDot }} />
                <span style={{ color: t.textSub, fontSize: 10 }}>{v.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Active orders */}
        <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: t.text, fontSize: 13, fontWeight: 700 }}>Active Orders</p>
          <div style={{ background: t.badge.bg, borderRadius: 8, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: t.badge.text }}>2</div>
        </div>
        <div style={{ padding: '6px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map((o, i) => (
            <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: t.text, fontSize: 12, fontWeight: 700 }}>{o.loc}</p>
                <p style={{ color: t.textMuted, fontSize: 10, marginTop: 1 }}>→ {o.dest}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: o.dot }} />
                  <span style={{ color: t.textSub, fontSize: 10 }}>{o.status}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: t.text, fontSize: 13, fontWeight: 800 }}>{o.amount}</p>
                <p style={{ color: t.textMuted, fontSize: 10, marginTop: 2 }}>Track →</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <div style={{ background: t.nav, borderTop: `1px solid ${t.border}`, padding: '8px 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {[
          { key: 'home',   label: 'Home',    icon: '⌂' },
          { key: 'orders', label: 'Orders',  icon: '📦' },
          { key: 'new',    label: '',         icon: '+', fab: true },
          { key: 'wallet', label: 'Wallet',  icon: '₦' },
          { key: 'profile',label: 'Profile', icon: '◎' },
        ].map(item => (
          <button key={item.key} onClick={() => setActiveNav(item.key)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 0 }}>
            {item.fab ? (
              <div style={{ width: 44, height: 44, borderRadius: 14, background: t.btnGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: t.brandText, fontWeight: 300, boxShadow: t.glow, marginBottom: 14 }}>+</div>
            ) : (
              <>
                <span style={{ fontSize: 16, opacity: activeNav === item.key ? 1 : 0.35, filter: activeNav === item.key ? 'none' : 'grayscale(1)', color: activeNav === item.key ? t.brand : t.textMuted }}>{item.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: activeNav === item.key ? t.brand : t.textMuted, opacity: activeNav === item.key ? 1 : 0.5 }}>{item.label}</span>
                {activeNav === item.key && <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.brand, marginTop: 1 }} />}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function ThemePreviewPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px 20px 60px' }}>

      <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: 10, padding: '6px 14px', fontSize: 12, cursor: 'pointer', marginBottom: 28 }}>
        ← Back
      </button>

      <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Theme Preview</p>
      <h1 style={{ color: '#ffffff', fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>Pick Your Style</h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 36 }}>Tap the nav items inside each phone to interact.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
        {[IVORY, NOIR].map((t, i) => (
          <div key={i}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: '#ffffff', fontSize: 16, fontWeight: 800 }}>{String.fromCharCode(65 + i)}. {t.name}</p>
              <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>
                {t === IVORY ? 'Pure monochrome — white as the only accent. Luxury editorial feel.' : 'Black & white base with crimson red as the single creative pop.'}
              </p>
            </div>
            <Phone t={t} />
          </div>
        ))}
      </div>

    </div>
  );
}
