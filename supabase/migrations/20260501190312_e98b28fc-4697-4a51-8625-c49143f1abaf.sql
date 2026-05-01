-- Add kind column to services so providers can clearly mark each catalog
-- entry as a service or a product/item.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'service';

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_kind_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_kind_check CHECK (kind IN ('service', 'product'));