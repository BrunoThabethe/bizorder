-- 1. Business settings (availability + cover)
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE,
  availability TEXT NOT NULL DEFAULT 'available',
  away_until TIMESTAMPTZ,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_settings_availability_check
    CHECK (availability IN ('available','busy','closed','away'))
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views settings of published businesses"
ON public.business_settings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_settings.business_id
      AND (b.is_published = true OR b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE POLICY "Owners manage own business settings"
ON public.business_settings FOR ALL TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Weekly hours (multiple ranges per day)
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL,
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_hours_day_check CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT business_hours_range_check CHECK (closes_at > opens_at)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_business_day
  ON public.business_hours(business_id, day_of_week);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views hours of published businesses"
ON public.business_hours FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_hours.business_id
      AND (b.is_published = true OR b.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE POLICY "Owners manage own hours"
ON public.business_hours FOR ALL TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER business_hours_updated_at
BEFORE UPDATE ON public.business_hours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Profile / business change requests (admin-approved)
CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  field TEXT NOT NULL,
  current_value TEXT,
  requested_value TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pcr_field_check CHECK (field IN ('name','phone','email')),
  CONSTRAINT pcr_status_check CHECK (status IN ('pending','approved','denied'))
);

ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners create change requests"
ON public.profile_change_requests FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid() AND public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "Owners view own change requests"
ON public.profile_change_requests FOR SELECT TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage change requests"
ON public.profile_change_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER profile_change_requests_updated_at
BEFORE UPDATE ON public.profile_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Public storage bucket for business media (logo, cover, product images) — images only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('business-media','business-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public read business media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'business-media');

CREATE POLICY "Business owners upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners update own media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners delete own media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- 5. RPC: admin approve change request — applies the change atomically
CREATE OR REPLACE FUNCTION public.admin_resolve_change_request(_request_id UUID, _approve BOOLEAN, _decision_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req public.profile_change_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve change requests';
  END IF;

  SELECT * INTO _req FROM public.profile_change_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.status <> 'pending' THEN RAISE EXCEPTION 'Request already resolved'; END IF;

  IF _approve THEN
    IF _req.field = 'name' THEN
      UPDATE public.businesses SET name = _req.requested_value WHERE id = _req.business_id;
    ELSIF _req.field = 'phone' THEN
      UPDATE public.businesses SET phone = _req.requested_value WHERE id = _req.business_id;
    ELSIF _req.field = 'email' THEN
      UPDATE public.businesses SET email = _req.requested_value WHERE id = _req.business_id;
    END IF;

    UPDATE public.profile_change_requests
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), decision_reason = _decision_reason
    WHERE id = _request_id;
  ELSE
    UPDATE public.profile_change_requests
    SET status = 'denied', reviewed_by = auth.uid(), reviewed_at = now(), decision_reason = _decision_reason
    WHERE id = _request_id;
  END IF;

  -- Notify owner
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT b.owner_id,
         'change_request_' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END),
         'Profile change ' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END),
         'Your request to update your business ' || _req.field || ' was ' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END) || '.',
         '/business/settings'
  FROM public.businesses b WHERE b.id = _req.business_id;
END;
$$;