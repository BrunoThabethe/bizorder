## Overview

You've requested ~10 distinct changes across customer ordering, provider availability, pricing/delivery, booking calendar, marketing site, and order workflow UX. I'll group them into 6 work blocks and ship them in order. Each block ends in a working state so you can test as we go.

---

## Block 1 — Customer order: reference photo + simpler workflow

- Add a single optional **reference photo** upload on the Create Order page (next to Notes). Stored in `order-media` bucket under `orders/{orderId}/reference.jpg`. Visible to provider on the order detail page.
- Validation: 1 photo max, JPG/PNG/WebP, ≤ 5 MB.

## Block 2 — Provider availability gates the "Place Order" button

- On the customer business profile + create-order page:
  - If `business_settings.availability` ≠ `available` AND the order is for a **service** scheduled "as soon as possible" → "Place order" is disabled with a tooltip ("Provider is {status} — pick a future date or order a product").
  - **Products** are always orderable.
  - Services are orderable if the customer picks a future date/time.

## Block 3 — Pricing model: in-store vs delivery (per-km)

- Schema additions:
  - `services`: `delivery_available boolean`, `delivery_price_per_km numeric`, `pickup_price numeric` (renames meaning of existing `price` to "in-store/pickup price").
  - `orders`: `fulfillment_type text` ('pickup' | 'delivery'), `delivery_distance_km numeric`, `delivery_fee numeric`.
- Provider service editor: new fields for delivery toggle + per-km price.
- Customer create-order: radio for Pickup vs Delivery. If Delivery: input distance (km) → auto-calculates `delivery_fee = per_km * km`, total updates live.
- Order summary + provider order detail show breakdown.

> Note: real address-based km calculation needs a maps API. For now we'll use a customer-entered km value (with a clear note). I can wire Google/Mapbox later if you want.

## Block 4 — Booking calendar (provider availability + clash prevention)

- New table `provider_availability_slots` (per-day weekly schedule: day_of_week, start, end) — provider sets working hours per weekday.
- `orders.scheduled_for` + `services.duration_minutes` define a busy interval.
- New RPC `is_slot_available(business_id, start, end)` checks for overlap with accepted/in-progress orders.
- Customer date/time picker calls the RPC; unavailable times shown disabled. Server-side guard rejects creation if clash.
- Provider page: **Availability schedule** under Business Settings.

## Block 5 — Cancel/reject reason mandatory + visible

- Reject/cancel actions on provider side require a reason (min 10 chars) — already partly there for `rejected_reason`. Enforce in UI + DB.
- Surface the reason on:
  - Customer order detail (red banner "Provider cancelled — Reason: …")
  - Admin order detail (same)
  - `order_events` entry already created.

## Block 6 — Provider order workflow buttons (single-action stage stepper)

- Replace "Move to In progress" / multi-prompt buttons with a clean 4-stage stepper: **Accepted → In progress → Ready for review → Completed**.
- Each stage shows one button labelled with the **next** stage name. Once clicked, that stage is locked (greyed) and the next button appears. No back/forward.
- Same component used in OrdersQueuePage and BusinessOrderDetailPage.

## Block 7 — Marketing site cleanup + How-it-works rewrite

- Remove **Pricing** page + nav link + footer link + any CTAs pointing to `/pricing`. Routes redirect `/pricing` → `/`.
- Nav becomes: How it works · For businesses · For customers · Contact · Login/Signup.
- Rewrite `HowItWorksPage.tsx` flows (business + customer) to match the actual portal screens (mention reference photo, fulfillment choice, stage stepper, availability, etc.).

---

## Technical summary

**DB migrations (one combined):**
- `services`: + `delivery_available`, `delivery_price_per_km`, `pickup_price` (default = current price).
- `orders`: + `fulfillment_type`, `delivery_distance_km`, `delivery_fee`, + reference_image_url.
- New `provider_availability_slots` table with RLS (owner manages, public reads when business is published).
- RPC `is_slot_available(_business_id uuid, _start timestamptz, _end timestamptz) returns boolean`.
- RLS additions for the new table; storage policy for `order-media/orders/{orderId}/reference.*` (customer of that order can write, provider/admin can read).

**Frontend files touched:**
- `src/pages/customer/CreateOrderPage.tsx` (ref photo, fulfillment, gating, slot check)
- `src/pages/customer/BusinessProfilePage.tsx` (gating "Order now" button)
- `src/pages/business/ServicesManagerPage.tsx` (delivery pricing fields)
- `src/pages/business/BusinessSettingsPage.tsx` (availability schedule editor)
- `src/pages/business/OrdersQueuePage.tsx` + `BusinessOrderDetailPage.tsx` (stage stepper, mandatory reject reason)
- `src/pages/customer/OrderDetailPage.tsx` + `src/pages/admin/AdminOrderDetailPage.tsx` (reason banner, fulfillment + reference photo display)
- `src/components/Navbar.tsx`, `src/components/sections/Footer.tsx`, `src/App.tsx` (remove pricing route + links)
- `src/pages/HowItWorksPage.tsx` (rewrite flows)
- New `src/components/orders/StageStepper.tsx`, `src/components/business/AvailabilityScheduleEditor.tsx`.
- Delete `src/pages/PricingPage.tsx` and `src/components/sections/PricingSlider.tsx`.

---

## Order of execution

I'll go: **Block 7 (quick UI cleanup)** → **Block 6 (workflow buttons)** → **Block 5 (reject reason)** → **Block 1 (reference photo)** → **Block 2 (availability gating)** → **Block 3 (delivery pricing)** → **Block 4 (booking calendar)**.

Approve and I'll start with the database migration covering Blocks 1, 3, 4 plus the storage policy, then move through the frontend blocks.
