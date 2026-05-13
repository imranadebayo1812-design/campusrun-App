# CampusRun — Security & Fraud Prevention

## Access Control

### Email Restriction
Only `@nileuniversity.edu.ng` emails can register.
Admins are exempt (gmail whitelist).
Enforced in `AuthContext.checkUserAuth()`.

### Blacklist
Admins block users via `BlacklistedUser` entity.
Blacklisted users are force-logged out at auth check.

### Admin Whitelist
Hardcoded in multiple files:
```javascript
const ADMIN_EMAILS = ['imranadebayo1812@gmail.com', 'okekejohnk8012@gmail.com'];
```

## Device Fingerprinting

`generateFingerprint()` in `lib/security.js`:
- Hashes: userAgent + language + platform + screen + timezone + hardware
- Appends persistent `localStorage` install ID
- Returns `{8-hex}-{8-alphanum}` string
- Used for: referral abuse detection, multi-account detection

## Fraud Score System

Each account has a `FraudScore` record updated by `securityEvent` backend function.

### Score Weights
| Trigger | Points |
|---------|--------|
| Multiple accounts on same device | +25 |
| Referral abuse | +20 |
| Rapid account switch | +15 |
| Excessive price edits | +15 |
| Excessive cancellations | +10 |
| Suspicious login | +10 |
| High-risk event | +10 |
| Failed withdrawal | +5 |

### Thresholds
- Score ≥ 50 → `flagged: true`
- Score ≥ 70 → `withdrawals_paused: true`
- Score capped at 200

## Client-Side Rate Limiting

LocalStorage-based (`lib/security.js`), used as UX guard only:

| Action | Limit |
|--------|-------|
| Login | 5 per 10 min |
| Withdrawal | 3 per day |
| Order create | 10 per hour |
| Price edit | 5 per hour |
| Referral | 3 per day |
| Chat message | 20 per minute |

## Security Log

All significant events are logged to `SecurityLog`:
- login, signup, withdrawal_request, referral_used
- price_edit, order_cancelled, admin_access
- suspicious_activity, account_switch, multiple_accounts_device

## Terms Acceptance

- Version: `'v1'`
- Stored as `terms_accepted` on User record
- Gate in `App.jsx` before any page access
- `TermsModal` uses `useRef` lock to prevent duplicate API calls
- Rate limit reset: 15–30 minutes (platform-level, cannot be manually cleared)

## Anti-Referral-Abuse

1. Self-referral blocked
2. One referral per user (`referred_email` unique check)
3. Device fingerprint reuse → flagged referral + high-risk SecurityLog
4. Admin can manually flag/reject referrals
5. Platform milestone: pause new referral withdrawals at 1,000 valid referrals
