# CampusRun — Known Issues & TODOs

## Active Issues

### Rate Limit on Terms Acceptance
- **Symptom**: Specific account stuck on “Saving…”, throws `Base44Error: Rate limit exceeded`
- **Cause**: `base44.auth.updateMe` has a platform-level rate limit. Rapid taps trigger it.
- **Fix Applied**: `useRef` lock in `TermsModal` prevents duplicate calls
- **Recovery**: Rate limit resets automatically after ~15–30 minutes
- **Cannot fix programmatically**: Base44 platform rate limits are not resettable via SDK

### Wallet Top-Up Not Webhook-Verified
- Paystack top-ups rely on the inline popup callback, not a server-side webhook
- Risk: callback could be spoofed in theory
- **TODO**: Implement Paystack webhook with signature verification (`stripe.webhooks.constructEventAsync` equivalent)

### Off-Campus Courier Flow Incomplete
- Gate fallback logic is implemented on the backend
- No dedicated onboarding for off-campus couriers
- Off-campus couriers can sign in with any email (no restriction enforced for couriers)

### Relay Phone Number Placeholder
- `DeliveryChat` “Call (masked)” button uses `+2349000000000` as placeholder
- Real masked calling requires a VOIP/relay service integration

### Subscription UI Disabled
- Campus Run Pro is fully implemented in backend logic
- UI shows “Coming Soon” — subscription purchase flow exists but is disabled
- **TODO**: Enable when ready to launch Pro tier

### Full Name Not Always Set
- Users who sign in without completing onboarding may have their student ID as `full_name`
- Example: `242050014` instead of a real name
- No enforcement of real name at signup

## Performance Optimizations Applied

- Admin portal loads only active + flagged orders during the day (not full history)
- TanStack Query `refetchInterval` disabled on static data (fees, subscriptions)
- Chat polling reduced to 15s (down from 5s)
- Courier order polling stops when no active orders
- Admin tab data loaded lazily (only when tab is active)

## Technical Debt

- `AdminPortal.jsx` is large (1300+ lines) — could be split into tab components
- `dispatchOrderToCouriers` duplicates campus zone data from `campusData.js` (self-contained by design for Deno)
- No WebSocket/SSE — all real-time is polling
- Service fee discount for Pro subscribers is checked client-side at order creation (not server-validated)

## Security TODOs

- Add server-side validation of Pro subscription at payment processing
- Implement Paystack webhook for top-up verification
- Add CAPTCHA or additional friction for accounts with high fraud scores
- Consider server-side rate limiting for `updateMe` beyond platform defaults
