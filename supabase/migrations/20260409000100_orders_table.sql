-- ============================================
-- Migration 001: orders 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('free_trial', 'monthly', 'full_package')),
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '결제대기',
    ip TEXT,
    user_agent TEXT,
    order_code TEXT UNIQUE,
    license_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화 (정책 없음 = anon 직접 접근 불가, RPC로만 접근)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_orders_updated ON public.orders;
CREATE TRIGGER on_orders_updated
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 인덱스: 이메일 중복 체크 성능
CREATE INDEX IF NOT EXISTS idx_orders_email_plan ON public.orders (email, plan);
