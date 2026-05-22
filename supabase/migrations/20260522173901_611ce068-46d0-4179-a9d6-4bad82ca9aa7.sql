CREATE OR REPLACE FUNCTION public.list_free_slots(
  _business_id uuid,
  _date date,
  _duration_minutes int DEFAULT 60
)
RETURNS SETOF timestamptz
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dow int := EXTRACT(DOW FROM _date)::int;
  _now timestamptz := now();
  _settings public.business_settings%ROWTYPE;
  _range record;
  _slot_start timestamptz;
  _slot_end timestamptz;
  _range_start timestamptz;
  _range_end timestamptz;
  _step interval := make_interval(mins => GREATEST(_duration_minutes, 15));
BEGIN
  IF _duration_minutes IS NULL OR _duration_minutes <= 0 THEN
    _duration_minutes := 60;
    _step := make_interval(mins => 60);
  END IF;

  SELECT * INTO _settings FROM public.business_settings WHERE business_id = _business_id;
  IF FOUND THEN
    IF _settings.availability = 'closed' THEN RETURN; END IF;
    IF _settings.availability = 'away' AND _settings.away_until IS NOT NULL AND _date < _settings.away_until::date THEN
      RETURN;
    END IF;
  END IF;

  FOR _range IN
    SELECT opens_at, closes_at
    FROM public.business_hours
    WHERE business_id = _business_id
      AND day_of_week = _dow
      AND is_open = true
    ORDER BY opens_at
  LOOP
    _range_start := (_date::text || ' ' || _range.opens_at::text)::timestamptz;
    _range_end := (_date::text || ' ' || _range.closes_at::text)::timestamptz;
    IF _range_end <= _range_start THEN CONTINUE; END IF;

    _slot_start := _range_start;
    WHILE _slot_start + make_interval(mins => _duration_minutes) <= _range_end LOOP
      _slot_end := _slot_start + make_interval(mins => _duration_minutes);
      IF _slot_start >= _now AND public.is_slot_available(_business_id, _slot_start, _slot_end) THEN
        RETURN NEXT _slot_start;
      END IF;
      _slot_start := _slot_start + _step;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_free_slots(uuid, date, int) TO authenticated, anon;