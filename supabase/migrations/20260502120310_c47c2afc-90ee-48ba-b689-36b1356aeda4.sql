-- Fix verification-docs storage ownership checks.
-- The previous policy used storage.foldername(name) inside a subquery that also had businesses.name,
-- so Postgres resolved name to the business name column instead of the storage object path.
-- This helper receives the object path explicitly and avoids that ambiguity.
CREATE OR REPLACE FUNCTION public.can_access_verification_object(
  _bucket_id text,
  _object_name text,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _bucket_id = 'verification-docs'
    AND _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id::text = split_part(_object_name, '/', 1)
        AND b.owner_id = _user_id
    )
$$;

GRANT EXECUTE ON FUNCTION public.can_access_verification_object(text, text, uuid) TO authenticated;

DROP POLICY IF EXISTS "Owners read own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners upload own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners replace own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins read all verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins update verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all verification docs" ON storage.objects;

CREATE POLICY "Owners read own verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (public.can_access_verification_object(bucket_id, storage.objects.name, auth.uid()));

CREATE POLICY "Owners upload own verification docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_verification_object(bucket_id, storage.objects.name, auth.uid()));

CREATE POLICY "Owners replace own verification docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (public.can_access_verification_object(bucket_id, storage.objects.name, auth.uid()))
WITH CHECK (public.can_access_verification_object(bucket_id, storage.objects.name, auth.uid()));

CREATE POLICY "Owners delete own verification docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (public.can_access_verification_object(bucket_id, storage.objects.name, auth.uid()));

CREATE POLICY "Admins read all verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload verification docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update verification docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete verification docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));
