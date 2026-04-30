-- create_order RPC에 IP 차단 체크 추가
CREATE OR REPLACE FUNCTION public.create_order(
    p_name TEXT,
    p_email TEXT,
    p_plan TEXT,
    p_amount INTEGER,
    p_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_code TEXT;
    v_existing BIGINT;
    v_blocked BIGINT;
    v_result JSON;
BEGIN
    -- 무료체험: IP 차단 체크
    IF p_plan = 'free_trial' AND p_ip IS NOT NULL THEN
        SELECT id INTO v_blocked
        FROM public.blocked_ips
        WHERE ip = p_ip
        LIMIT 1;

        IF v_blocked IS NOT NULL THEN
            RAISE EXCEPTION '무료 체험 횟수를 모두 사용하셨습니다. 정식 버전을 신청해주세요.';
        END IF;
    END IF;

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

    -- INSERT (phone 추가)
    INSERT INTO public.orders (name, email, phone, plan, amount, status, ip, user_agent, order_code)
    VALUES (
        p_name, p_email, p_phone, p_plan, p_amount,
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
