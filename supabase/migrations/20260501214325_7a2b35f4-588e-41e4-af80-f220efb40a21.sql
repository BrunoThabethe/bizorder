-- Make onboarding document RLS explicit and safe for active business verification uploads
DROP POLICY IF EXISTS "Owners manage own onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Admins manage onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Owners view own onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Owners add own onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Owners update own onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Owners delete own onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Admins view onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Admins add onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Admins update onboarding documents" ON public.business_onboarding_documents;
DROP POLICY IF EXISTS "Admins delete onboarding documents" ON public.business_onboarding_documents;

CREATE POLICY "Owners view own onboarding documents"
ON public.business_onboarding_documents
FOR SELECT
TO authenticated
USING (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "Owners add own onboarding documents"
ON public.business_onboarding_documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.is_business_owner(auth.uid(), business_id)
  AND document_type IN ('owner_id', 'proof_of_residence', 'proof_of_operations', 'cipc_registration')
  AND review_status = 'pending'
);

CREATE POLICY "Owners update own pending onboarding documents"
ON public.business_onboarding_documents
FOR UPDATE
TO authenticated
USING (public.is_business_owner(auth.uid(), business_id))
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.is_business_owner(auth.uid(), business_id)
  AND document_type IN ('owner_id', 'proof_of_residence', 'proof_of_operations', 'cipc_registration')
);

CREATE POLICY "Owners delete own onboarding documents"
ON public.business_onboarding_documents
FOR DELETE
TO authenticated
USING (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "Admins view onboarding documents"
ON public.business_onboarding_documents
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins add onboarding documents"
ON public.business_onboarding_documents
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update onboarding documents"
ON public.business_onboarding_documents
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete onboarding documents"
ON public.business_onboarding_documents
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Recreate private verification storage policies with explicit owner checks
DROP POLICY IF EXISTS "Owners read own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins read all verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners upload own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners replace own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all verification docs" ON storage.objects;

CREATE POLICY "Owners read own verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners upload own verification docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners replace own verification docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'verification-docs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners delete own verification docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

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
