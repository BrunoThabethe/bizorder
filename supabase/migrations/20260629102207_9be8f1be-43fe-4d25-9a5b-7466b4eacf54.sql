
-- ============ Enums ============
DO $$ BEGIN
  CREATE TYPE public.service_type AS ENUM ('fixed','tiered','quote_based','hourly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('pending','quoted','paid','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.adjustment_status AS ENUM ('pending','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Column additions ============
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_type public.service_type NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS quote_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC NULL;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_adjustments_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_quote_id UUID NULL;

-- ============ service_tiers ============
CREATE TABLE IF NOT EXISTS public.service_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  duration_hours NUMERIC NULL CHECK (duration_hours IS NULL OR duration_hours > 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_tiers_service_idx ON public.service_tiers(service_id, sort_order);

GRANT SELECT ON public.service_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_tiers TO authenticated;
GRANT ALL ON public.service_tiers TO service_role;

ALTER TABLE public.service_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads tiers of published services"
  ON public.service_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      JOIN public.businesses b ON b.id = s.business_id
      WHERE s.id = service_tiers.service_id
        AND s.is_active = true
        AND b.is_published = true
        AND b.deleted_at IS NULL
    )
  );

CREATE POLICY "Business owner manages own tiers"
  ON public.service_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_tiers.service_id
        AND public.is_business_owner(auth.uid(), s.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_tiers.service_id
        AND public.is_business_owner(auth.uid(), s.business_id)
    )
  );

CREATE POLICY "Admins manage tiers"
  ON public.service_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER service_tiers_updated_at
  BEFORE UPDATE ON public.service_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ quotes ============
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  quoted_price NUMERIC NULL CHECK (quoted_price IS NULL OR quoted_price >= 0),
  status public.quote_status NOT NULL DEFAULT 'pending',
  paystack_reference TEXT NULL,
  order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quotes_business_idx ON public.quotes(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_customer_idx ON public.quotes(customer_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own quotes"
  ON public.quotes FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Business reads own quotes"
  ON public.quotes FOR SELECT
  USING (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "Admin reads all quotes"
  ON public.quotes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customer creates own quote"
  ON public.quotes FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Business updates own quote"
  ON public.quotes FOR UPDATE
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "Customer cancels own quote"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.orders
  ADD CONSTRAINT orders_source_quote_fk
  FOREIGN KEY (source_quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

-- ============ order_adjustments ============
CREATE TABLE IF NOT EXISTS public.order_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 3 AND 1000),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  paystack_reference TEXT NULL,
  status public.adjustment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_adjustments_order_idx ON public.order_adjustments(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_adjustments_business_idx ON public.order_adjustments(business_id, status);
CREATE INDEX IF NOT EXISTS order_adjustments_customer_idx ON public.order_adjustments(customer_id, status);

GRANT SELECT, INSERT, UPDATE ON public.order_adjustments TO authenticated;
GRANT ALL ON public.order_adjustments TO service_role;

ALTER TABLE public.order_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read adjustments"
  ON public.order_adjustments FOR SELECT
  USING (
    auth.uid() = customer_id
    OR public.is_business_owner(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Business creates adjustments on own order"
  ON public.order_adjustments FOR INSERT
  WITH CHECK (
    public.is_business_owner(auth.uid(), business_id)
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_adjustments.order_id
        AND o.business_id = order_adjustments.business_id
        AND o.customer_id = order_adjustments.customer_id
        AND o.status IN ('accepted','in_progress','ready','out_for_delivery','ready_for_review','completed')
    )
  );

CREATE POLICY "Business cancels own pending adjustments"
  ON public.order_adjustments FOR UPDATE
  USING (public.is_business_owner(auth.uid(), business_id) AND status = 'pending')
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "Admin manages adjustments"
  ON public.order_adjustments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER order_adjustments_updated_at
  BEFORE UPDATE ON public.order_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ Recompute total_adjustments_amount on orders ============
CREATE OR REPLACE FUNCTION public.recalc_order_adjustments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order UUID;
BEGIN
  _order := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE public.orders
  SET total_adjustments_amount = COALESCE((
    SELECT SUM(amount) FROM public.order_adjustments
    WHERE order_id = _order AND status = 'paid'
  ), 0),
  updated_at = now()
  WHERE id = _order;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS order_adjustments_recalc ON public.order_adjustments;
CREATE TRIGGER order_adjustments_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.order_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_order_adjustments();
