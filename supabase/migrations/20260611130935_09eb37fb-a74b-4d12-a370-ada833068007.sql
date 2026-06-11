CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _full_name text;
  _business_name text;
  _phone text;
BEGIN
  _full_name := NEW.raw_user_meta_data->>'full_name';
  _business_name := NEW.raw_user_meta_data->>'business_name';
  _phone := NULLIF(trim(NEW.raw_user_meta_data->>'phone'), '');

  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer');
  EXCEPTION WHEN OTHERS THEN
    _role := 'customer';
  END;

  IF _role = 'admin' THEN
    _role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, business_name, phone)
  VALUES (NEW.id, NEW.email, _full_name, _business_name, _phone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$$;