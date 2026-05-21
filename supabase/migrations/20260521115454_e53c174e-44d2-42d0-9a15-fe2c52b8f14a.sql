-- Allow customer/user-level profile change requests
ALTER TABLE public.profile_change_requests
  ALTER COLUMN business_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS target_user_id uuid;

-- Ensure each request is either business-scoped OR user-scoped
ALTER TABLE public.profile_change_requests
  DROP CONSTRAINT IF EXISTS profile_change_requests_scope_chk;
ALTER TABLE public.profile_change_requests
  ADD CONSTRAINT profile_change_requests_scope_chk
  CHECK (
    (business_id IS NOT NULL AND target_user_id IS NULL)
    OR (business_id IS NULL AND target_user_id IS NOT NULL)
  );

-- Add phone column to profiles for customer phone change requests
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- Allow customers/users to submit and view their own user-scoped change requests
DROP POLICY IF EXISTS "Users create own change requests" ON public.profile_change_requests;
CREATE POLICY "Users create own change requests"
ON public.profile_change_requests
FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND business_id IS NULL
  AND target_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users view own change requests" ON public.profile_change_requests;
CREATE POLICY "Users view own change requests"
ON public.profile_change_requests
FOR SELECT
TO authenticated
USING (
  target_user_id = auth.uid()
  OR is_business_owner(auth.uid(), business_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update resolver to support user-scoped requests
CREATE OR REPLACE FUNCTION public.admin_resolve_change_request(
  _request_id uuid,
  _approve boolean,
  _decision_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    IF _req.business_id IS NOT NULL THEN
      IF _req.field = 'name' THEN
        UPDATE public.businesses SET name = _req.requested_value WHERE id = _req.business_id;
      ELSIF _req.field = 'phone' THEN
        UPDATE public.businesses SET phone = _req.requested_value WHERE id = _req.business_id;
      ELSIF _req.field = 'email' THEN
        UPDATE public.businesses SET email = _req.requested_value WHERE id = _req.business_id;
      END IF;
    ELSIF _req.target_user_id IS NOT NULL THEN
      IF _req.field = 'name' THEN
        UPDATE public.profiles SET full_name = _req.requested_value WHERE id = _req.target_user_id;
      ELSIF _req.field = 'phone' THEN
        UPDATE public.profiles SET phone = _req.requested_value WHERE id = _req.target_user_id;
      ELSIF _req.field = 'email' THEN
        UPDATE public.profiles SET email = _req.requested_value WHERE id = _req.target_user_id;
      END IF;
    END IF;

    UPDATE public.profile_change_requests
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), decision_reason = _decision_reason
    WHERE id = _request_id;
  ELSE
    UPDATE public.profile_change_requests
    SET status = 'denied', reviewed_by = auth.uid(), reviewed_at = now(), decision_reason = _decision_reason
    WHERE id = _request_id;
  END IF;

  -- Notify the right person
  IF _req.business_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT b.owner_id,
           'change_request_' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END),
           'Profile change ' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END),
           'Your request to update your business ' || _req.field || ' was ' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END) || '.',
           '/business/settings'
    FROM public.businesses b WHERE b.id = _req.business_id;
  ELSIF _req.target_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _req.target_user_id,
      'change_request_' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END),
      'Profile change ' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END),
      'Your request to update your ' || _req.field || ' was ' || (CASE WHEN _approve THEN 'approved' ELSE 'denied' END) || '.',
      '/customer/settings'
    );
  END IF;
END;
$function$;