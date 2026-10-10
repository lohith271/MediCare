-- Atomic server-only registration throttle for the no-confirmation signup route.
CREATE OR REPLACE FUNCTION public.consume_signup_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, NOW(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.window_start + make_interval(secs => p_window_seconds) <= NOW() THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start + make_interval(secs => p_window_seconds) <= NOW() THEN NOW()
      ELSE public.rate_limits.window_start
    END
  RETURNING count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_signup_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_signup_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
