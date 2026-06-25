CREATE TABLE public.signup_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_otp_codes TO service_role;

ALTER TABLE public.signup_otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies: edge function uses service role only.

CREATE INDEX idx_signup_otp_codes_email ON public.signup_otp_codes (lower(email), created_at DESC);

CREATE OR REPLACE FUNCTION public.issue_signup_otp(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _code text;
  _hash text;
  _recent_count int;
  _email_l text := lower(trim(_email));
BEGIN
  IF _email_l IS NULL OR _email_l !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT COUNT(*) INTO _recent_count
  FROM public.signup_otp_codes
  WHERE lower(email) = _email_l AND created_at > now() - interval '1 hour';

  IF _recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many requests. Try again in an hour.';
  END IF;

  _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _hash := encode(extensions.digest(_code, 'sha256'), 'hex');

  UPDATE public.signup_otp_codes
  SET used_at = now()
  WHERE lower(email) = _email_l AND used_at IS NULL;

  INSERT INTO public.signup_otp_codes (email, code_hash, expires_at)
  VALUES (_email_l, _hash, now() + interval '15 minutes');

  RETURN _code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_signup_otp(_email text, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _row public.signup_otp_codes%ROWTYPE;
  _hash text;
  _email_l text := lower(trim(_email));
BEGIN
  IF _code IS NULL OR length(_code) <> 6 THEN
    RETURN false;
  END IF;

  SELECT * INTO _row
  FROM public.signup_otp_codes
  WHERE lower(email) = _email_l AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND OR _row.expires_at < now() OR _row.attempts >= 5 THEN
    RETURN false;
  END IF;

  _hash := encode(extensions.digest(_code, 'sha256'), 'hex');

  IF _hash <> _row.code_hash THEN
    UPDATE public.signup_otp_codes SET attempts = attempts + 1 WHERE id = _row.id;
    RETURN false;
  END IF;

  UPDATE public.signup_otp_codes SET used_at = now() WHERE id = _row.id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.issue_signup_otp(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_signup_otp(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_signup_otp(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_signup_otp(text, text) TO service_role;