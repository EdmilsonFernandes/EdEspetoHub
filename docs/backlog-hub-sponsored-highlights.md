# Backlog: Hub Sponsored Highlights (Paid Placement)

## Context
Store products can already be featured in the store catalog.  
New rule: **featured placement in Hub must be paid**.

## Business Rules (Saved)
1. Hub highlight is paid; in-store highlight remains unchanged.
2. Reuse existing Mercado Pago integration (same platform payment flow used for store creation/subscription).
3. Global configurable pricing (platform-level):
   - daily price
   - weekly price
   - monthly price
4. Store flow:
   - when merchant chooses “highlight in Hub”, open a modal/popup
   - merchant selects duration (day/week/month)
   - system creates paid campaign request
5. Slot policy:
   - allow up to **3 active sponsored products** in Hub at a time (to avoid single-store dominance).
6. Fallback behavior:
   - if there are no active sponsored campaigns, Hub uses current default random/organic featured logic.

## Required Platform Config (Global)
- Add global settings (DB + super admin UI):
  - `hub_sponsored_daily_price`
  - `hub_sponsored_weekly_price`
  - `hub_sponsored_monthly_price`
  - `hub_sponsored_max_active_slots` (default: 3)

## Suggested Next Implementation Phases
1. **Config layer**
   - DB migration for global pricing + max slots
   - super admin screen to edit values
2. **Checkout/payment layer**
   - generate payment for sponsored campaign via Mercado Pago
   - campaign only activates when payment is confirmed
3. **Campaign scheduler/rules**
   - enforce max active slots
   - queue pending paid campaigns if slots are full
4. **Hub rendering**
   - show active paid campaigns first
   - fallback to random/organic when none active

## Acceptance Criteria (Future)
- Merchant can buy Hub highlight via popup with selected duration.
- Payment uses existing Mercado Pago infrastructure.
- Campaign activates only after confirmed payment.
- No more than 3 active sponsored products at the same time.
- If 0 sponsored active, Hub still shows default random/organic featured products.

