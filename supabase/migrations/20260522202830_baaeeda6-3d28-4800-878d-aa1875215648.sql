CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'coming_soon',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can join waitlist"
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email::text) BETWEEN 5 AND 255
  AND email::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND source IN ('coming_soon')
);

CREATE POLICY "Admins manage waitlist"
ON public.waitlist_signups
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS waitlist_signups_created_at_idx
  ON public.waitlist_signups (created_at DESC);