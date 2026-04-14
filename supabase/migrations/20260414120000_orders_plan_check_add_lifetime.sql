-- Phase 10.5: orders.plan CHECK constraint에 lifetime 추가
-- 기존 허용값: free_trial, monthly, full_package
-- 추가: lifetime
-- 기존 orders 행에 영향 없음 (모두 기존 허용값으로 유지)

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_plan_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_plan_check
  CHECK (plan IN ('free_trial', 'monthly', 'full_package', 'lifetime'));
