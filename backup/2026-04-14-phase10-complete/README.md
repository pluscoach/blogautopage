# Phase 10 완료 시점 전체 백업 (2026-04-14)

## 백업 시점 상태
- **Phase 1~10 전부 완료**, 실운영 중
- **라이브 URL:** https://blog.pluscoach.co.kr
- **Supabase 프로젝트:** egwmkpplnzypkbedasrs

## 플랜 구성 (이 시점)
| 플랜 | planCode | 금액 |
|------|----------|------|
| 무료체험 | free_trial | 0원 |
| 1개월 | monthly | 39,000원 |
| 풀 패키지 | full_package | 69,000원 |

## 포함 파일 (76개)
- 프론트엔드: index.html, assets/css/*, assets/js/*
- 법적 페이지: privacy.html, terms.html, refund.html
- Supabase: config.toml, migrations/5개, functions/7개
- 문서: doc/* 전체

## 복원 방법

### 1. 프론트엔드 복원 (GitHub Pages)
```bash
# 백업 폴더에서 원본 위치로 복사
cp backup/2026-04-14-phase10-complete/index.html ./index.html
cp backup/2026-04-14-phase10-complete/assets/js/config.js ./assets/js/config.js
cp backup/2026-04-14-phase10-complete/assets/js/form.js ./assets/js/form.js
cp backup/2026-04-14-phase10-complete/assets/js/payment.js ./assets/js/payment.js
cp backup/2026-04-14-phase10-complete/assets/js/main.js ./assets/js/main.js
cp backup/2026-04-14-phase10-complete/assets/css/main.css ./assets/css/main.css
git add . && git commit -m "rollback: Phase 10 시점으로 복원" && git push
```

### 2. Edge Function 복원
```bash
cp -r backup/2026-04-14-phase10-complete/supabase/functions/* ./supabase/functions/
supabase functions deploy on-new-order --no-verify-jwt
supabase functions deploy payapp-webhook --no-verify-jwt
```

### 3. DB RPC 복원 (필요 시)
Supabase SQL Editor에서 아래 파일 내용을 직접 실행:
- `supabase/migrations/20260409000200_create_order_rpc.sql`
- `supabase/migrations/20260409000300_create_license_rpc.sql`

### 4. Edge Function Secrets (이 시점 기준 11개)
```
KAKAO_REST_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
RESEND_API_KEY, RESEND_FROM_EMAIL, DOWNLOAD_URL_FREE, DOWNLOAD_URL_PAID,
PAYAPP_USERID, PAYAPP_LINKKEY, PAYAPP_VALUE, SUPABASE_DB_URL
+ 자동 주입: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

## 백업 이유
평생 소유권 플랜 추가 + 무료체험 숨김 + 가격 변경 작업 전 안전 백업
