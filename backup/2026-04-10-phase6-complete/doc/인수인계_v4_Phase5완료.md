# BlogAutoFriends 인수인계 v4
## Phase 5 완료 → Phase 6부터 이어서

**작성일**: 2026-04-10
**이전 대화**: Phase 1~5 완료 (설계 대화창에서 단계별 검수하며 진행)
**다음 대화**: Phase 6부터 진행할 새 대화창
**작업자**: 사장님(jsrb0) + Claude Code + 설계 대화창 Claude

---

## 🎯 새 대화창 Claude에게 전달할 첫 메시지

> "BlogAutoFriends 랜딩페이지 백엔드 연동 작업을 이어서 진행할 거야. 이전 대화창에서 Phase 1~5까지 끝냈고, 이 인수인계 문서로 맥락 잡아줘. 그리고 Phase 6부터 같이 진행하자."

이 문서 + 다음 4개 파일을 같이 첨부:
1. `인수인계_v4_Phase5완료.md` (이 파일)
2. `인수인계_v3_FINAL.md` (원본 마스터 문서)
3. `BlogAutoFriends_백엔드_연동_가이드.md` (Phase 1~5 전체 진행 로그)
4. (선택) `구현_가이드.md` (프론트엔드 디자인 참고)

---

## 📌 1줄 요약

랜딩페이지(`blog.pluscoach.co.kr`) 폼 → Supabase orders 저장 → Database Trigger → Edge Function → 카카오톡 + 텔레그램 + Resend 이메일 3중 알림까지 **실전 테스트 통과**. Phase 6(무료체험 자동화) → Phase 7(법적 페이지) → Phase 8(GitHub Pages 배포 + 도메인) → Phase 9(최종 테스트) 남음.

---

## 1. 현재 시스템 상태 (Phase 5까지 작동 중)

### 작동 흐름
```
[로컬 브라우저: index.html]
  ↓ submitForm() → supabaseClient.rpc('create_order', {...})
[Supabase 프로젝트: egwmkpplnzypkbedasrs]
  ↓ orders INSERT
  ↓ Database Trigger: on_order_inserted
  ↓ pg_net.http_post → Vault에서 service_role_key 꺼내서 Bearer 토큰
[Edge Function: on-new-order]
  ↓ Promise.allSettled
  ├→ 카카오톡 "나에게 보내기" (kakao_tokens 테이블에서 토큰 읽기, 만료 5분 전이면 자동 refresh)
  ├→ 텔레그램 봇 sendMessage
  └→ Resend 이메일 (noreply@blog.pluscoach.co.kr)
```

### 검증 완료된 것
- ✅ 폼 제출 → orders 테이블 INSERT 정상 (id, name, email, plan, ip, user_agent, order_code 모두 저장)
- ✅ 무료체험 중복 차단 정상 (한글 에러 메시지)
- ✅ 유료 플랜 결제 모달 정상
- ✅ 카카오톡 알림 도착 (사장님 본인 카톡)
- ✅ 텔레그램 알림 도착
- ✅ Resend 이메일 도착 (`noreply@blog.pluscoach.co.kr`)
- ✅ Resend 도메인 인증 Verified
- ✅ licenses 테이블 9개 컬럼 원본 그대로 (건드리지 않음)

---

## 2. 핵심 환경 정보

### 운영 Supabase
- **Project Ref**: `egwmkpplnzypkbedasrs`
- **URL**: `https://egwmkpplnzypkbedasrs.supabase.co`
- **소유 계정**: `cotrader77@gmail.com` (조직: `cotrader77-dev's Org`)
- **프로젝트 표시명**: `블로그 백포테스트용`
- ⚠️ v3 인수인계 문서엔 `lsykymwqzlypnichhids`로 적혀있는데 그건 옛날 프로젝트. 무시.

### 로컬 리포 경로
```
C:\Users\jsrb0\Documents\GitHub\blogautopage
```

