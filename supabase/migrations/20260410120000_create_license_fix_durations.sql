CREATE OR REPLACE FUNCTION public.create_license(
  p_buyer_name TEXT,
  p_plan TEXT,
  p_order_code TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license_key TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_license_key := 'BAF-' || REPLACE(p_order_code, '-', '') || '-' ||
                   UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));

  v_expires_at := CASE p_plan
    WHEN 'free_trial'   THEN NOW() + INTERVAL '24 hours'
    WHEN 'monthly'      THEN NOW() + INTERVAL '31 days'
    WHEN 'full_package' THEN NOW() + INTERVAL '62 days'
    WHEN 'lifetime'     THEN '2099-12-31 23:59:59'::timestamptz
    ELSE NULL
  END;

  IF v_expires_at IS NULL THEN
    RAISE EXCEPTION 'Unknown plan: %', p_plan;
  END IF;

  INSERT INTO public.licenses (key, buyer_name, is_active, expires_at)
  VALUES (v_license_key, p_buyer_name, true, v_expires_at);

  RETURN v_license_key;
END;
$$;

REVOKE ALL ON FUNCTION public.create_license(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_license(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_license(TEXT, TEXT, TEXT) TO service_role;
