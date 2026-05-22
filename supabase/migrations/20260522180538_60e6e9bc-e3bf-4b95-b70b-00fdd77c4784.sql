
-- Capacity helper
CREATE OR REPLACE FUNCTION public.business_capacity(_business_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((SELECT COUNT(*)::int FROM public.crew_members
              WHERE business_id = _business_id AND is_active = true), 0),
    1
  );
$$;

-- Capacity-aware slot availability
CREATE OR REPLACE FUNCTION public.is_slot_available(_business_id uuid, _start timestamptz, _end timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.orders o
    LEFT JOIN public.services s ON s.id = o.service_id
    WHERE o.business_id = _business_id
      AND o.status NOT IN ('cancelled','completed')
      AND o.scheduled_for IS NOT NULL
      AND tstzrange(
            o.scheduled_for,
            o.scheduled_for + (COALESCE(s.duration_minutes, 60) || ' minutes')::interval,
            '[)'
          ) && tstzrange(_start, _end, '[)')
  ) < public.business_capacity(_business_id);
$$;

-- Day slots with counts
CREATE OR REPLACE FUNCTION public.list_day_slots(_business_id uuid, _date date, _duration_minutes int DEFAULT 60)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz, capacity int, booked int)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dow int := EXTRACT(DOW FROM _date)::int;
  _settings public.business_settings%ROWTYPE;
  _range record;
  _s timestamptz;
  _e timestamptz;
  _rstart timestamptz;
  _rend timestamptz;
  _cap int := public.business_capacity(_business_id);
  _step interval;
BEGIN
  IF _duration_minutes IS NULL OR _duration_minutes <= 0 THEN
    _duration_minutes := 60;
  END IF;
  _step := make_interval(mins => GREATEST(_duration_minutes, 15));

  SELECT * INTO _settings FROM public.business_settings WHERE business_id = _business_id;
  IF FOUND THEN
    IF _settings.availability = 'closed' THEN RETURN; END IF;
    IF _settings.availability = 'away' AND _settings.away_until IS NOT NULL AND _date < _settings.away_until::date THEN
      RETURN;
    END IF;
  END IF;

  FOR _range IN
    SELECT opens_at, closes_at FROM public.business_hours
    WHERE business_id = _business_id AND day_of_week = _dow AND is_open = true
    ORDER BY opens_at
  LOOP
    _rstart := (_date::text || ' ' || _range.opens_at::text)::timestamptz;
    _rend := (_date::text || ' ' || _range.closes_at::text)::timestamptz;
    IF _rend <= _rstart THEN CONTINUE; END IF;
    _s := _rstart;
    WHILE _s + make_interval(mins => _duration_minutes) <= _rend LOOP
      _e := _s + make_interval(mins => _duration_minutes);
      slot_start := _s;
      slot_end := _e;
      capacity := _cap;
      booked := (
        SELECT COUNT(*)::int FROM public.orders o
        LEFT JOIN public.services s ON s.id = o.service_id
        WHERE o.business_id = _business_id
          AND o.status NOT IN ('cancelled','completed')
          AND o.scheduled_for IS NOT NULL
          AND tstzrange(o.scheduled_for, o.scheduled_for + (COALESCE(s.duration_minutes, 60) || ' minutes')::interval, '[)')
              && tstzrange(_s, _e, '[)')
      );
      RETURN NEXT;
      _s := _s + _step;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.business_capacity(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.list_day_slots(uuid, date, int) TO authenticated, anon;
