-- Auto-verify a business when all required onboarding documents are approved.
-- Auto-unverify when any required doc is no longer approved.
CREATE OR REPLACE FUNCTION public.sync_business_verification_from_docs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bid uuid;
  _required text[] := ARRAY['owner_id','proof_of_residence','proof_of_operations'];
  _all_approved boolean;
BEGIN
  _bid := COALESCE(NEW.business_id, OLD.business_id);
  IF _bid IS NULL THEN RETURN NULL; END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM unnest(_required) AS req(document_type)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.business_onboarding_documents d
      WHERE d.business_id = _bid
        AND d.document_type = req.document_type
        AND d.review_status = 'approved'
    )
  ) INTO _all_approved;

  UPDATE public.businesses
  SET is_verified = _all_approved,
      is_published = CASE WHEN _all_approved THEN true ELSE is_published END,
      updated_at = now()
  WHERE id = _bid
    AND is_verified IS DISTINCT FROM _all_approved;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_biz_verification ON public.business_onboarding_documents;
CREATE TRIGGER trg_sync_biz_verification
AFTER INSERT OR UPDATE OF review_status OR DELETE
ON public.business_onboarding_documents
FOR EACH ROW
EXECUTE FUNCTION public.sync_business_verification_from_docs();

-- Backfill: verify any existing businesses whose required docs are all approved
DO $$
DECLARE
  _b record;
  _required text[] := ARRAY['owner_id','proof_of_residence','proof_of_operations'];
  _ok boolean;
BEGIN
  FOR _b IN SELECT id FROM public.businesses WHERE is_onboarded = true LOOP
    SELECT NOT EXISTS (
      SELECT 1 FROM unnest(_required) AS req(document_type)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.business_onboarding_documents d
        WHERE d.business_id = _b.id
          AND d.document_type = req.document_type
          AND d.review_status = 'approved'
      )
    ) INTO _ok;

    UPDATE public.businesses
    SET is_verified = _ok,
        is_published = CASE WHEN _ok THEN true ELSE is_published END,
        updated_at = now()
    WHERE id = _b.id
      AND is_verified IS DISTINCT FROM _ok;
  END LOOP;
END $$;