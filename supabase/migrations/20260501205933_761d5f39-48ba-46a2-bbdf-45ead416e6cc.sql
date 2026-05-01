-- 1. New columns on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trading_address text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false;

-- 2. Documents table
CREATE TABLE IF NOT EXISTS public.business_onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'owner_id',
    'proof_of_residence',
    'proof_of_operations',
    'cipc_registration'
  )),
  storage_path text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid NOT NULL,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bod_business ON public.business_onboarding_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_bod_type ON public.business_onboarding_documents(business_id, document_type);

ALTER TABLE public.business_onboarding_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own onboarding documents"
ON public.business_onboarding_documents
FOR ALL
TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (
  uploaded_by = auth.uid()
  AND (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins manage onboarding documents"
ON public.business_onboarding_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_bod_updated_at
BEFORE UPDATE ON public.business_onboarding_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Private storage bucket for sensitive verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Folder convention: <business_id>/<doc_type>-<uuid>.<ext>
CREATE POLICY "Owners read own verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins read all verification docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owners upload own verification docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
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
    SELECT 1 FROM public.businesses b
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
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins manage all verification docs"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin')
);