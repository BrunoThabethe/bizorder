-- 1. Extend order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready_for_review';

-- 2. Customer confirms completion -> mark completed + auto payout
CREATE OR REPLACE FUNCTION public.customer_confirm_completion(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the customer can confirm completion';
  END IF;
  IF _order.status NOT IN ('ready_for_review', 'out_for_delivery', 'ready') THEN
    RAISE EXCEPTION 'Order is not awaiting customer confirmation';
  END IF;

  UPDATE public.orders
  SET status = 'completed', updated_at = now()
  WHERE id = _order_id;

  INSERT INTO public.order_events (order_id, actor_id, type, message)
  VALUES (_order_id, auth.uid(), 'customer_confirmed', 'Customer confirmed completion');

  -- Create a pending payout for the provider if none exists for this order
  IF NOT EXISTS (SELECT 1 FROM public.payouts WHERE order_id = _order_id) THEN
    INSERT INTO public.payouts (business_id, order_id, amount, currency, status)
    VALUES (_order.business_id, _order_id, _order.total, _order.currency, 'pending');
  END IF;

  -- Notify provider owner
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT b.owner_id, 'order_completed', 'Order confirmed by customer', 'Payout queued for release.',
         '/business/orders/' || _order_id
  FROM public.businesses b WHERE b.id = _order.business_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_confirm_completion(uuid) TO authenticated;

-- 3. Open a dispute (customer or provider)
CREATE OR REPLACE FUNCTION public.open_dispute(_order_id uuid, _reason text, _details text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders%ROWTYPE;
  _is_party boolean := false;
  _new_id uuid;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 3 OR length(_reason) > 200 THEN
    RAISE EXCEPTION 'Reason must be 3-200 characters';
  END IF;
  IF _details IS NOT NULL AND length(_details) > 2000 THEN
    RAISE EXCEPTION 'Details too long';
  END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF _order.customer_id = auth.uid() THEN
    _is_party := true;
  ELSIF public.is_business_owner(auth.uid(), _order.business_id) THEN
    _is_party := true;
  END IF;
  IF NOT _is_party THEN RAISE EXCEPTION 'Not allowed'; END IF;

  -- Avoid duplicate open disputes per order
  IF EXISTS (SELECT 1 FROM public.disputes WHERE order_id = _order_id AND status = 'open') THEN
    RAISE EXCEPTION 'A dispute is already open for this order';
  END IF;

  INSERT INTO public.disputes (order_id, business_id, customer_id, opened_by, reason, details, status)
  VALUES (_order_id, _order.business_id, _order.customer_id, auth.uid(), _reason, _details, 'open')
  RETURNING id INTO _new_id;

  INSERT INTO public.order_events (order_id, actor_id, type, message)
  VALUES (_order_id, auth.uid(), 'dispute_opened', _reason);

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_dispute(uuid, text, text) TO authenticated;

-- 4. Make order-media bucket private + lock down policies
UPDATE storage.buckets SET public = false WHERE id = 'order-media';

-- Drop any pre-existing permissive policies on order-media before re-adding
DROP POLICY IF EXISTS "order-media public read" ON storage.objects;
DROP POLICY IF EXISTS "order-media authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "order-media party read" ON storage.objects;
DROP POLICY IF EXISTS "order-media party write" ON storage.objects;
DROP POLICY IF EXISTS "order-media party delete" ON storage.objects;

-- Path convention: order-media/<order_id>/<filename>
-- Read: any party of that order, or admin
CREATE POLICY "order-media party read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-media'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id::text = (storage.foldername(name))[1]
      AND (
        o.customer_id = auth.uid()
        OR b.owner_id = auth.uid()
        OR public.is_crew_of_business(auth.uid(), o.business_id)
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

-- Write: same parties (admin not needed for upload)
CREATE POLICY "order-media party write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-media'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id::text = (storage.foldername(name))[1]
      AND (
        o.customer_id = auth.uid()
        OR b.owner_id = auth.uid()
        OR public.is_crew_of_business(auth.uid(), o.business_id)
      )
  )
);

-- Delete: only the owner of the business or admin
CREATE POLICY "order-media party delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-media'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id::text = (storage.foldername(name))[1]
      AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);