-- ============================================================
-- ADMIN PORTAL: supporting tables
-- ============================================================

-- 1) Verification requests for businesses
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  document_urls TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage verification requests"
ON public.verification_requests
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners view own verification requests"
ON public.verification_requests
FOR SELECT TO authenticated
USING (public.is_business_owner(auth.uid(), business_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners create verification requests"
ON public.verification_requests
FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid() AND public.is_business_owner(auth.uid(), business_id));

CREATE TRIGGER tg_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2) Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  opened_by UUID NOT NULL,
  business_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | reviewing | resolved | rejected
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage disputes"
ON public.disputes
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Order parties view disputes"
ON public.disputes
FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR public.is_business_owner(auth.uid(), business_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Order parties open disputes"
ON public.disputes
FOR INSERT TO authenticated
WITH CHECK (
  opened_by = auth.uid()
  AND (customer_id = auth.uid() OR public.is_business_owner(auth.uid(), business_id))
);

CREATE TRIGGER tg_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3) Newsletter subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  source TEXT, -- e.g. landing_cta, footer, signup
  is_active BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can subscribe. We never expose the list to anon/non-admins.
CREATE POLICY "Public subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins manage newsletter"
ON public.newsletter_subscribers
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_newsletter_subscribers_updated_at
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4) AI campaigns (newsletter / broadcast)
CREATE TABLE IF NOT EXISTS public.ai_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT,
  prompt TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | sent | archived
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  opens_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns"
ON public.ai_campaigns
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_ai_campaigns_updated_at
BEFORE UPDATE ON public.ai_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5) AI assistant settings (single-row config managed by admin)
CREATE TABLE IF NOT EXISTS public.ai_assistant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt TEXT NOT NULL DEFAULT 'You are BizOrder''s helpful assistant.',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1024,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assistant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage AI settings"
ON public.ai_assistant_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_ai_assistant_settings_updated_at
BEFORE UPDATE ON public.ai_assistant_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6) System settings (key/value for platform-wide flags)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage system settings"
ON public.system_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7) Audit logs (security & admin activity)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- info | warning | critical
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit logs"
ON public.audit_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated insert audit logs"
ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes (status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests (status);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON public.newsletter_subscribers (is_active);
CREATE INDEX IF NOT EXISTS idx_ai_campaigns_status ON public.ai_campaigns (status);