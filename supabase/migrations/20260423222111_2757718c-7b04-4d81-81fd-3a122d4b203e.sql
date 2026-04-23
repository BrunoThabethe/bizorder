-- ============================================
-- Provider portal + Crew sub-portal schema
-- ============================================

-- 1) Extend app_role enum with 'crew'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'crew';

-- 2) Crew members table (provider-managed accounts)
CREATE TABLE IF NOT EXISTS public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  role_title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_crew_members_updated
BEFORE UPDATE ON public.crew_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Helper: is the current user the owner of a business?
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id AND b.owner_id = _user_id
  )
$$;

-- Helper: is the current user an active crew member of a business?
CREATE OR REPLACE FUNCTION public.is_crew_of_business(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crew_members cm
    WHERE cm.business_id = _business_id
      AND cm.user_id = _user_id
      AND cm.is_active = true
  )
$$;

-- Helper: crew_member id for current user in a business
CREATE OR REPLACE FUNCTION public.crew_member_id_for(_user_id uuid, _business_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.crew_members
  WHERE business_id = _business_id AND user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- RLS: crew_members
CREATE POLICY "Owners manage crew"
ON public.crew_members FOR ALL TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Crew view own crew row"
ON public.crew_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3) Order tasks (provider assigns parts of an order to crew)
CREATE TABLE IF NOT EXISTS public.order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  business_id uuid NOT NULL,
  crew_member_id uuid,
  title text NOT NULL,
  instructions text,
  status text NOT NULL DEFAULT 'pending', -- pending | in_progress | done
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_order_tasks_updated
BEFORE UPDATE ON public.order_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_tasks_order ON public.order_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tasks_crew ON public.order_tasks(crew_member_id);

-- RLS: order_tasks
CREATE POLICY "Owner & admin view tasks"
ON public.order_tasks FOR SELECT TO authenticated
USING (
  public.is_business_owner(auth.uid(), business_id)
  OR public.has_role(auth.uid(), 'admin')
  OR (
    crew_member_id IS NOT NULL
    AND crew_member_id = public.crew_member_id_for(auth.uid(), business_id)
  )
);

CREATE POLICY "Owner manages tasks"
ON public.order_tasks FOR ALL TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Crew updates own task status"
ON public.order_tasks FOR UPDATE TO authenticated
USING (crew_member_id = public.crew_member_id_for(auth.uid(), business_id))
WITH CHECK (crew_member_id = public.crew_member_id_for(auth.uid(), business_id));

-- 4) Order progress updates (text + media)
CREATE TABLE IF NOT EXISTS public.order_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  business_id uuid NOT NULL,
  task_id uuid,
  author_id uuid NOT NULL,
  note text,
  media_urls text[] NOT NULL DEFAULT '{}',
  stage text, -- e.g. accepted, in_progress, ready, out_for_delivery, completed
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_order_progress_order ON public.order_progress(order_id);

-- RLS: order_progress
CREATE POLICY "Order parties view progress"
ON public.order_progress FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  OR public.is_business_owner(auth.uid(), business_id)
  OR public.has_role(auth.uid(), 'admin')
  OR (
    task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.order_tasks t
      WHERE t.id = task_id
        AND t.crew_member_id = public.crew_member_id_for(auth.uid(), business_id)
    )
  )
);

CREATE POLICY "Owner inserts progress"
ON public.order_progress FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Crew inserts progress on assigned task"
ON public.order_progress FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND task_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.order_tasks t
    WHERE t.id = task_id
      AND t.business_id = order_progress.business_id
      AND t.crew_member_id = public.crew_member_id_for(auth.uid(), order_progress.business_id)
  )
);

-- 5) Order schedule (estimated completion / pickup window)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_completion_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- 6) Payouts (provider earnings ledger)
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  order_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'pending', -- pending | released | paid
  released_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_payouts_updated
BEFORE UPDATE ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_payouts_business ON public.payouts(business_id);

CREATE POLICY "Owner views payouts"
ON public.payouts FOR SELECT TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages payouts"
ON public.payouts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7) Storage bucket for order media (proof photos / short videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-media', 'order-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read order-media (signed paths only used by app, but bucket public for simple display)
CREATE POLICY "Public read order media"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-media');

-- Authenticated users can upload to a folder named after their user id
CREATE POLICY "Auth users upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth users update own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'order-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users delete own folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'order-media' AND auth.uid()::text = (storage.foldername(name))[1]);
