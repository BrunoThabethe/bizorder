
-- 1. Verification checks table
CREATE TABLE IF NOT EXISTS public.business_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  step text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, step)
);

ALTER TABLE public.business_verification_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage verification checks"
ON public.business_verification_checks
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners view own verification checks"
ON public.business_verification_checks
FOR SELECT TO authenticated
USING (public.is_business_owner(auth.uid(), business_id));

CREATE TRIGGER trg_bvc_updated_at
BEFORE UPDATE ON public.business_verification_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Toggle verification step
CREATE OR REPLACE FUNCTION public.set_verification_check(
  _business_id uuid,
  _step text,
  _completed boolean,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update verification checks';
  END IF;
  IF _step NOT IN ('operating_proof','identity_check','address_check','references_check','online_presence') THEN
    RAISE EXCEPTION 'Unknown verification step: %', _step;
  END IF;

  INSERT INTO public.business_verification_checks (business_id, step, is_completed, notes, completed_by, completed_at)
  VALUES (_business_id, _step, _completed, _notes, CASE WHEN _completed THEN auth.uid() ELSE NULL END, CASE WHEN _completed THEN now() ELSE NULL END)
  ON CONFLICT (business_id, step) DO UPDATE
  SET is_completed = EXCLUDED.is_completed,
      notes = COALESCE(EXCLUDED.notes, public.business_verification_checks.notes),
      completed_by = EXCLUDED.completed_by,
      completed_at = EXCLUDED.completed_at,
      updated_at = now();
END;
$$;

-- 3. Permanent user deletion
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own admin account';
  END IF;

  -- Wipe user-owned operational data that has no cascade
  DELETE FROM public.notifications WHERE user_id = _user_id;
  DELETE FROM public.addresses WHERE user_id = _user_id;
  DELETE FROM public.crew_members WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;

  -- Finally remove the auth account
  DELETE FROM auth.users WHERE id = _user_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, severity, metadata)
  VALUES (auth.uid(), 'user.deleted', 'user', _user_id, 'critical', '{}'::jsonb);
END;
$$;
