
-- Remove the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;

-- Allow users to create notifications only for themselves (self-notifications, e.g., reminders)
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Server-side helper for cross-user notifications. Validates the caller's relationship to the recipient.
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid,
  _type text,
  _title text,
  _body text DEFAULT NULL,
  _link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _allowed boolean := false;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient required';
  END IF;
  IF _type IS NULL OR length(_type) < 2 OR length(_type) > 64 THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;
  IF _title IS NULL OR length(_title) < 1 OR length(_title) > 200 THEN
    RAISE EXCEPTION 'Invalid title';
  END IF;
  IF _body IS NOT NULL AND length(_body) > 1000 THEN
    RAISE EXCEPTION 'Body too long';
  END IF;
  IF _link IS NOT NULL AND length(_link) > 500 THEN
    RAISE EXCEPTION 'Link too long';
  END IF;
  -- Only allow internal links
  IF _link IS NOT NULL AND _link !~ '^/' THEN
    RAISE EXCEPTION 'Link must be a relative path';
  END IF;

  -- Self-notify is always fine
  IF _user_id = _uid THEN
    _allowed := true;
  -- Admins can notify anyone
  ELSIF public.has_role(_uid, 'admin') THEN
    _allowed := true;
  -- Business owner can notify their active crew members
  ELSIF EXISTS (
    SELECT 1 FROM public.crew_members cm
    JOIN public.businesses b ON b.id = cm.business_id
    WHERE cm.user_id = _user_id AND cm.is_active = true AND b.owner_id = _uid
  ) THEN
    _allowed := true;
  -- Business owner can notify customers of their orders
  ELSIF EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.customer_id = _user_id AND b.owner_id = _uid
  ) THEN
    _allowed := true;
  -- Crew member can notify the owner of their business
  ELSIF EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.crew_members cm ON cm.business_id = b.id
    WHERE b.owner_id = _user_id AND cm.user_id = _uid AND cm.is_active = true
  ) THEN
    _allowed := true;
  -- Customer can notify the owner of a business they have an order with
  ELSIF EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.customer_id = _uid AND b.owner_id = _user_id
  ) THEN
    _allowed := true;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Not allowed to notify this user';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_user_id, _type, _title, _body, _link)
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text) TO authenticated;
