ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'awaiting_payment' BEFORE 'pending';

CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'tradesafe',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','funded','released','refunded','failed','expired')),
  tradesafe_transaction_id text,
  tradesafe_allocation_id text,
  checkout_url text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  fee_customer numeric NOT NULL DEFAULT 0,
  fee_business numeric NOT NULL DEFAULT 0,
  funded_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  last_error text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read their own order payments"
ON public.order_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id
      AND o.customer_id = auth.uid()
  )
);

CREATE POLICY "Business owners can read payments for funded orders"
ON public.order_payments
FOR SELECT
TO authenticated
USING (
  status IN ('funded','released','refunded')
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = order_payments.order_id
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all order payments"
ON public.order_payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_order_payments_updated_at
BEFORE UPDATE ON public.order_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'tradesafe',
  external_event_id text NOT NULL,
  event_type text,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)
);

GRANT ALL ON public.payment_webhook_events TO service_role;

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webhook events"
ON public.payment_webhook_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (key, value)
VALUES
  ('tradesafe_fee_split_customer_pct', '50'),
  ('tradesafe_fee_split_business_pct', '50'),
  ('awaiting_payment_timeout_minutes', '30')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _timeout_minutes integer;
  _affected integer;
BEGIN
  SELECT COALESCE(NULLIF(value, '')::integer, 30)
    INTO _timeout_minutes
  FROM public.system_settings
  WHERE key = 'awaiting_payment_timeout_minutes';
  IF _timeout_minutes IS NULL THEN _timeout_minutes := 30; END IF;

  WITH cancelled AS (
    UPDATE public.orders
    SET status = 'cancelled', updated_at = now()
    WHERE status = 'awaiting_payment'
      AND created_at < now() - make_interval(mins => _timeout_minutes)
    RETURNING id
  )
  SELECT count(*) INTO _affected FROM cancelled;

  UPDATE public.order_payments
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND order_id IN (
      SELECT id FROM public.orders WHERE status = 'cancelled'
    );

  RETURN _affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_unpaid_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO service_role;