### 현재 파일 구조
```
blogautopage/
├── index.html                 # 랜딩페이지 (1407줄)
├── assets/
│   ├── css/main.css          # 78줄
│   └── js/
│       ├── config.js         # Supabase URL + anon key 입력 완료
│       ├── main.js           # UI 로직
│       └── form.js           # create_order RPC 호출
├── supabase/
│   ├── config.toml           # [functions.on-new-order] verify_jwt = false
│   ├── migrations/
│   │   ├── 20260409000100_orders_table.sql
│   │   ├── 20260409000200_create_order_rpc.sql
│   │   ├── 20260409000300_create_license_rpc.sql
│   │   ├── 20260409000400_kakao_tokens.sql
│   │   └── 20260409000500_notify_trigger.sql
│   └── functions/
│       ├── on-new-order/
│       │   └── index.ts      # Promise.allSettled로 3중 발송
│       └── _shared/
│           ├── kakao.ts      # 토큰 자동 갱신 로직 포함
│           ├── telegram.ts
│           └── resend.ts
├── docs/
│   ├── 인수인계_v3_FINAL.md
│   ├── 인수인계_v4_Phase5완료.md  # ← 이 파일
│   ├── BlogAutoFriends_백엔드_연동_가이드.md
│   ├── 사전준비_체크리스트_FINAL.md
│   ├── Claude_Code_시작_프롬프트_FINAL.md
│   └── 진행상황.md
└── (제민나이3.html, 설계가이드.md 등)
```

### Supabase DB 테이블
- `licenses` — 기존, **절대 안 건드림**
- `orders` — 신규
- `kakao_tokens` — 신규, id=1 단일 행, 카카오 토큰 저장 완료

### Supabase RPC
- `verify_and_activate`, `update_session`, `clear_session` — 기존 (anon)
- `create_order` — 신규 (anon, 무료체험 중복 체크 + order_code 자동 생성)
- `create_license` — 신규 (service_role only, Phase 6에서 호출 예정)
- `notify_new_order` — Trigger 함수 (Vault에서 service_role_key 읽음)
- `handle_updated_at` — Trigger 함수

### Supabase Vault
- `name='service_role_key'` 저장 완료, Trigger에서 사용 중

### Edge Function
- `on-new-order` 배포 완료, `--no-verify-jwt` 적용
- URL: `https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/on-new-order`

### Edge Function Secrets (등록 완료)
- `KAKAO_REST_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL=noreply@blog.pluscoach.co.kr`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (자동 주입)

### 도메인 / DNS (카페24)
- 메인 도메인: `pluscoach.co.kr` (기존 자동매매 페이지 → GitHub Pages IP)
- 작업 도메인: `blog.pluscoach.co.kr` (서브도메인, 비용 0원)
- 추가된 DNS 레코드 (모두 `blog.` 서브도메인 한정):
  - **DKIM (TXT)**: `resend._domainkey.blog` → `p=MIGfMA0G...`
  - **MX**: `send.blog` → `feedback-smtp.ap-northeast-1.amazonses.com` (priority 10)
  - **SPF (TXT)**: `send.blog` → `v=spf1 include:amazonses.com ~all`
  - **DMARC (TXT)**: `_dmarc.blog` → `v=DMARC1; p=none;`
- ⚠️ Phase 8에서 추가 예정: **CNAME** `blog` → `jsrb0.github.io`

### 카카오 앱
- 앱 이름: `블로그 자동화` (ID: 1427981, 비즈 앱 전환됨)
- 카카오 로그인 활성화 ON
- talk_message 동의 항목: 선택 동의
- Redirect URI: `https://localhost:3000/oauth/callback`
- ⚠️ 두 번째 앱 "블로그 솔루션"(1427997)이 실수로 만들어짐. 사용 안 함, 나중에 삭제.

---

## 3. 사전 준비물 체크 상태

| # | 항목 | 상태 |
|---|---|---|
| 1 | Supabase CLI 설치 (v2.84.2) | ✅ |
| 2 | Supabase DB 비밀번호 (Reset 후 메모) | ✅ |
| 3 | Kakao Developers 앱 등록 | ✅ |
| 4 | Kakao 초기 토큰 발급 + DB 저장 | ✅ |
| 5 | 텔레그램 봇 생성 | ✅ |
| 6 | 텔레그램 chat_id 확인 | ✅ |
| 7 | Resend 계정 + API 키 | ✅ |
| 8 | Resend 도메인 인증 | ✅ Verified |
| 9 | 프로그램 다운로드 링크 | ❌ Phase 6 시작 전 필요 |
| 10 | 카페24 CNAME 레코드 | ❌ Phase 8에서 추가 |

---

## 4. Phase 6~9 작업 계획

### Phase 6 — 무료체험 자동화 (1시간)

