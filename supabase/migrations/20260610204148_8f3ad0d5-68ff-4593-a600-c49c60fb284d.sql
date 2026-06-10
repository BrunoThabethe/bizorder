
-- 1) Lock down audit_logs inserts — only admins may write directly.
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) notify_user: block protocol-relative URLs.
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _type text, _title text, _body text DEFAULT NULL::text, _link text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _allowed boolean := false;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Recipient required'; END IF;
  IF _type IS NULL OR length(_type) < 2 OR length(_type) > 64 THEN RAISE EXCEPTION 'Invalid notification type'; END IF;
  IF _title IS NULL OR length(_title) < 1 OR length(_title) > 200 THEN RAISE EXCEPTION 'Invalid title'; END IF;
  IF _body IS NOT NULL AND length(_body) > 1000 THEN RAISE EXCEPTION 'Body too long'; END IF;
  IF _link IS NOT NULL AND length(_link) > 500 THEN RAISE EXCEPTION 'Link too long'; END IF;
  -- Only allow internal absolute paths; reject protocol-relative // and schemes.
  IF _link IS NOT NULL AND (_link !~ '^/' OR _link ~ '^//' OR _link ~ '^/\\') THEN
    RAISE EXCEPTION 'Link must be an internal absolute path';
  END IF;

  IF _user_id = _uid THEN _allowed := true;
  ELSIF public.has_role(_uid, 'admin') THEN _allowed := true;
  ELSIF EXISTS (SELECT 1 FROM public.crew_members cm JOIN public.businesses b ON b.id = cm.business_id
    WHERE cm.user_id = _user_id AND cm.is_active = true AND b.owner_id = _uid) THEN _allowed := true;
  ELSIF EXISTS (SELECT 1 FROM public.orders o JOIN public.businesses b ON b.id = o.business_id
    WHERE o.customer_id = _user_id AND b.owner_id = _uid) THEN _allowed := true;
  ELSIF EXISTS (SELECT 1 FROM public.businesses b JOIN public.crew_members cm ON cm.business_id = b.id
    WHERE b.owner_id = _user_id AND cm.user_id = _uid AND cm.is_active = true) THEN _allowed := true;
  ELSIF EXISTS (SELECT 1 FROM public.orders o JOIN public.businesses b ON b.id = o.business_id
    WHERE o.customer_id = _uid AND b.owner_id = _user_id) THEN _allowed := true;
  END IF;

  IF NOT _allowed THEN RAISE EXCEPTION 'Not allowed to notify this user'; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_user_id, _type, _title, _body, _link)
  RETURNING id INTO _new_id;
  RETURN _new_id;
END;
$function$;

-- 3) get_primary_role: restrict to self or admin caller.
CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _r public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT role INTO _r FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'business' THEN 2 WHEN 'customer' THEN 3 END
  LIMIT 1;
  RETURN _r;
END;
$function$;

-- 4) website_url scheme check on businesses (defensive against XSS via javascript: URIs).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_website_url_scheme') THEN
    -- First sanitize any existing bad values
    UPDATE public.businesses SET website_url = NULL
      WHERE website_url IS NOT NULL AND website_url !~* '^https?://';
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_website_url_scheme
      CHECK (website_url IS NULL OR website_url ~* '^https?://');
  END IF;
END $$;

-- 5) Drop broken storage policy (the correct "order-media party read" policy supersedes it).
DROP POLICY IF EXISTS "Order parties read order media" ON storage.objects;
