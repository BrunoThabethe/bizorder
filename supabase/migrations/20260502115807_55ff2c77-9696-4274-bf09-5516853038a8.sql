CREATE OR REPLACE FUNCTION public.save_business_onboarding_document(
  _business_id uuid,
  _document_type text,
  _storage_path text,
  _file_name text DEFAULT NULL,
  _mime_type text DEFAULT NULL,
  _size_bytes integer DEFAULT NULL
)
RETURNS public.business_onboarding_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _saved public.business_onboarding_documents%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to upload verification documents';
  END IF;

  IF NOT public.is_business_owner(_uid, _business_id) THEN
    RAISE EXCEPTION 'You can only upload verification documents for your own business';
  END IF;

  IF _document_type NOT IN ('owner_id', 'proof_of_residence', 'proof_of_operations', 'cipc_registration') THEN
    RAISE EXCEPTION 'Unsupported verification document type';
  END IF;

  IF _storage_path IS NULL OR _storage_path !~ ('^' || _business_id::text || '/[A-Za-z0-9_-]+-[0-9a-fA-F-]+\.(jpg|jpeg|png|webp|pdf)$') THEN
    RAISE EXCEPTION 'Verification file path is invalid';
  END IF;

  IF _mime_type IS NOT NULL AND _mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') THEN
    RAISE EXCEPTION 'Use JPG, PNG, WebP, or PDF files only';
  END IF;

  IF _size_bytes IS NOT NULL AND _size_bytes > 10485760 THEN
    RAISE EXCEPTION 'File must be smaller than 10 MB';
  END IF;

  DELETE FROM public.business_onboarding_documents
  WHERE business_id = _business_id
    AND document_type = _document_type;

  INSERT INTO public.business_onboarding_documents (
    business_id,
    document_type,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    uploaded_by,
    review_status,
    reviewer_notes,
    reviewed_by,
    reviewed_at
  )
  VALUES (
    _business_id,
    _document_type,
    _storage_path,
    _file_name,
    _mime_type,
    _size_bytes,
    _uid,
    'pending',
    NULL,
    NULL,
    NULL
  )
  RETURNING * INTO _saved;

  RETURN _saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_finalize_business_verification(_business_id uuid, _verify boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _required text[] := ARRAY['owner_id', 'proof_of_residence', 'proof_of_operations'];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can verify businesses';
  END IF;

  IF _verify AND NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = _business_id
      AND b.is_onboarded = true
  ) THEN
    RAISE EXCEPTION 'Business has not submitted verification yet';
  END IF;

  IF _verify AND EXISTS (
    SELECT 1
    FROM unnest(_required) AS req(document_type)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.business_onboarding_documents d
      WHERE d.business_id = _business_id
        AND d.document_type = req.document_type
        AND d.review_status = 'approved'
    )
  ) THEN
    RAISE EXCEPTION 'Approve owner ID, proof of residence, and proof of operations before verifying this business';
  END IF;

  UPDATE public.businesses
  SET is_verified = _verify,
      is_published = CASE WHEN _verify THEN true ELSE is_published END,
      updated_at = now()
  WHERE id = _business_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_business_onboarding_document(uuid, text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finalize_business_verification(uuid, boolean) TO authenticated;