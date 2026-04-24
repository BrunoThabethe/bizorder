-- Allow the seeded crew test account to self-promote to the 'crew' role.
-- This is strictly limited to the well-known seed email so it cannot be abused
-- to grant crew rights to arbitrary users.
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

  -- Ensure the crew role is present, remove the default customer role
  -- so the user lands on the crew portal.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'crew')
  ON CONFLICT DO NOTHING;

  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role = 'customer';
END;
$$;

REVOKE ALL ON FUNCTION public.promote_test_crew() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_test_crew() TO authenticated;