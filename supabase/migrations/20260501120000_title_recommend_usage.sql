-- 제목 추천 무료 체험 사용 횟수 추적 테이블
CREATE TABLE IF NOT EXISTS public.title_recommend_usage (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip TEXT NOT NULL UNIQUE,
    count INTEGER NOT NULL DEFAULT 0,
    last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화 (직접 접근 차단, Edge Function이 service_role로 접근)
ALTER TABLE public.title_recommend_usage ENABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_title_recommend_usage_ip ON public.title_recommend_usage(ip);

COMMENT ON TABLE public.title_recommend_usage IS '랜딩페이지 제목 추천 무료 체험 IP별 사용 횟수 추적';
