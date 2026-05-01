CREATE OR REPLACE FUNCTION public.post_order_progress_update(
  _order_id uuid,
  _business_id uuid,
  _task_id uuid DEFAULT NULL,
  _note text DEFAULT NULL,
  _media_urls text[] DEFAULT '{}',
  _stage text DEFAULT 'in_progress'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _order public.orders%ROWTYPE;
  _progress_id uuid;
  _note_clean text := NULLIF(trim(COALESCE(_note, '')), '');
  _media_count integer := COALESCE(array_length(_media_urls, 1), 0);
  _is_owner boolean := false;
  _is_crew boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to post an update';
  END IF;

  IF _order_id IS NULL OR _business_id IS NULL THEN
    RAISE EXCEPTION 'Order details are missing';
  END IF;

  SELECT * INTO _order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _order.business_id <> _business_id THEN
    RAISE EXCEPTION 'This order does not belong to this business';
  END IF;

  IF _note_clean IS NOT NULL AND length(_note_clean) > 1200 THEN
    RAISE EXCEPTION 'Progress note is too long';
  END IF;

  IF _media_count > 8 THEN
    RAISE EXCEPTION 'Upload up to 8 proof photos per update';
  END IF;

  IF _note_clean IS NULL AND _media_count = 0 THEN
    RAISE EXCEPTION 'Add a note or proof photo before posting';
  END IF;

  _is_owner := public.is_business_owner(_uid, _business_id) OR public.has_role(_uid, 'admin');

  IF _task_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.order_tasks t
      WHERE t.id = _task_id
        AND t.order_id = _order_id
        AND t.business_id = _business_id
        AND t.crew_member_id = public.crew_member_id_for(_uid, _business_id)
    ) INTO _is_crew;
  END IF;

  IF NOT (_is_owner OR _is_crew) THEN
    RAISE EXCEPTION 'Only this provider or assigned crew can post updates';
  END IF;

  INSERT INTO public.order_progress (order_id, business_id, task_id, author_id, note, media_urls, stage)
  VALUES (_order_id, _business_id, _task_id, _uid, _note_clean, COALESCE(_media_urls, '{}'), COALESCE(NULLIF(trim(_stage), ''), 'in_progress'))
  RETURNING id INTO _progress_id;

  INSERT INTO public.order_events (order_id, actor_id, type, message)
  VALUES (
    _order_id,
    _uid,
    'progress_update',
    COALESCE(_note_clean, _media_count || ' proof photo' || CASE WHEN _media_count = 1 THEN '' ELSE 's' END || ' added')
  );

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    _order.customer_id,
    'progress_update',
    'New proof update on your order',
    COALESCE(left(_note_clean, 140), 'Your provider posted new proof photos for you to review.'),
    '/customer/orders/' || _order_id
  );

  RETURN _progress_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_order_progress_update(uuid, uuid, uuid, text, text[], text) TO authenticated;