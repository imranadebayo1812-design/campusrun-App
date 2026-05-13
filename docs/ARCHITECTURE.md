# CampusRun — Architecture Overview

## Frontend Stack
- React 18
- Tailwind CSS (token-based design system)
- Framer Motion (animations)
- React Router DOM v6
- TanStack Query v5 (data fetching + caching)
- react-leaflet (maps)
- Paystack inline.js (payments)

## Backend Stack
- Base44 serverless Deno functions
- Base44 entity database (MongoDB-compatible)
- Base44 OAuth connectors (GitHub)
- Paystack (payment processing)

## Key Libraries
- `@base44/sdk` v0.8.25
- `lucide-react` (icons)
- `date-fns` (date formatting)
- `recharts` (admin charts)
- `framer-motion` (animations)

## Auth Flow
1. Base44 handles login/session
2. `AuthContext` checks public settings → user auth → school email restriction → blacklist check
3. Terms gate: user must accept T&C before any app access
4. Onboarding: course, campus status, hostel, phone number
5. Mode toggle: buyer ↔ courier stored in localStorage

## Data Flow: Order Creation
```
CreateDelivery (form) 
  → calculateDeliveryFee (client-side pricing)
  → Payment page
  → Paystack / Wallet payment
  → Delivery entity created
  → dispatchOrderToCouriers (backend function)
  → CourierNotification entities created
  → Couriers see notifications in real-time (polling)
```

## Polling Strategy (TanStack Query)
- Active orders: every 10-12s
- Completed/history: no polling (stale 5 min)
- Admin active orders: 25s during day, 2 min after closing
- Chat messages: 15s
- Wallet/fees: no polling (manual refresh)

## Mobile Shell
`MobileShell` component wraps all pages:
- Fixed header with logo + mode toggle
- Scrollable content area with pull-to-refresh
- Fixed bottom navigation bar
- Swipe gestures between tab routes
- Safe area insets for notched devices
- Slide animations between tab routes only
