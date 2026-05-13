# CampusRun — Order Workflow

## Order Types

### Purchase Order
Buyer wants food/items bought and delivered.
- Buyer specifies item + food cost
- Courier buys items from their own money
- After delivery, courier gets reimbursed (food_cost) + earns delivery_fee

### Errand / Package Order
Buyer wants to send an existing package.
- Buyer declares package value (max ₦10,000)
- Optional package photo
- Courier delivers package, earns delivery_fee only

## Status Lifecycle

```
placed → bought → on_the_way → arrived → delivered
                                           ↑
                               Requires 4-digit code verification
         ↑
    cancelled (possible at any point before delivered)
```

## Dispatch Flow

```
1. Order created (status: placed, courier_accepted: false)
2. dispatchOrderToCouriers called:
   a. Phase 1: campus couriers only (if residential dropoff)
      - CourierNotification created for top N couriers
      - If 0 campus couriers → delivery.campus_courier_unavailable = true
   b. Phase 2 (if Phase 1 failed): all couriers
      - delivery.gate_fallback_active = true
      - CourierNotification has gate_only = true
   c. Standard (non-residential): all available couriers
3. Couriers see notifications via CourierNotificationBell
4. Courier accepts → courier_accepted: true, courier fields set
5. 2-minute grace period begins
```

## Cancellation Rules

| Stage | Buyer Cancel | Courier Cancel |
|-------|-------------|----------------|
| Before acceptance | ✅ Free | N/A |
| Grace period (0–2 min post-accept) | ✅ Free | ✅ Free |
| After grace period | ✅ With reason | ❌ Not allowed |
| After bought | Requires admin | ❌ Not allowed |

## Price Edit Flow

1. Courier at vendor sees different price
2. Taps 'Edit per item' → ItemPriceEditor component
3. Edits submitted → PriceEditLog created for each changed item
4. Delivery flagged (locks delivery_fee + tip)
5. Buyer sees BuyerPriceUpdateAlert on tracking screen
6. Buyer accepts → order continues, admin reviews
7. Buyer rejects → order cancelled or proceeds at original price
8. Admin approves → menu price updated, flag released
9. Admin rejects → flag released, no extra payment

## Delivery Code Verification

1. `delivery_code` (4-digit) generated at payment
2. Shown on buyer's tracking screen
3. Courier enters code when arrived to confirm handoff
4. Code must match to mark as delivered
5. Uses `DeliveryCodeVerify` component

## Post-Delivery Actions

- Buyer can add a tip (triggers Paystack payment)
- Buyer can leave a star rating + comment (DeliveryFeedback)
- Courier earnings become withdrawable immediately (unless flagged)
