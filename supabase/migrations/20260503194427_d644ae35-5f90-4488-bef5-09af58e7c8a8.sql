
-- Admin OTP storage (hash only, never plaintext)
CREATE TABLE public.admin_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_otp_user_active ON public.admin_otp_codes (user_id, created_at DESC);

ALTER TABLE public.admin_otp_codes ENABLE ROW LEVEL SECURITY;
-- No client policies; only SECURITY DEFINER functions touch this table.

-- Tracks when the current login session has cleared OTP
CREATE TABLE public.admin_otp_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read own OTP verification"
ON public.admin_otp_verifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Issues a new code (returns plaintext only to caller — the edge function — never the client)
CREATE OR REPLACE FUNCTION public.admin_issue_otp(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _code text;
  _hash text;
BEGIN
  IF NOT public.has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;
  -- 6-digit zero-padded
  _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _hash := encode(extensions.digest(_code, 'sha256'), 'hex');

  -- invalidate previous unused codes
  UPDATE public.admin_otp_codes
  SET used_at = now()
  WHERE user_id = _user_id AND used_at IS NULL;

  INSERT INTO public.admin_otp_codes (user_id, code_hash, expires_at)
  VALUES (_user_id, _hash, now() + interval '10 minutes');

  RETURN _code;
END;
$$;

-- Verifies the code; on success records the verification timestamp
CREATE OR REPLACE FUNCTION public.admin_verify_otp(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _row public.admin_otp_codes%ROWTYPE;
  _hash text;
BEGIN
  IF NOT public.has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'Not an admin';
  END IF;
  IF _code IS NULL OR length(_code) <> 6 THEN
    RETURN false;
  END IF;

  SELECT * INTO _row
  FROM public.admin_otp_codes
  WHERE user_id = _user_id AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND OR _row.expires_at < now() OR _row.attempts >= 5 THEN
    RETURN false;
  END IF;

  _hash := encode(extensions.digest(_code, 'sha256'), 'hex');

  IF _hash <> _row.code_hash THEN
    UPDATE public.admin_otp_codes SET attempts = attempts + 1 WHERE id = _row.id;
    RETURN false;
  END IF;

  UPDATE public.admin_otp_codes SET used_at = now() WHERE id = _row.id;

  INSERT INTO public.admin_otp_verifications (user_id, verified_at, updated_at)
  VALUES (_user_id, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET verified_at = EXCLUDED.verified_at, updated_at = now();

  RETURN true;
END;
$$;

-- Lock down execute to authenticated users only
REVOKE EXECUTE ON FUNCTION public.admin_issue_otp(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_verify_otp(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_issue_otp(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_otp(uuid, text) TO service_role;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
