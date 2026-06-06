## Goal

Remove the "price per km" delivery feature. Businesses just say whether they offer delivery; they tell their customer the delivery cost directly and the customer pays everything in one go (no automatic distance × rate calculation in the order flow).

## Changes

### 1. Business → Services & Products (`src/pages/business/ServicesManagerPage.tsx`)
- Keep the "Offer delivery" toggle.
- Remove the "Delivery price per km (ZAR)" input and its state (`deliveryPerKm`).
- Update the helper copy under the toggle to: "You'll arrange the delivery fee directly with the customer."
- Stop writing `delivery_price_per_km` on insert (send `0` so existing column stays satisfied).

### 2. Customer → Create Order (`src/pages/customer/CreateOrderPage.tsx`)
- Keep the Pickup / Delivery selector and delivery-address picker.
- Remove the per-km fee math: drop `perKm`, `deliveryFee`, the distance auto-calculation effect, the `compute-distance` edge-function call, and the related `distanceKm` / `distanceLoading` / `distanceError` state.
- `total` becomes just the item price.
- Replace the "X km · R Y per km" line and the Delivery card's "R X / km" subtitle with: "Delivery cost will be confirmed by the provider."

### 3. How It Works (`src/pages/HowItWorksPage.tsx`)
- Update the onboarding step copy from "Toggle 'Enable delivery' and set your price per km if you offer delivery." to "Toggle 'Enable delivery' if you offer delivery — you'll arrange the fee directly with the customer."

### 4. Database
- Leave the `services.delivery_available` and `services.delivery_price_per_km` columns in place for now (no migration). The per-km column simply stops being read or written. This keeps existing rows untouched and lets us reintroduce the feature later without a schema change.

## Out of scope
- No changes to the `compute-distance` edge function file itself (it just stops being called from the order page).
- No changes to checkout/payment flow beyond removing the delivery fee from the displayed total.
