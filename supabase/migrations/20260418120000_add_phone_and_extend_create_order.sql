-- ============================================
-- Migration: orders.phone 컬럼 추가 + create_order RPC 7파라미터 확장
-- 목적: 무통장 입금 임시 결제 구조 (Step 1 — DB만)
-- ============================================

-- Step 1: orders 테이블에 phone 컬럼 추가
-- NULLABLE + DEFAULT '' 로 기존 row 호환 + 페이앱 복귀 시 재활용 가능
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

COMMENT ON COLUMN public.orders.phone IS '고객 연락처 (무통장 입금 확인용, 페이앱 모드에서는 선택)';

-- Step 2: create_order RPC 재정의 (7파라미터, p_phone 맨 뒤 optional)
-- 기존 호출부는 named parameter 방식이라 p_phone 생략해도 정상 작동
-- ※ 로직은 기존 6파라미터 원본(20260409000200)과 100% 동일, phone INSERT만 추가
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

-- Step 3: 기존 6파라미터 함수 삭제 (새 7파라미터만 남김)
-- CREATE OR REPLACE는 시그니처 다르면 새 함수 생성하므로 명시적으로 구버전 DROP
DROP FUNCTION IF EXISTS public.create_order(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT);

-- Step 4: 새 7파라미터 시그니처에 GRANT
REVOKE ALL ON FUNCTION public.create_order(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_order(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) IS
  '주문 생성 RPC — 무료체험 중복 체크 + order_code 생성 (7파라미터, p_phone optional)';
