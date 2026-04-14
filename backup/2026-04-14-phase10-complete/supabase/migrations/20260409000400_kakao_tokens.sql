-- ============================================
-- Migration 004: kakao_tokens 테이블 (카카오 토큰 관리)
-- ============================================

CREATE TABLE public.kakao_tokens (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- 단일 행 제약
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화 (정책 없음 = anon 접근 불가, service_role만 접근)
ALTER TABLE public.kakao_tokens ENABLE ROW LEVEL SECURITY;
