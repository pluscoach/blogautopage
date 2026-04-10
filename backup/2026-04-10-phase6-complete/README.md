# 백업: 2026-04-10 Phase 6 완료 시점

## 백업 시점
- **날짜:** 2026-04-10
- **상태:** Phase 1~6 완료 (무료체험 자동 인증키 발급까지)
- **이유:** 구조 변경 작업 전 전체 스냅샷

## 작동 상태 요약
- 랜딩페이지 폼 → Supabase orders INSERT → DB Trigger → Edge Function
- 3중 알림: 카카오톡 + 텔레그램 + Resend 이메일 (실전 테스트 통과)
- 무료체험: 자동 라이선스 발급 + 인증키 이메일 발송

## 복원 방법

### 1. 프론트엔드 복원
이 백업 폴더의 파일들을 프로젝트 루트로 복사:
```
cp index.html ../../
cp assets/css/main.css ../../assets/css/
cp assets/js/*.js ../../assets/js/
```

### 2. Edge Function 복원
```
cp supabase/functions/on-new-order/index.ts ../../supabase/functions/on-new-order/
cp supabase/functions/_shared/*.ts ../../supabase/functions/_shared/
supabase functions deploy on-new-order --no-verify-jwt
```

### 3. DB 스키마 복원
Migration 파일은 `supabase/migrations/` 에 보존.
운영 DB는 이미 적용된 상태이므로, 새 프로젝트에서 복원할 경우:
```
supabase db push
```

### 4. 환경변수 (Edge Function Secrets)
다음 Secrets가 설정되어 있어야 함:
- KAKAO_REST_API_KEY
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID
- RESEND_API_KEY
- RESEND_FROM_EMAIL=noreply@blog.pluscoach.co.kr
- DOWNLOAD_URL_FREE=(구글 드라이브 URL)
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (자동 주입)

### 5. Supabase Vault
```sql
SELECT vault.create_secret('실제_SERVICE_ROLE_KEY', 'service_role_key');
```

### 6. kakao_tokens 테이블
토큰 재발급 후 INSERT 필요 (토큰은 시간 지나면 만료됨)

## 파일 목록
```
backup/2026-04-10-phase6-complete/
├── README.md                          # 이 파일
├── index.html                         # 랜딩페이지 (1407줄)
├── index copy.html                    # 원본 백업
├── .gitignore
├── CLAUDE.md                          # 가드레일
├── assets/
│   ├── css/main.css                   # 통합 CSS
│   └── js/
│       ├── config.js                  # Supabase URL/key + 플랜
│       ├── main.js                    # UI 로직
│       └── form.js                    # RPC 호출
├── supabase/
│   ├── config.toml                    # verify_jwt = false
│   ├── .gitignore
│   ├── migrations/
│   │   ├── 20260409000100_orders_table.sql
│   │   ├── 20260409000200_create_order_rpc.sql
│   │   ├── 20260409000300_create_license_rpc.sql
│   │   ├── 20260409000400_kakao_tokens.sql
│   │   └── 20260409000500_notify_trigger.sql
│   └── functions/
│       ├── on-new-order/index.ts      # 메인 핸들러 (145줄, Phase 6 포함)
│       └── _shared/
│           ├── kakao.ts               # 카카오 알림 (128줄)
│           ├── telegram.ts            # 텔레그램 알림 (42줄)
│           └── resend.ts              # 이메일 알림 (152줄, sendLicenseKeyEmail 포함)
├── doc/                               # 전체 문서
│   ├── 인수인계_v3_FINAL.md
│   ├── 인수인계_v4_Phase5완료.md
│   ├── BlogAutoFriends_백엔드_연동_가이드.md
│   ├── 사전준비_체크리스트_FINAL.md
│   ├── Claude_Code_시작_프롬프트_FINAL.md
│   ├── 구현 가이드.md
│   ├── 구현_과정_가이드.md
│   ├── 자동 결제 프로그램 배포 가이드.md
│   └── 진행상황.md
├── 설계 가이드.md
├── 인수인계_결제자동화(04.07).md
├── 인수인계_추가 정보 및 보안 강화(04.08).md
├── 제민나이3.html
└── 초반후킹.html
```

## 운영 Supabase 정보
- Project Ref: egwmkpplnzypkbedasrs
- URL: https://egwmkpplnzypkbedasrs.supabase.co
- Edge Function: https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/on-new-order
