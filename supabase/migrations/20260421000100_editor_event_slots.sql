-- =============================================
-- 에디터 리뷰 이벤트 슬롯 관리 테이블 + RPC
-- 선착순 30명, 다 소진되면 자동 리셋(14명)
-- =============================================

-- 1) 슬롯 카운터 테이블 (단일 행)
CREATE TABLE IF NOT EXISTS public.editor_event_slots (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    remaining INTEGER NOT NULL DEFAULT 14 CHECK (remaining >= 0 AND remaining <= 30),
    total     INTEGER NOT NULL DEFAULT 30,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.editor_event_slots ENABLE ROW LEVEL SECURITY;

-- 초기 데이터 삽입
INSERT INTO public.editor_event_slots (id, remaining, total)
VALUES (1, 14, 30)
ON CONFLICT (id) DO NOTHING;

-- 자동 updated_at 갱신
CREATE OR REPLACE FUNCTION public.update_editor_slots_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_editor_slots_updated
    BEFORE UPDATE ON public.editor_event_slots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_editor_slots_timestamp();

-- 2) 조회 RPC: 남은 슬롯 수 반환 (anon 접근 가능)
CREATE OR REPLACE FUNCTION public.get_editor_event_slots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    SELECT remaining INTO v_remaining
    FROM public.editor_event_slots
    WHERE id = 1;

    RETURN COALESCE(v_remaining, 14);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_editor_event_slots() TO anon;
GRANT EXECUTE ON FUNCTION public.get_editor_event_slots() TO authenticated;

-- 3) 슬롯 차감 RPC (service_role 전용 — 사장님이 수동 또는 관리용)
--    remaining이 0이 되면 자동으로 14로 리셋
CREATE OR REPLACE FUNCTION public.use_editor_event_slot()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    -- 현재 남은 수 조회 (행 잠금)
    SELECT remaining INTO v_remaining
    FROM public.editor_event_slots
    WHERE id = 1
    FOR UPDATE;

    IF v_remaining IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', '슬롯 테이블이 초기화되지 않았습니다.');
    END IF;

    IF v_remaining <= 1 THEN
        -- 마지막 슬롯 사용 후 14명으로 리셋
        UPDATE public.editor_event_slots
        SET remaining = 14
        WHERE id = 1;

        RETURN json_build_object('success', TRUE, 'remaining', 14, 'reset', TRUE);
    ELSE
        UPDATE public.editor_event_slots
        SET remaining = remaining - 1
        WHERE id = 1;

        RETURN json_build_object('success', TRUE, 'remaining', v_remaining - 1, 'reset', FALSE);
    END IF;
END;
$$;

-- service_role만 사용 (GRANT 없음 = anon 접근 불가)