**목적**: 무료체험 신청자에게 폼 제출 즉시 인증키 이메일이 자동으로 가게.

**사전 준비**:
- ✅ `create_license` RPC 이미 만들어져 있음 (Phase 3)
- ✅ Resend 이미 작동 중
- ❌ **프로그램 다운로드 URL 결정 필요** (구글 드라이브 공유 링크 권장)

**작업 내용**:
1. `supabase/functions/on-new-order/index.ts`의 무료체험 분기 주석 해제
2. 분기 로직:
   ```
   if (record.plan === 'free_trial') {
     1. supabase.rpc('create_license', { p_buyer_name, p_plan, p_order_code }) 호출
     2. 반환된 라이선스 키를 orders 테이블의 license_key 컬럼에 UPDATE
     3. orders.status를 '발송완료'로 UPDATE
     4. Resend로 인증키 이메일 발송 (다운로드 링크 + 사용법 포함)
   }
   ```
3. `_shared/resend.ts`에 인증키 이메일 템플릿 함수 추가 (`sendLicenseKeyEmail`)
4. Edge Function Secret에 `DOWNLOAD_URL` 추가
5. 재배포: `supabase functions deploy on-new-order --no-verify-jwt`
6. 실전 테스트: 본인 이메일로 무료체험 신청 → 인증키 이메일 도착 + licenses 테이블에 새 row 확인

**검증 포인트**:
- 무료체험 신청 1분 안에 인증키 이메일 도착
- 인증키로 실제 프로그램 정상 작동
- expires_at이 현재 시간 + 24시간으로 설정됨
- orders 테이블의 license_key 컬럼에 발급된 키 저장됨

### Phase 7 — 사업자 푸터 + 법적 페이지 (1~2시간)

**목적**: 전자상거래법 준수.

**작업**:
1. `index.html`의 푸터 교체:
   - 상호: 제이에스코퍼레이션
   - 대표자: 오준석
   - 사업자등록번호: 850-38-01085
   - 통신판매업 신고번호: 제 2023-서울강동-1311호
   - 사업장 주소: 서울특별시 관악구 남부순환로 1921-1, 401-A4호
   - 이메일: (사장님이 결정 필요)
2. `privacy.html` 생성 (개인정보처리방침)
3. `terms.html` 생성 (이용약관)
4. `refund.html` 생성 (환불규정 — "인증키 발급 후 환불 불가" 등)
5. `assets/css/legal.css` 공통 스타일
6. 푸터에 3개 페이지 링크 + "← 메인으로" 링크

⚠️ 법적 페이지 내용은 일단 플레이스홀더 → 추후 변호사 검토 권장.

### Phase 8 — GitHub Pages 배포 + 커스텀 도메인 (1시간)

**작업**:
1. `.gitignore` 확인 (`supabase/.env`, `supabase/.temp/` 포함)
2. Git commit + push
3. GitHub 리포 → Settings → Pages → Source: main 브랜치 / 루트
4. 임시 URL 동작 확인 (`https://jsrb0.github.io/blogautopage/`)
5. **카페24 DNS 관리 → CNAME 추가**:
   - 타입: CNAME
   - 호스트: `blog`
   - 값: `jsrb0.github.io`
6. GitHub Pages → Custom domain: `blog.pluscoach.co.kr` 입력 → 저장
7. DNS 전파 10~30분 대기
8. Enforce HTTPS 체크
9. `https://blog.pluscoach.co.kr` 접속 확인

⚠️ 기존 `pluscoach.co.kr` 루트 도메인 레코드 절대 건드리지 말 것.

### Phase 9 — 실전 테스트 (30분)

**시나리오**:
1. `https://blog.pluscoach.co.kr` 접속
2. 본인 이메일로 무료체험 신청
   - [ ] 카카오톡 알림
   - [ ] 텔레그램 알림
   - [ ] 접수 확인 이메일
   - [ ] 인증키 이메일
3. 인증키로 프로그램 실제 실행 테스트
4. 본인 이메일로 유료 플랜 신청
   - [ ] 카카오톡/텔레그램 알림
   - [ ] 결제 안내 이메일
5. Supabase Dashboard에서 orders 2건 확인

---

## 5. 보안 정리 작업 (Phase 6 끝나고 즉시)

⚠️ **이전 대화창에서 다음 키들이 노출되었으니 반드시 재발급할 것**:

