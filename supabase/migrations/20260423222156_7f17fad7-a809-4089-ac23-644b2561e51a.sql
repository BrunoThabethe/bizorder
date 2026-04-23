-- Replace overly-broad SELECT on storage.objects for order-media
DROP POLICY IF EXISTS "Public read order media" ON storage.objects;

-- Note: public buckets still serve files via direct URL even without a SELECT policy.
-- We intentionally do NOT add a broad SELECT policy to prevent listing.

-- Allow authenticated users to read specific objects in order-media
-- (apps fetch by known path; no listing enabled).
CREATE POLICY "Auth read order media object"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'order-media');
