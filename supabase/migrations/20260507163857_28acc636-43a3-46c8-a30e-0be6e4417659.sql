
-- Block 1: Reference photo on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reference_image_url text;

-- Block 3: Pricing model — pickup vs delivery
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS delivery_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_price_per_km numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_distance_km numeric,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

-- Soft constraint via check (immutable)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_fulfillment_type_check CHECK (fulfillment_type IN ('pickup','delivery'));

-- Block 4: Provider availability schedule (per-day weekly, distinct from business_hours)
-- Reuse existing business_hours rows for the schedule; add helper RPC for slot clash checks.

CREATE OR REPLACE FUNCTION public.is_slot_available(_business_id uuid, _start timestamptz, _end timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.orders o
    LEFT JOIN public.services s ON s.id = o.service_id
    WHERE o.business_id = _business_id
      AND o.status NOT IN ('cancelled','completed')
      AND o.scheduled_for IS NOT NULL
      AND tstzrange(
            o.scheduled_for,
            o.scheduled_for + (COALESCE(s.duration_minutes, 60) || ' minutes')::interval,
            '[)'
          )
          && tstzrange(_start, _end, '[)')
  );
$$;

-- Storage policy for reference photo upload by customer (order-media bucket).
-- Customers can insert one file at orders/{orderId}/reference-* if they own the order.
DROP POLICY IF EXISTS "Customer uploads order reference photo" ON storage.objects;
CREATE POLICY "Customer uploads order reference photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.orders WHERE customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Order parties read order media" ON storage.objects;
CREATE POLICY "Order parties read order media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-media'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id::text = (storage.foldername(name))[1]
      AND (o.customer_id = auth.uid() OR b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);
