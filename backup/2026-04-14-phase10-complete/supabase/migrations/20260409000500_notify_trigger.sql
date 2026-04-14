-- ============================================
-- Migration 005: Database Trigger — orders INSERT 시 Edge Function 호출
-- ============================================
-- 사전 조건: 
-- 1. pg_net 확장 활성화 (이 파일에서 수행)
-- 2. vault 확장 활성화 (이 파일에서 수행)
-- 3. Vault에 service_role_key 저장 (Supabase Dashboard → Project Settings → Vault)
--    OR SQL Editor에서:
--    SELECT vault.create_secret('실제_SERVICE_ROLE_KEY', 'service_role_key');

-- 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 트리거 함수: 새 주문 시 Edge Function 호출
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

-- orders 테이블에 INSERT 트리거 연결
CREATE TRIGGER on_order_inserted
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_order();