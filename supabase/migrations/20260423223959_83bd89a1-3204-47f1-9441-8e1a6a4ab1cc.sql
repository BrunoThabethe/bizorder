-- Replace the overly permissive WITH CHECK (true) on newsletter signup
-- with a basic email-format validation. Public signup is preserved.
DROP POLICY IF EXISTS "Public subscribe to newsletter" ON public.newsletter_subscribers;

CREATE POLICY "Public subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 255
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);