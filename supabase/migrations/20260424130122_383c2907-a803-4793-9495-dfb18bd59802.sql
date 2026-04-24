CREATE OR REPLACE FUNCTION public.promote_test_crew()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  IF _email IS DISTINCT FROM 'crew@test.bizorder' THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'crew')
  ON CONFLICT DO NOTHING;

  -- Remove any other roles so the user lands on the crew portal.
  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role IN ('customer', 'business');
END;
$$;