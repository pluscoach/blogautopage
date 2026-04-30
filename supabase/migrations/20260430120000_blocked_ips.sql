-- 무료체험 IP 차단 테이블
CREATE TABLE IF NOT EXISTS blocked_ips (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT '무료체험 반복 신청',
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화 (service_role만 접근)
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
