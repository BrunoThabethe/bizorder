
-- Auto-cancel awaiting_payment orders past the existing timeout AND
-- auto-cancel paid-but-not-accepted orders after 24 hours (configurable).

INSERT INTO public.system_settings (key, value)
VALUES ('acceptance_timeout_hours', '24')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _pay_timeout_minutes integer;
  _accept_timeout_hours integer;
  _affected integer := 0;
  _accept_affected integer := 0;
BEGIN
  SELECT COALESCE(NULLIF(value, '')::integer, 30) INTO _pay_timeout_minutes
  FROM public.system_settings WHERE key = 'awaiting_payment_timeout_minutes';
  IF _pay_timeout_minutes IS NULL THEN _pay_timeout_minutes := 30; END IF;

  SELECT COALESCE(NULLIF(value, '')::integer, 24) INTO _accept_timeout_hours
  FROM public.system_settings WHERE key = 'acceptance_timeout_hours';
  IF _accept_timeout_hours IS NULL THEN _accept_timeout_hours := 24; END IF;

  -- 1. Cancel unpaid orders (awaiting_payment older than payment timeout)
  WITH cancelled AS (
    UPDATE public.orders
    SET status = 'cancelled', updated_at = now()
    WHERE status = 'awaiting_payment'
      AND created_at < now() - make_interval(mins => _pay_timeout_minutes)
    RETURNING id, customer_id, business_id
  ),
  ev AS (
    INSERT INTO public.order_events (order_id, actor_id, type, message)
    SELECT id, NULL, 'auto_cancelled', 'Order auto-cancelled: payment not received in time'
    FROM cancelled
    RETURNING 1
  )
  SELECT count(*) INTO _affected FROM cancelled;

  UPDATE public.order_payments
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND order_id IN (SELECT id FROM public.orders WHERE status = 'cancelled');

  -- 2. Cancel paid orders the business never accepted within 24 hours
  WITH cancelled2 AS (
    UPDATE public.orders
    SET status = 'cancelled', updated_at = now(),
        rejected_reason = COALESCE(rejected_reason, 'Auto-cancelled: provider did not accept within ' || _accept_timeout_hours || ' hours')
    WHERE status = 'pending'
      AND created_at < now() - make_interval(hours => _accept_timeout_hours)
    RETURNING id, customer_id, business_id
  ),
  ev2 AS (
    INSERT INTO public.order_events (order_id, actor_id, type, message)
    SELECT id, NULL, 'auto_cancelled',
           'Order auto-cancelled: provider did not accept within ' || _accept_timeout_hours || ' hours'
    FROM cancelled2
    RETURNING 1
  ),
  notif_cust AS (
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT customer_id, 'order_auto_cancelled', 'Order cancelled',
           'Your order was cancelled because the provider did not accept it within ' || _accept_timeout_hours || ' hours. Your payment will be refunded.',
           '/customer/orders/' || id
    FROM cancelled2
    RETURNING 1
  ),
  notif_biz AS (
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT b.owner_id, 'order_auto_cancelled', 'Order auto-cancelled',
           'An order was auto-cancelled because it was not accepted within ' || _accept_timeout_hours || ' hours.',
           '/business/orders/' || c.id
    FROM cancelled2 c JOIN public.businesses b ON b.id = c.business_id
    RETURNING 1
  )
  SELECT count(*) INTO _accept_affected FROM cancelled2;

  RETURN _affected + _accept_affected;
END;
$function$;
