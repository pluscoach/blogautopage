-- notify_new_order() Trigger 함수 재정의
-- 목적: Trigger가 Edge Function에 POST 보낼 때 payload에 phone 필드 포함
-- 배경: Step 1에서 orders.phone 컬럼 추가했으나, Trigger 함수는 명시적 필드 나열 방식이라
--       payload에 phone이 자동 포함되지 않아 on-new-order에서 record.phone = undefined 발생.
--       결과: 사장님 텔레그램 무통장 알림에 "전화: (미입력)" 표시되던 버그 수정.
--
-- 변경점: jsonb_build_object에 'phone', NEW.phone 한 줄만 추가.
-- 나머지 로직(Vault 키 조회, http_post URL, 헤더 구성 등)은 100% 동일.
-- CREATE TRIGGER 재실행 없음 — 동일 시그니처 REPLACE로 기존 Trigger 연결 유지.

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER AS $$
DECLARE
    v_service_key TEXT;
BEGIN
    -- Vault에서 service_role_key 꺼내기
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

    PERFORM net.http_post(
        url := 'https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/on-new-order',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
            'record', jsonb_build_object(
                'id', NEW.id,
                'name', NEW.name,
                'email', NEW.email,
                'phone', NEW.phone,           -- 🆕 추가 (Step 4.5)
                'plan', NEW.plan,
                'amount', NEW.amount,
                'status', NEW.status,
                'order_code', NEW.order_code,
                'ip', NEW.ip,
                'user_agent', NEW.user_agent,
                'created_at', NEW.created_at
            )
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_new_order() IS
  'AFTER INSERT Trigger 함수. orders INSERT 시 Edge Function(on-new-order) 호출. Step 4.5에서 phone 필드 추가.';
