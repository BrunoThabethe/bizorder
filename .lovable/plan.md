## Goal

Give providers a dedicated **Availability** page to manage working hours, and make the customer booking flow only accept dates/times that fall inside those hours AND are not already booked.

## Provider portal — new Availability page

Add `/business/availability` route + sidebar entry ("Availability", Clock icon) in `BusinessLayout`.

Page `src/pages/business/BusinessAvailabilityPage.tsx`:
- Status card (reuses `business_settings`): availability dropdown (Available / Busy / Away / Closed) + optional "Back on" date when Away.
- **Weekly working hours** editor: per-day toggle (open/closed) with one or more `opens_at`–`closes_at` ranges. Same shape currently embedded in `BusinessSettingsPage` — move that block here so settings page focuses on profile only.
- **Upcoming bookings preview**: read-only list of next 7 days of accepted/in-progress orders with `scheduled_for`, so the provider can see what's already taken.
- Save uses existing `upsertBusinessSettings` + `replaceBusinessHours` helpers.

Remove the duplicate Weekly availability block from `BusinessSettingsPage.tsx` and link to the new page.

## Customer booking — respect hours and free slots

In `src/pages/customer/CreateOrderPage.tsx`:

1. Fetch provider's `business_hours` (already exposed via RLS to authenticated users for published businesses).
2. Fetch the provider's upcoming `orders` rows for the selected date (status not in cancelled/completed) with `scheduled_for` and joined service `duration_minutes`.
3. Replace the free-form `datetime-local` input with:
   - A **date picker** (shadcn Calendar in a Popover) — disable days where `business_hours.is_open = false` for that weekday, days fully booked, and days before today / after Away-until.
   - A **time slot grid** generated from the day's open ranges, stepped by the selected service `duration_minutes` (default 60 min). Each candidate slot is filtered out if it overlaps an existing order (same logic as `is_slot_available`).
   - Show "No slots available — try another day" when empty.
4. Keep server-side `is_slot_available` RPC check on submit as the final guard.
5. Update the availability/away gating message to reference the new picker.

## Technical notes

- New file: `src/pages/business/BusinessAvailabilityPage.tsx`. Route added in `src/App.tsx` under `RoleGuard allow={["business"]}`.
- Reuse existing helpers in `src/lib/business/queries.ts` (`fetchBusinessSettings`, `upsertBusinessSettings`, `fetchBusinessHours`, `replaceBusinessHours`). Add `fetchBusinessUpcomingOrders(businessId, fromIso, toIso)` returning `{ scheduled_for, services: { duration_minutes } }[]` (RLS already allows owners to read their own orders; for the customer-side overlap check we'll rely on the existing `is_slot_available` RPC — we don't need to read other customers' orders client-side).
- Customer slot rendering computes available slots purely from `business_hours` ranges + provider's own published "busy" set. Because customers cannot read others' orders due to RLS, the slot grid will instead call `is_slot_available` lazily as the user picks a slot (slot button shows loading → disabled if not free), OR we expose a SECURITY DEFINER RPC `list_free_slots(_business_id, _date, _duration_minutes)` that returns the list of free start times for that date. **Recommended:** add this RPC so the grid renders only truly-free slots in one round trip.
- Migration: add `public.list_free_slots(_business_id uuid, _date date, _duration_minutes int)` returning `setof timestamptz`. It iterates open ranges for that weekday and excludes any slot whose `[start, start+duration)` overlaps an existing non-cancelled/non-completed order (mirroring `is_slot_available`).
- Honour `business_settings.availability` ("busy"/"closed" → no slots) and `away_until` (no slots before that date).
- Keep date format DD/MM/YYYY in the UI per project conventions.

## Files touched

- `supabase/migrations/<new>.sql` — `list_free_slots` RPC.
- `src/App.tsx` — new route.
- `src/components/business/BusinessLayout.tsx` — sidebar item.
- `src/pages/business/BusinessAvailabilityPage.tsx` — new page.
- `src/pages/business/BusinessSettingsPage.tsx` — remove weekly availability block, add link to new page.
- `src/lib/business/queries.ts` — add `listFreeSlots` helper.
- `src/pages/customer/CreateOrderPage.tsx` — new date + slot picker UI.