| 키 | 재발급 방법 |
|---|---|
| Kakao REST API 키 | Kakao Developers → 플랫폼 키 → REST API 키 → 코드 재발급 |
| Kakao Client Secret | Kakao Developers → REST API 키 상세 → 클라이언트 시크릿 → 코드 재발급 |
| Kakao access_token + refresh_token | 새 키로 토큰 재발급 후 `kakao_tokens` 테이블 UPDATE |
| Telegram Bot Token | `@BotFather → /revoke` → 새 토큰 받기 |

재발급 후:
1. Supabase Edge Function Secrets 5개 전부 새 값으로 교체
2. `kakao_tokens` 테이블 UPDATE (새 access_token + refresh_token + expires_at)
3. Edge Function 재배포 불필요 (Secrets만 바뀌면 즉시 반영)
4. 실전 테스트 1회 (3중 알림 정상 도착 확인)

---

## 6. 가드레일 (절대 어기면 안 되는 것)

1. **`licenses` 테이블 건드리지 말 것** — 기존 프로그램 라이선스가 의존
2. **`pluscoach.co.kr` 루트 도메인 DNS 건드리지 말 것** — 기존 자동매매 페이지가 의존
3. **DNS 추가는 `blog.` 서브도메인 관련만**
4. **`service_role_key`는 Edge Function Secrets + Supabase Vault에만**
5. **Database Trigger의 `net.http_post`에 `Authorization` 헤더 필수**
6. **Edge Function 배포 시 `--no-verify-jwt` 플래그 필수**
7. **운영 DB에 `supabase db push` 전 사장님 검수 필수**
8. **anon key는 RLS + 정책 0개로 보호 중 — 정책 추가하지 말 것**

---

## 7. 발생했던 주요 함정 (Phase 6 이후에도 주의)

1. **Supabase CLI 계정 불일치** — 브라우저에 로그인된 계정이 프로젝트 소유 계정인지 확인 필수
2. **마이그레이션 파일명 동일 시 충돌** — 14자리 고유 타임스탬프 사용
3. **카카오 Redirect URI 위치** — 옛날 메뉴 아니고 **REST API 키 상세 페이지 안**
4. **Vault `current_setting` 방식 동작 안 함** — `vault.create_secret` + `vault.decrypted_secrets` 사용
5. **Resend SPF는 카페24 SPF 관리 메뉴 사용 불가** — TXT 관리에서 처리
6. **카카오 토큰 만료**: access_token 6시간, refresh_token 60일. 60일 동안 한 번도 호출 안 하면 refresh도 만료 → 재발급 필요

---

## 8. 빠른 디버깅 SQL 모음

### 모든 테이블 + 컬럼 확인
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('licenses', 'orders', 'kakao_tokens');
```

### 최근 주문 5건
```sql
SELECT id, name, email, plan, status, license_key, created_at 
FROM orders ORDER BY created_at DESC LIMIT 5;
```

### 카카오 토큰 상태
```sql
SELECT id, access_token_expires_at, updated_at FROM kakao_tokens;
```

### 라이선스 발급 내역 (Phase 6 이후)
```sql
SELECT id, key, buyer_name, expires_at, created_at 
FROM licenses ORDER BY created_at DESC LIMIT 10;
```

### 테스트 데이터 정리
```sql
DELETE FROM orders WHERE email LIKE '%test%';
```

---

## 9. 새 대화창에서 첫 작업

1. **이 문서 + 인수인계_v3_FINAL.md + BlogAutoFriends_백엔드_연동_가이드.md 첨부**
2. 위 "🎯 새 대화창 Claude에게 전달할 첫 메시지" 그대로 입력
3. Claude가 문서 읽고 현재 상태 파악 → "Phase 6부터 시작하면 되나요?" 같은 확인 질문 받음
4. 사장님: "응. 먼저 프로그램 다운로드 링크부터 정해야 하니까 그것부터 안내해줘"
5. Claude Code도 같이 켜서 동일하게 진행:
   ```
   docs/인수인계_v4_Phase5완료.md 읽고 현재 상태 파악해줘.
   Phase 6부터 진행할 거야. 일단 대기.
   ```

---

**작성자**: 설계 대화창 Claude
**상태**: Phase 5 완료, Phase 6 진행 대기
**다음 마일스톤**: 무료체험 자동 인증키 발급
