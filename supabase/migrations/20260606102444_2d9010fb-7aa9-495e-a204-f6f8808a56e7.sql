
CREATE OR REPLACE FUNCTION public.enforce_order_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _svc public.services%ROWTYPE;
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

  -- Delivery fee is always arranged directly between provider and customer.
  NEW.delivery_fee := 0;
  NEW.currency := COALESCE(_svc.currency, 'ZAR');

  IF TG_OP = 'INSERT' THEN
    NEW.total := _svc.price;
  ELSIF NEW.total IS DISTINCT FROM OLD.total THEN
    -- Only the business owner or an admin may adjust an order total after creation.
    IF NOT (public.is_business_owner(auth.uid(), NEW.business_id)
            OR public.has_role(auth.uid(), 'admin')) THEN
      NEW.total := OLD.total;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_pricing_ins ON public.orders;
DROP TRIGGER IF EXISTS enforce_order_pricing_upd ON public.orders;

CREATE TRIGGER enforce_order_pricing_ins
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_pricing();

CREATE TRIGGER enforce_order_pricing_upd
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_pricing();
