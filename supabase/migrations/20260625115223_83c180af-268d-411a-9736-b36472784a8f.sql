
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS delivery_options jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_option jsonb;

CREATE OR REPLACE FUNCTION public.enforce_order_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _svc public.services%ROWTYPE;
  _opts jsonb;
  _fee numeric;
  _match boolean;
BEGIN
  IF NEW.service_id IS NULL THEN
    RAISE EXCEPTION 'Order must reference a service';
  END IF;

  SELECT * INTO _svc FROM public.services WHERE id = NEW.service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  IF _svc.business_id <> NEW.business_id THEN
    RAISE EXCEPTION 'Service does not belong to this business';
  END IF;

  NEW.currency := COALESCE(_svc.currency, 'ZAR');

  -- Validate chosen delivery option (if any)
  IF NEW.fulfillment_type = 'delivery' AND NEW.delivery_option IS NOT NULL THEN
    _opts := COALESCE(_svc.delivery_options, '[]'::jsonb);
    _fee := COALESCE((NEW.delivery_option->>'price')::numeric, 0);
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(_opts) AS opt
      WHERE opt->>'id' = NEW.delivery_option->>'id'
        AND COALESCE((opt->>'price')::numeric, 0) = _fee
    ) INTO _match;
    IF NOT _match THEN
      RAISE EXCEPTION 'Chosen delivery option is not available for this product';
    END IF;
    NEW.delivery_fee := _fee;
  ELSE
    NEW.delivery_fee := 0;
    NEW.delivery_option := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.total := COALESCE(_svc.price, 0) + COALESCE(NEW.delivery_fee, 0);
  ELSIF NEW.total IS DISTINCT FROM OLD.total THEN
    IF NOT (public.is_business_owner(auth.uid(), NEW.business_id)
            OR public.has_role(auth.uid(), 'admin')) THEN
      NEW.total := OLD.total;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
