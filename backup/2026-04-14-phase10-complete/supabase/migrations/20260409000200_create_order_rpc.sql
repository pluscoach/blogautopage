-- ============================================
-- Migration 002: create_order RPC (anon 호출 가능)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_order(
    p_name TEXT,
    p_email TEXT,
    p_plan TEXT,
    p_amount INTEGER,
    p_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_code TEXT;
    v_existing BIGINT;
    v_result JSON;
BEGIN
    -- 무료체험 이메일 중복 체크
    IF p_plan = 'free_trial' THEN
        SELECT id INTO v_existing
        FROM public.orders
        WHERE email = p_email AND plan = 'free_trial'
        LIMIT 1;

        IF v_existing IS NOT NULL THEN
            RAISE EXCEPTION '이미 무료 체험을 신청한 이메일입니다.';
        END IF;
    END IF;

    -- order_code 생성: 이름-랜덤4자리 (예: 홍길동-A3X7)
    v_order_code := p_name || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4));

    -- INSERT
    INSERT INTO public.orders (name, email, plan, amount, status, ip, user_agent, order_code)
    VALUES (
        p_name, p_email, p_plan, p_amount,
        CASE WHEN p_plan = 'free_trial' THEN '처리중' ELSE '결제대기' END,
        p_ip, p_user_agent, v_order_code
    )
    RETURNING json_build_object(
        'id', id,
        'order_code', order_code,
        'plan', plan,
        'status', status
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- anon 호출 허용 (프론트엔드에서 호출)
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
