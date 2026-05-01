REVOKE ALL ON FUNCTION public.post_order_progress_update(uuid, uuid, uuid, text, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_order_progress_update(uuid, uuid, uuid, text, text[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.post_order_progress_update(uuid, uuid, uuid, text, text[], text) TO authenticated;