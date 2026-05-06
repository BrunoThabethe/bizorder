-- 1. Soft-delete column
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_businesses_deleted_at ON public.businesses(deleted_at);

-- 2. Update RLS so customer-facing read excludes soft-deleted
DROP POLICY IF EXISTS "Anyone authenticated views published businesses" ON public.businesses;
CREATE POLICY "Anyone authenticated views published businesses"
ON public.businesses FOR SELECT TO authenticated
USING (
  ((is_published = true AND deleted_at IS NULL))
  OR (owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Services / hours / settings: hide if business is soft-deleted (for non-owners/admins)
DROP POLICY IF EXISTS "Anyone authenticated views active services" ON public.services;
CREATE POLICY "Anyone authenticated views active services"
ON public.services FOR SELECT TO authenticated
USING (
  (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = services.business_id AND b.deleted_at IS NULL)
  )
  OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = services.business_id AND b.owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Anyone authenticated views hours of published businesses" ON public.business_hours;
CREATE POLICY "Anyone authenticated views hours of published businesses"
ON public.business_hours FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_hours.business_id
      AND ((b.is_published = true AND b.deleted_at IS NULL) OR b.owner_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))
  )
);

DROP POLICY IF EXISTS "Anyone authenticated views settings of published businesses" ON public.business_settings;
CREATE POLICY "Anyone authenticated views settings of published businesses"
ON public.business_settings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_settings.business_id
      AND ((b.is_published = true AND b.deleted_at IS NULL) OR b.owner_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))
  )
);

-- 3. Soft delete RPC
CREATE OR REPLACE FUNCTION public.admin_soft_delete_business(_business_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete businesses';
  END IF;

  SELECT owner_id, name INTO _owner, _name FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;

  UPDATE public.businesses
  SET deleted_at = now(), is_published = false, updated_at = now()
  WHERE id = _business_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, severity, metadata)
  VALUES (auth.uid(), 'business.soft_deleted', 'business', _business_id, 'warning',
          jsonb_build_object('reason', COALESCE(_reason, ''), 'name', _name));

  IF _owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_owner, 'business_removed', 'Your business was removed by an admin',
            COALESCE('Reason: ' || _reason, 'Contact support to learn more.'),
            '/business/settings');
  END IF;
END;
$$;

-- 4. Restore RPC
CREATE OR REPLACE FUNCTION public.admin_restore_business(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can restore businesses';
  END IF;

  SELECT owner_id INTO _owner FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;

  UPDATE public.businesses
  SET deleted_at = NULL, updated_at = now()
  WHERE id = _business_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, severity, metadata)
  VALUES (auth.uid(), 'business.restored', 'business', _business_id, 'info', '{}'::jsonb);

  IF _owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_owner, 'business_restored', 'Your business was restored',
            'You can publish it again from your settings.', '/business/settings');
  END IF;
END;
$$;

-- 5. Purge RPC (hard delete)
CREATE OR REPLACE FUNCTION public.admin_purge_business(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can purge businesses';
  END IF;

  SELECT name INTO _name FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;

  -- Per-order children
  DELETE FROM public.messages WHERE order_id IN (SELECT id FROM public.orders WHERE business_id = _business_id);
  DELETE FROM public.order_events WHERE order_id IN (SELECT id FROM public.orders WHERE business_id = _business_id);
  DELETE FROM public.order_progress WHERE business_id = _business_id;
  DELETE FROM public.order_tasks WHERE business_id = _business_id;
  DELETE FROM public.disputes WHERE business_id = _business_id;
  DELETE FROM public.reviews WHERE business_id = _business_id;
  DELETE FROM public.payouts WHERE business_id = _business_id;
  DELETE FROM public.orders WHERE business_id = _business_id;

  -- Business children
  DELETE FROM public.business_hours WHERE business_id = _business_id;
  DELETE FROM public.business_settings WHERE business_id = _business_id;
  DELETE FROM public.business_verification_checks WHERE business_id = _business_id;
  DELETE FROM public.business_onboarding_documents WHERE business_id = _business_id;
  DELETE FROM public.verification_requests WHERE business_id = _business_id;
  DELETE FROM public.profile_change_requests WHERE business_id = _business_id;
  DELETE FROM public.crew_members WHERE business_id = _business_id;
  DELETE FROM public.services WHERE business_id = _business_id;

  DELETE FROM public.businesses WHERE id = _business_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, severity, metadata)
  VALUES (auth.uid(), 'business.purged', 'business', _business_id, 'critical',
          jsonb_build_object('name', _name));
END;
$$;

-- 6. Email change requests
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  new_email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecr_user ON public.email_change_requests(user_id, created_at DESC);

ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email change requests"
ON public.email_change_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 7. Request RPC (returns plaintext code; called only from the edge function)
CREATE OR REPLACE FUNCTION public.request_email_change(_user_id uuid, _new_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _code text;
  _hash text;
  _recent_count int;
BEGIN
  IF NOT (public.has_role(_user_id, 'business') OR public.has_role(_user_id, 'admin')) THEN
    RAISE EXCEPTION 'Only business owners or admins can change email this way';
  END IF;

  IF _new_email IS NULL OR _new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  IF length(_new_email) > 255 THEN
    RAISE EXCEPTION 'Email is too long';
  END IF;

  -- Throttle: max 3 requests per hour
  SELECT COUNT(*) INTO _recent_count
  FROM public.email_change_requests
  WHERE user_id = _user_id AND created_at > now() - interval '1 hour';
  IF _recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many requests. Try again in an hour.';
  END IF;

  -- Reject if email already in use by another auth user
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = _new_email AND id <> _user_id) THEN
    RAISE EXCEPTION 'That email is already in use';
  END IF;

  _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _hash := encode(extensions.digest(_code, 'sha256'), 'hex');

  -- Invalidate previous unused codes for this user
  UPDATE public.email_change_requests
  SET used_at = now()
  WHERE user_id = _user_id AND used_at IS NULL;

  INSERT INTO public.email_change_requests (user_id, new_email, code_hash, expires_at)
  VALUES (_user_id, _new_email, _hash, now() + interval '15 minutes');

  RETURN _code;
END;
$$;

-- 8. Verify RPC (returns the new email when valid)
CREATE OR REPLACE FUNCTION public.verify_email_change(_user_id uuid, _code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _row public.email_change_requests%ROWTYPE;
  _hash text;
BEGIN
  IF _code IS NULL OR length(_code) <> 6 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _row
  FROM public.email_change_requests
  WHERE user_id = _user_id AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND OR _row.expires_at < now() OR _row.attempts >= 5 THEN
    RETURN NULL;
  END IF;

  _hash := encode(extensions.digest(_code, 'sha256'), 'hex');

  IF _hash <> _row.code_hash THEN
    UPDATE public.email_change_requests SET attempts = attempts + 1 WHERE id = _row.id;
    RETURN NULL;
  END IF;

  UPDATE public.email_change_requests SET used_at = now() WHERE id = _row.id;
  RETURN _row.new_email;
END;
$$;