## Goal

Give providers a clear visual calendar of booked vs free slots, and let crew capacity drive how many simultaneous bookings a slot can accept. When all crew are taken, that slot disappears for customers and the provider is shown as Busy.

## 1. Capacity model

A slot is "free" only if `active crew count` (or 1 if no crew) > concurrent bookings overlapping it.

Update `public.is_slot_available(_business_id, _start, _end)` to:

```text
capacity = COALESCE((SELECT COUNT(*) FROM crew_members
                     WHERE business_id = _business_id AND is_active = true), 0)
capacity = GREATEST(capacity, 1)   -- solo provider counts as 1
overlapping = COUNT(orders) where order.status NOT IN (cancelled, completed)
              AND scheduled_for range overlaps [_start, _end)
RETURN overlapping < capacity
```

`list_free_slots` already calls `is_slot_available`, so it inherits the new rule automatically.

Add small helper `public.business_capacity(_business_id uuid) RETURNS int` so both the RPC and the UI can read the same number.

## 2. Provider Availability page — calendar + clock view

Extend `BusinessAvailabilityPage.tsx` with a new "Schedule" card above the weekly hours editor:

- **Month calendar** (shadcn `Calendar`, single select). Day cells show a small indicator:
  - grey dot = closed
  - amber dot = partially booked
  - red dot = fully booked (all crew taken for every slot)
- **Day clock view** (right side, or below on mobile): vertical list of every slot generated from that day's open ranges stepped by 60 min, showing `HH:mm – HH:mm · X/Y booked` with a coloured pill (green = free, amber = some crew taken, red = full).
- Live status badge updates: if today's current hour is full → show "Busy" badge; if availability is manually set, that wins.

New helpers in `src/lib/business/queries.ts`:
- `fetchBusinessSlotsForDay(businessId, date)` → returns array of `{ start, end, capacity, booked }` (single round trip — new RPC `list_day_slots`).

New RPC `public.list_day_slots(_business_id uuid, _date date, _duration_minutes int default 60)` returns `setof (slot_start timestamptz, slot_end timestamptz, capacity int, booked int)`. Same loop as `list_free_slots` but returns counts instead of filtering.

## 3. Customer booking — automatic capacity respect

`CreateOrderPage.tsx` already calls `list_free_slots`. With the capacity-aware `is_slot_available`, fully booked slots will drop out automatically — no UI change needed beyond what's already there.

Add a subtle "X of Y open" label under each slot button by switching the customer fetch from `list_free_slots` to `list_day_slots` and filtering `booked < capacity` client-side, so the customer sees realistic remaining capacity per slot.

## 4. Auto-Busy status

Add an effective availability indicator on the customer-facing business profile:

- Compute on the client when rendering the provider card: if `availability = 'available'` AND **today** has zero free slots for the rest of the day at the smallest service duration, show "Busy today" badge (existing manual `busy`/`away`/`closed` still wins).

No DB write — purely derived so it stays accurate without cron.

## 5. Files touched

- `supabase/migrations/<new>.sql` — replace `is_slot_available`, add `business_capacity`, add `list_day_slots`.
- `src/lib/business/queries.ts` — `fetchBusinessSlotsForDay` + types.
- `src/pages/business/BusinessAvailabilityPage.tsx` — new calendar + clock card, day indicators.
- `src/pages/customer/CreateOrderPage.tsx` — swap to `list_day_slots`, show "X of Y open".
- `src/pages/customer/BusinessProfilePage.tsx` — derived "Busy today" badge.

## Technical notes

- All RPCs `SECURITY DEFINER`, `STABLE`, `search_path = public`.
- Capacity is read fresh on each call; no caching needed.
- Day indicator colours use existing semantic tokens (`bg-emerald-500`, `bg-amber-500`, `bg-destructive`) via Tailwind — no new tokens.
- Date format stays DD/MM/YYYY; times in 24h `HH:mm`.
