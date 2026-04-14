-- ============================================
-- Migration 003: create_license RPC (service_role 전용)
-- ============================================
-- ⚠️ 이 함수는 licenses 테이블에 INSERT만 함 (테이블 자체는 건드리지 않음)
-- ⚠️ anon에게 GRANT 하지 않음 → Edge Function(service_role)만 호출 가능

CREATE OR REPLACE FUNCTION public.create_license(
    p_buyer_name TEXT,
    p_plan TEXT,
    p_order_code TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 플랜별 만료일 계산
    v_expires_at := CASE p_plan
        WHEN 'free_trial'    THEN NOW() + INTERVAL '24 hours'
        WHEN 'monthly'       THEN NOW() + INTERVAL '30 days'
        WHEN 'full_package'  THEN NOW() + INTERVAL '365 days'
    END;

    -- 라이선스 키 생성 (예: BAF-홍길동A3X7-X9K2P8)
    v_key := 'BAF-' || REPLACE(p_order_code, '-', '') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));

    -- licenses 테이블에 INSERT (기존 테이블 구조 그대로 사용)
    INSERT INTO public.licenses (key, buyer_name, is_active, expires_at)
    VALUES (v_key, p_buyer_name, TRUE, v_expires_at);

    RETURN v_key;
END;
$$;

-- ⚠️ anon/authenticated에게 GRANT 하지 않음!
-- service_role은 기본적으로 모든 함수 실행 가능
