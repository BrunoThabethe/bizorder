## Goal

Let businesses set delivery options per product from a fixed list of trusted couriers (with preset prices) or their own self-delivery rate. At checkout, customers pick one of the enabled options (pick up or delivary with the fixed price selected by the business) and the fee is added to the order total.

## Couriers & preset pricing (manual fulfilment — no API)

Stored as a hardcoded catalog in `src/lib/delivery/catalog.ts` so prices are easy to update later.

**Pep Paxi**

- Standard Bag (≤5kg): R59.95 (7–9 days) · R109.95 (3–5 days)
- Large Bag (≤10kg): R109.95 (7–9 days) · R139.95 (3–5 days)
- Store-to-Home (3–5 days): higher rate (configurable per product)

**Pudo**

- L Locker-to-Door: R157
- XL Locker-to-Door: R209
- XL Kiosk-to-Door: R250
- Door-to-Locker: R70–R100 (business sets exact amount)

**The Courier Guy**

- National Overnight: R130 (≤2kg) + R45/extra kg
- National Economy Road: R90 (0–5kg) · R150 (6–15kg) · R200 (16–25kg)
- Local Overnight: from R105
- Local Same-Day Express: from R755 (≤2kg)
- International: from R310 (business confirms before dispatch)

**Self-delivery** — business toggles on and sets a flat fee + service area description.

## Business portal — Product form (ServicesManagerPage)

New "Delivery options" section appears only when `kind === "product"`.

```text
Delivery options
[ Self-delivery toggle ]
   └ Flat fee: R___    Service area: ____________________

Trusted couriers (tap to enable, then pick size + speed)
[ Paxi ▾ ]    size: Standard / Large    speed: 7–9 days / 3–5 days   → auto-fills price (editable)
[ Pudo ▾ ]   variant: L L2D / XL L2D / XL K2D / D2L   → auto-fills price
[ Courier Guy ▾ ]   tier: Nat Overnight / Nat Economy / Local Overnight / Local Same-day / Intl   → auto-fills price (weight band picker for tiered options)
```

Each enabled option becomes a row `{ provider, label, price, eta }` saved on the product.

## Database

Single migration adds one JSONB column to `services`:

- `delivery_options jsonb not null default '[]'::jsonb` — array of `{ id, provider: 'paxi'|'pudo'|'courier_guy'|'self', label, price, eta, area? }`

Keep existing `delivery_available` boolean as a derived flag (true when array non-empty or self-delivery on).

Add to `orders`:

- `delivery_option jsonb` — the chosen `{ provider, label, price, eta }` snapshot at checkout.
- `delivery_fee` (already exists) is set from the chosen option.

Update `enforce_order_pricing` trigger so `total = service.price + COALESCE(delivery_fee, 0)` and `delivery_fee` must match one of the product's enabled options (or 0 for pickup).

## Customer portal — CreateOrderPage

Replace the current Pickup/Delivery toggle with:

1. **Pickup / in-store** (free) — unchanged.
2. **Delivery** — radio list of the product's enabled options, each showing provider logo, label, ETA, and price. Selecting one sets `delivery_fee` and updates the order summary total live.
3. Address required when any delivery option is chosen.

Order summary already shows a "Delivery" row — wire it to the chosen option's price.

## Files to change

- `src/lib/delivery/catalog.ts` *(new)* — courier catalog + helpers (`listProviders`, `priceFor`).
- `src/pages/business/ServicesManagerPage.tsx` — add Delivery options editor for products, save `delivery_options` JSONB.
- `src/lib/business/queries.ts` — extend `Service` type with `delivery_options`.
- `src/pages/customer/CreateOrderPage.tsx` — replace fulfilment block with option picker, compute total inc. delivery.
- `src/lib/customer/queries.ts` — include `delivery_option` and `delivery_fee` on order create.
- `src/pages/customer/OrderDetailPage.tsx`, `src/pages/business/BusinessOrderDetailPage.tsx` — display chosen courier + fee.
- Supabase migration — add `services.delivery_options`, `orders.delivery_option`, update `enforce_order_pricing`.

## Out of scope (can follow later)

- Live courier API quotes, waybill creation, tracking numbers.
- Weight-based auto-pricing for Courier Guy beyond the band picker (business enters the band that fits the product).