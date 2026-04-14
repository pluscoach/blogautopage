# BlogAutoFriends 랜딩페이지 백엔드 연동 가이드 v3 FINAL
## MVP 버전 — blog.pluscoach.co.kr 기반

**작성일:** 2026-04-09
**이전 문서:** `인수인계_추가_정보_및_보안_강화_04_08_.md` (v2)
**변경 핵심:**
- Supabase 프로젝트 분리 → **통합** (기존 프로그램 Supabase에 orders 테이블만 추가)
- 토스페이먼츠 → **페이앱(PayApp)** (가입비 0원, 심사 대기 중)
- 페이앱 심사 기다리는 동안 **알림 시스템 + 무료체험 자동화 먼저 완성**
- **도메인: `blog.pluscoach.co.kr`** (기존 `pluscoach.co.kr`의 서브도메인, 비용 0원)

---

## 📑 목차

1. [전체 그림](#1-전체-그림)
2. [도메인 구조](#2-도메인-구조)
3. [MVP 범위](#3-mvp-범위)
4. [Supabase 구조 (통합)](#4-supabase-구조-통합)
5. [알림 3중 시스템](#5-알림-3중-시스템)
6. [Phase별 작업 로드맵](#6-phase별-작업-로드맵)
7. [Phase 상세 가이드](#7-phase-상세-가이드)
8. [파일 구조 (최종)](#8-파일-구조-최종)
9. [환경변수 정리](#9-환경변수-정리)
10. [사업자 정보 & 법적 요건](#10-사업자-정보--법적-요건)
11. [주의사항 & 함정](#11-주의사항--함정)
12. [페이앱 승인 후 추가 작업](#12-페이앱-승인-후-추가-작업)

---

## 1. 전체 그림

### 시스템 구성

```
[사용자 브라우저]
    ↓ https://blog.pluscoach.co.kr
[GitHub Pages: 랜딩페이지]
    ↓ create_order RPC
[Supabase 프로젝트 (기존, 통합)]
    ├── licenses 테이블 (프로그램용, 기존 — 안 건드림)
    ├── orders 테이블 (신규 추가)
    ├── kakao_tokens 테이블 (신규, 토큰 관리)
    ├── RPC (anon): create_order
    ├── RPC (service_role): create_license
    └── Database Trigger
         ↓ INSERT 발생 시 자동 호출
[Edge Function: on-new-order]
    ├─→ 📱 사장님 카카오톡 "나에게 보내기"  ⭐ 메인
    ├─→ 💬 사장님 텔레그램 봇               ⭐ 백업
    ├─→ 📧 사용자에게 Resend 이메일 (접수 확인)
    │      └── 발신: noreply@blog.pluscoach.co.kr
    │
    └─→ [무료체험인 경우에만] 자동 분기
         ├─→ create_license RPC 호출
         ├─→ licenses 테이블에 INSERT
         └─→ Resend로 인증키 이메일 발송 → 즉시 사용 가능
```

### 판매 플로우

**무료 체험 (지금 당장 100% 자동):**
```
1. 폼 제출 → 2. orders INSERT → 3. 카톡/텔레그램/이메일 3중 알림
→ 4. 자동 라이선스 발급 → 5. 인증키 이메일 발송 → 6. 프로그램 사용
```

**유료 플랜 (MVP는 수동, 페이앱 승인 후 자동):**
```
1. 폼 제출 → 2. orders INSERT → 3. 카톡/텔레그램 알림
→ 4. 사장님이 카톡 확인 → 5. (수동) 계좌 안내 → 6. (수동) 입금 확인
→ 7. (수동) 라이선스 발급 → 8. 이메일 발송
```

**→ 페이앱 승인 나면 5~8번이 Webhook으로 자동화됨**

---

## 2. 도메인 구조

### 확정 구조

```
pluscoach.co.kr              ← 기존 자동매매 페이지 (그대로, 0% 영향)
blog.pluscoach.co.kr         ← 서이추 랜딩페이지 (신규, 무료 서브도메인)

이메일:
noreply@blog.pluscoach.co.kr ← 자동 발송용 (Resend)
```

### 카페24에서 추가할 DNS 레코드

**서브도메인 연결 (웹사이트용):**
```
타입: CNAME
호스트: blog
값: jsrb0.github.io
```

**Resend 도메인 인증 (이메일용, Phase 5에서 추가):**
- Resend가 Dashboard에서 TXT 레코드 3~4개를 알려줌
- SPF, DKIM, (선택) DMARC
- 이름은 `blog` 서브도메인 기준으로 나옴 (예: `resend._domainkey.blog`)
- **기존 `pluscoach.co.kr` DNS는 0% 건드리지 않음**

### 비용

- `pluscoach.co.kr` 갱신비 (이미 내고 계심, 변동 없음)
- `blog.pluscoach.co.kr` 서브도메인: **0원**
- Resend 무료 플랜: **0원** (월 3,000건)

---

## 3. MVP 범위

### ✅ MVP에 포함되는 것

| 항목 | 상태 | 비고 |
|---|---|---|
| 랜딩페이지 구조 리팩터링 | 필수 | CSS/JS 분리 |
| Supabase CLI 설정 | 필수 | 로컬 → 배포 |
| orders 테이블 + RPC | 필수 | 통합 프로젝트 |
| create_license RPC | 필수 | 무료체험용 + 나중에 페이앱용 |
| 폼 → Supabase 연결 | 필수 | 실제 DB 연동 |
| Kakao Developers 앱 (나에게 보내기) | 필수 | 알림 메인 |
| 텔레그램 봇 | 필수 | 알림 백업 |
| Resend 도메인 인증 | 필수 | `blog.pluscoach.co.kr` |
| Edge Function `on-new-order` | 필수 | 알림 + 무료체험 자동화 |
| 무료체험 100% 자동화 | 필수 | 페이앱 없어도 완전 작동 |
| 사업자 푸터 교체 | 필수 | 법적 요건 |
| 법적 페이지 3개 | 필수 | 개인정보/이용약관/환불 |
| GitHub Pages 배포 + 커스텀 도메인 | 필수 | `blog.pluscoach.co.kr` 연결 |

### ⏸️ MVP 이후 (페이앱 승인 후)

| 항목 | 시점 |
|---|---|
| 페이앱 결제 요청 API 연동 | 승인 후 |
| `payapp-webhook` Edge Function | 승인 후 |
| 유료 플랜 자동 라이선스 발급 | 승인 후 |
| 결제 모달 페이앱 버튼 연결 | 승인 후 |

### 📅 예상 시간

| Phase | 시간 |
|---|---|
| Phase 1. 구조 리팩터링 | 1~2h |
| Phase 2. Supabase CLI + 기존 프로젝트 link | 30m |
| Phase 3. orders 테이블 + RPC | 1h |
| Phase 4. 폼 연결 | 1h |
| Phase 5. 알림 3중 Edge Function | 2~3h |
| Phase 6. 무료체험 자동화 | 1h |
| Phase 7. 사업자 푸터 + 법적 페이지 | 1~2h |
| Phase 8. GitHub Pages 배포 + 도메인 연결 | 1h |
| Phase 9. 실전 테스트 | 30m |
| **합계** | **약 9~12h** |

---

## 4. Supabase 구조 (통합)

### 기존 프로젝트 하나에 전부 통합

**URL:** `https://egwmkpplnzypkbedasrs.supabase.co` (운영, 기존)

### 테이블 구조

```
[기존 Supabase 프로젝트]
│
├── licenses 테이블 (기존, 절대 건드리지 않음)
│   ├── id, key, buyer_name, is_active, expires_at
│   ├── last_ip, last_active_at, last_machine_id, created_at
│   └── RLS 활성화됨 (RPC로만 접근)
│
├── orders 테이블 (신규 추가)
│   ├── id, name, email, plan, amount, status
│   ├── ip, user_agent, order_code, license_key
│   └── created_at, updated_at
│
└── kakao_tokens 테이블 (신규 추가)
    ├── id (단일 행 제약)
    ├── access_token, refresh_token
    └── access_token_expires_at
```

### RPC 함수 목록

**anon 호출 가능 (프론트엔드):**
- `verify_and_activate(key, machine_id)` ← 프로그램용 (기존)
- `update_session(key, machine_id)` ← 프로그램용 (기존)
- `clear_session(key)` ← 프로그램용 (기존)
- `create_order(name, email, plan, amount, ip, user_agent)` ← 랜딩페이지용 (신규)

**service_role만 호출 (Edge Function에서만):**
- `create_license(buyer_name, plan, order_code)` ← 라이선스 발급 (신규)

### 보안 원칙

- licenses 테이블 RLS는 이미 켜져 있음
- orders 테이블도 RLS 켜고 RPC로만 접근
- kakao_tokens 테이블도 RLS 켜고 service_role만 접근
- anon key가 털려도 할 수 있는 건 RPC 호출뿐
- `create_license`는 anon에게 GRANT 안 함 → Edge Function만 호출 가능

---

## 5. 알림 3중 시스템

### 왜 3중인가?

하나 실패해도 사장님이 주문을 놓치지 않도록.

### 구성

| 알림 | 대상 | 역할 | 비용 | 심사 |
|---|---|---|---|---|
| **카카오톡 "나에게 보내기"** | 사장님 본인 카톡 | ⭐ 메인 | 무료 | 없음 |
| **텔레그램 봇** | 사장님 텔레그램 | ⭐ 백업 | 무료 | 없음 |
| **Resend 이메일** | 사용자 | 접수 확인 | 무료 3000건/월 | 없음 |

### 카카오톡 "나에게 보내기" 상세

**작동 방식:**
- Kakao Developers에 앱 등록
- OAuth로 사장님 카카오 로그인 → access_token 발급
- `https://kapi.kakao.com/v2/api/talk/memo/default/send` 호출
- 사장님 본인 카톡 "나와의 채팅"에 메시지 도착

**중요: 토큰 갱신**
- `access_token` 유효기간: 6시간
- `refresh_token` 유효기간: 2개월
- Edge Function에서 **자동 갱신 로직** 필수
- `kakao_tokens` 테이블에 토큰 저장 + 만료 임박 시 자동 refresh

### 텔레그램 봇 상세

**작동 방식:**
- BotFather에서 봇 생성 → 토큰 발급
- `@userinfobot`으로 chat_id 확인
- `https://api.telegram.org/bot{TOKEN}/sendMessage` 호출

**설정이 압도적으로 단순** — 토큰 갱신 같은 것도 없음. 그래서 백업으로 완벽.

### Resend 이메일 상세

**작동 방식:**
- Resend 가입 → API 키 발급
- **도메인 인증**: `blog.pluscoach.co.kr` 등록 → 카페24에 TXT 레코드 추가
- 인증 완료 후 `noreply@blog.pluscoach.co.kr`로 **모든 사용자에게 발송 가능**
- `https://api.resend.com/emails` 호출
- 무료 3,000건/월

### 알림 메시지 템플릿

**카카오톡/텔레그램 (사장님):**
```
🔔 새 주문이 들어왔습니다

👤 이름: 홍길동
📧 이메일: hong@example.com
📦 플랜: 풀 패키지 (59,000원)
🎫 주문 코드: 홍길동-A3X7
🌐 IP: 123.45.67.89
⏰ 시간: 2026-04-09 14:32

[주문 ID: 123]
```

**Resend 이메일 (사용자 — 접수 확인, 유료 플랜):**
```
발신: BlogAutoFriends <noreply@blog.pluscoach.co.kr>
제목: [BlogAutoFriends] 주문이 접수되었습니다

안녕하세요, 홍길동님

BlogAutoFriends에 관심 가져주셔서 감사합니다.

📦 주문 정보
- 플랜: 풀 패키지 (59,000원)
- 주문 코드: 홍길동-A3X7

💳 결제 안내
곧 담당자가 연락드려 결제 안내를 도와드리겠습니다.
(영업일 기준 1시간 이내)

문의: 카카오톡 오픈채팅 https://open.kakao.com/me/pluscoach
```

**Resend 이메일 (사용자 — 무료체험 인증키):**
```
발신: BlogAutoFriends <noreply@blog.pluscoach.co.kr>
제목: [BlogAutoFriends] 무료 체험 인증키 발급 안내

안녕하세요, 홍길동님

무료 체험을 신청해주셔서 감사합니다.
바로 사용하실 수 있도록 인증키를 발급해드렸어요.

🎫 인증키: BAF-홍길동A3X7-X9K2P8
⏰ 유효 기간: 24시간

📥 프로그램 다운로드
[다운로드 링크]

💡 사용 방법
1. 프로그램 다운로드 및 압축 해제
2. run.bat 실행
3. 인증키 입력란에 위 인증키 붙여넣기

문의: 카카오톡 오픈채팅
```

---

## 6. Phase별 작업 로드맵

### Phase 1 — 구조 리팩터링 (1~2h)
단일 index.html의 CSS/JS를 외부 파일로 분리. 기능 변경 X, 구조만 정리.

### Phase 2 — Supabase CLI 설정 (30m)
로컬에 CLI 설치, 기존 프로젝트에 link, supabase 폴더 초기화.

### Phase 3 — DB 스키마 (1h)
orders 테이블 + kakao_tokens 테이블 + create_order RPC + create_license RPC + Database Trigger.

### Phase 4 — 폼 연결 (1h)
config.js에 실제 Supabase 정보 입력, submitForm을 RPC 호출로 교체.

### Phase 5 — 알림 3중 Edge Function (2~3h)
`on-new-order` Edge Function 작성. 카카오 + 텔레그램 + Resend 동시 발송.
**이 Phase에서 Resend 도메인 인증도 진행.**

### Phase 6 — 무료체험 자동화 (1h)
같은 Edge Function 안에서 무료체험이면 create_license 자동 호출 + 인증키 이메일.

### Phase 7 — 사업자 푸터 + 법적 페이지 (1~2h)
전자상거래법 필수 정보, privacy/terms/refund 페이지.

### Phase 8 — GitHub Pages 배포 + 커스텀 도메인 (1h)
리포 push, Pages 활성화, `blog.pluscoach.co.kr` 연결.
**카페24에서 CNAME 레코드 추가.**

### Phase 9 — 실전 테스트 (30m)
실제 폼 제출 → 알림 3개 확인 → 무료체험 자동 발급 확인.

---

## 7. Phase 상세 가이드

### Phase 1 — 구조 리팩터링 (1~2h)

**목적:** 1724줄짜리 단일 index.html을 유지보수 가능한 구조로 분리.

**작업:**

1. 폴더 구조 생성:
   ```
   blogautopage/
   ├── assets/
   │   ├── css/
   │   │   └── main.css
   │   └── js/
   │       ├── config.js
   │       ├── main.js
   │       └── form.js
   ```

2. `<style>` 블록 9개 모두 → `assets/css/main.css`로 이관 (그대로 복붙 후 중복 제거)

3. 메인 `<script>` 블록 (1474~1722줄) → `assets/js/main.js`로 이관
   - Supabase 관련 부분은 빼고 Phase 4에서 form.js로 따로 작성

4. `assets/js/config.js` 생성 (빈 구조):
   ```javascript
   window.APP_CONFIG = {
     supabase: { url: '', anonKey: '' },
     plans: {
       free: { plan: 'free_trial', amount: 0 },
       '1month': { plan: 'monthly', amount: 39000 },
       full: { plan: 'full_package', amount: 59000 }
     },
     kakao: {
       channelUrl: 'https://open.kakao.com/me/pluscoach'
     }
   };
   ```

5. `index.html` 정리:
   - 모든 `<style>` 삭제 → `<link rel="stylesheet" href="assets/css/main.css">`
   - 모든 `<script>` (Tailwind 제외) 삭제 → 하단에 로드 순서로 추가:
     ```html
     <script src="assets/js/config.js"></script>
     <script src="assets/js/main.js"></script>
     <script src="assets/js/form.js"></script>
     ```

6. 로컬 브라우저로 확인 → 디자인 안 깨졌는지 검증

**체크포인트 (사장님 검수):**
- [ ] 디자인이 기존과 동일한가
- [ ] 모든 애니메이션 작동하는가 (히어로 타이핑, STEP 그래프 등)
- [ ] 폼 제출 시 에러 없이 기존 플레이스홀더 동작

---

### Phase 2 — Supabase CLI 설정 (30m)

**목적:** 로컬에서 Supabase를 관리하고 배포할 수 있는 환경 구축.

**작업:**

1. Supabase CLI 설치 (사전준비 체크리스트 참조):
   ```bash
   scoop install supabase
   # 또는
   npm install -g supabase
   ```

2. 로그인:
   ```bash
   supabase login
   ```

3. 프로젝트 초기화:
   ```bash
   cd C:\Users\jsrb0\Documents\GitHub\blogautopage
   supabase init
   ```

4. 기존 운영 프로젝트에 link:
   ```bash
   supabase link --project-ref egwmkpplnzypkbedasrs
   ```

5. `supabase/config.toml` 확인 + 수정:
   ```toml
   [functions.on-new-order]
   verify_jwt = false  # Database Trigger에서 호출하기 위해
   ```

**체크포인트:**
- [ ] `supabase/` 폴더가 생성됨
- [ ] `supabase link` 성공
- [ ] 기존 스키마 확인 가능 (`supabase db pull` 등)

**⚠️ 주의:**
- `.gitignore`에 `supabase/.env` 반드시 추가
- DB 비밀번호는 절대 커밋하지 말 것
- 이미 운영되는 프로젝트이므로 `supabase db push`는 신중하게

---

### Phase 3 — DB 스키마 (1h)

**목적:** orders 테이블, kakao_tokens 테이블, RPC 함수들, Trigger 생성.

**작업:**

1. `supabase/migrations/20260409_001_orders_table.sql` — orders 테이블 생성 + RLS 활성화 + updated_at 트리거

2. `supabase/migrations/20260409_002_create_order_rpc.sql` — create_order RPC 함수 (이메일 중복 검증, order_code 자동 생성, anon GRANT)

3. `supabase/migrations/20260409_003_create_license_rpc.sql` — create_license RPC 함수 (플랜별 만료일 계산, service_role 전용)

4. `supabase/migrations/20260409_004_kakao_tokens.sql` — kakao_tokens 테이블 (단일 행 제약, RLS)

5. `supabase/migrations/20260409_005_notify_trigger.sql` — Database Trigger (orders INSERT 시 on-new-order Edge Function 호출)
   - **⚠️ 함정**: `net.http_post`에 `Authorization: Bearer SERVICE_ROLE_KEY` 헤더 필수
   - `pg_net` 확장 활성화 확인

6. 운영 프로젝트에 배포:
   ```bash
   supabase db push
   ```

7. Supabase Dashboard SQL Editor에서 검증:
   ```sql
   -- 무료체험 테스트
   SELECT create_order('테스트', 'test@test.com', 'free_trial', 0, '1.2.3.4', 'test');

   -- 중복 차단 테스트
   SELECT create_order('테스트2', 'test@test.com', 'free_trial', 0, '1.2.3.4', 'test');

   -- 정리
   DELETE FROM orders WHERE email = 'test@test.com';
   ```

**체크포인트 (사장님 검수):**
- [ ] orders, kakao_tokens 테이블이 기존 프로젝트에 생성됨
- [ ] licenses 테이블은 건드리지 않음
- [ ] create_order 호출이 정상 작동
- [ ] anon 직접 접근 차단 확인
- [ ] create_license는 anon에게 권한 없음

---

### Phase 4 — 폼 연결 (1h)

**목적:** 랜딩페이지 폼 → Supabase RPC 실제 연동.

**작업:**

1. Supabase Dashboard에서 URL + anon key 복사

2. `config.js` 업데이트:
   ```javascript
   window.APP_CONFIG = {
     supabase: {
       url: 'https://egwmkpplnzypkbedasrs.supabase.co',
       anonKey: 'eyJxxx...'
     },
     // ...
   };
   ```

3. `assets/js/form.js` 작성:
   - Supabase 클라이언트 초기화
   - `getUserIP()` — ipify API
   - `submitForm(event)` — create_order RPC 호출
   - 에러 처리 + 토스트 메시지
   - 무료체험: 성공 토스트만 (나머지는 Edge Function이 처리)
   - 유료: 결제 모달 (현재는 "곧 연락드릴게요" 안내)

4. 로컬 테스트:
   - 실제 폼 제출 → Supabase Dashboard에서 orders 확인
   - 중복 이메일 테스트
   - 에러 케이스 테스트

**체크포인트:**
- [ ] 폼 제출 시 orders 테이블에 저장됨
- [ ] order_code 자동 생성됨
- [ ] 중복 무료체험 차단 작동
- [ ] 에러 메시지 친절하게 표시됨

---

### Phase 5 — 알림 3중 Edge Function (2~3h)

**목적:** 주문 INSERT 시 카카오톡 + 텔레그램 + Resend 이메일 3개 동시 발송.

**사전 준비 (사장님 손으로 완료되어 있어야 함):**
- Kakao Developers 앱 등록 + access_token/refresh_token 확보
- Telegram Bot 생성 + 토큰 + chat_id
- Resend 가입 + API 키

**이 Phase에서 추가로 할 것:**

#### 5-1. Resend 도메인 인증 (⭐ 중요)

1. Resend Dashboard → Domains → Add Domain
2. 도메인 입력: `blog.pluscoach.co.kr`
3. Resend가 DNS 레코드 3~4개 표시:
   - SPF (TXT)
   - DKIM (TXT)
   - (선택) DMARC (TXT)
4. **카페24 도메인 관리** 접속:
   - 로그인 → 나의 서비스관리 → 도메인 관리
   - `pluscoach.co.kr` → DNS 관리
   - Resend가 준 레코드들 그대로 추가
   - ⚠️ 호스트 이름이 `resend._domainkey.blog` 같은 식이면 그대로 입력
5. 5~15분 대기 → Resend Dashboard에서 "Verify" 클릭
6. 초록불 들어오면 완료 → `noreply@blog.pluscoach.co.kr` 발송 가능

**⚠️ 주의:** 기존 `pluscoach.co.kr` 루트 도메인의 DNS 레코드는 **절대 건드리지 말 것.** 오직 `blog.` 서브도메인 관련 레코드만 추가.

#### 5-2. Edge Function 작성

1. `supabase/functions/on-new-order/index.ts`
   - 함수 흐름:
     1. Database Trigger로부터 order 데이터 수신
     2. 병렬로 3개 발송 (`Promise.allSettled`)
        - 카카오 "나에게 보내기"
        - 텔레그램 sendMessage
        - Resend 사용자 접수 확인 이메일
     3. 무료체험이면 추가 분기 (Phase 6에서 작성)
     4. 각 발송 결과 로그

2. `supabase/functions/_shared/kakao.ts` — 카카오 토큰 관리
3. `supabase/functions/_shared/telegram.ts` — 텔레그램 발송
4. `supabase/functions/_shared/resend.ts` — Resend 발송

#### 5-3. kakao_tokens 초기값 주입

Supabase SQL Editor:
```sql
INSERT INTO kakao_tokens (access_token, refresh_token, access_token_expires_at)
VALUES ('초기_access_token', '초기_refresh_token', NOW() + INTERVAL '6 hours');
```

#### 5-4. 환경변수 설정

Supabase Dashboard → Edge Functions → Secrets:
```
KAKAO_REST_API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@blog.pluscoach.co.kr
```

#### 5-5. 배포

```bash
supabase functions deploy on-new-order --no-verify-jwt
```

#### 5-6. 테스트

SQL Editor에서 `create_order` 직접 실행 → Edge Function 로그 확인 → 카톡/텔레그램/이메일 수신 확인

**⚠️ 함정:**
- `--no-verify-jwt` 플래그 필수
- 카카오 access_token 6시간 후 만료 → refresh 로직 철저히
- Resend 도메인 인증 안 됐으면 이메일 발송 실패 → Phase 5-1 먼저 완료 필수

**체크포인트 (사장님 검수):**
- [ ] Resend 도메인 `blog.pluscoach.co.kr` 초록불 확인
- [ ] 실제 폼 제출 시 카카오톡 알림 도착
- [ ] 실제 폼 제출 시 텔레그램 알림 도착
- [ ] 실제 폼 제출 시 사용자에게 접수 확인 이메일 도착 (스팸함 확인)
- [ ] 3개 중 하나 실패해도 나머지 발송됨
- [ ] Edge Function 로그에 에러 없음

---

### Phase 6 — 무료체험 자동화 (1h)

**목적:** 무료체험 신청자는 페이앱 없이도 즉시 인증키 발급 + 이메일.

**작업:**

1. `on-new-order/index.ts`에 무료체험 분기 추가:
   ```
   if (order.plan === 'free_trial') {
     1. create_license RPC 호출 (service_role)
     2. 라이선스 키 받아서 orders 업데이트
     3. Resend로 "인증키 발급" 이메일 발송
     4. orders status → '발송완료'
   }
   ```

2. 무료체험 이메일 HTML 템플릿 작성

3. 환경변수 추가:
   ```
   DOWNLOAD_URL=https://드라이브링크
   ```

4. 테스트:
   - 폼에서 무료체험 신청
   - 카카오톡/텔레그램 알림 확인
   - 사용자 이메일 2개 수신 확인 (접수 확인 + 인증키)
   - orders 테이블에 license_key 저장 확인
   - licenses 테이블에 새 키 생성 확인

**체크포인트:**
- [ ] 무료체험 신청 → 1분 안에 인증키 이메일 도착
- [ ] 프로그램에 인증키 입력 → 정상 작동
- [ ] expires_at이 24시간 후로 설정됨
- [ ] 중복 차단 여전히 작동

---

### Phase 7 — 사업자 푸터 + 법적 페이지 (1~2h)

**목적:** 전자상거래법 준수.

**작업:**

1. 기존 단순 푸터 → 사업자 정보 푸터로 교체:
   ```
   상호: 제이에스코퍼레이션
   대표자: 오준석
   사업자등록번호: 850-38-01085
   통신판매업 신고번호: 제 2023-서울강동-1311호
   사업장 주소: 서울특별시 관악구 남부순환로 1921-1, 401-A4호
   이메일: contact@blog.pluscoach.co.kr (또는 기존 이메일)

   [개인정보처리방침] [이용약관] [환불규정]

   © 2026 제이에스코퍼레이션. All Rights Reserved.
   ```

2. `privacy.html` — 개인정보처리방침 (수집: 이름/이메일/IP, 보관: 5년)
3. `terms.html` — 이용약관
4. `refund.html` — 환불규정 (인증키 발급 후 환불 불가 등)
5. `assets/css/legal.css` — 법적 페이지 공통 스타일
6. 각 페이지 상단 "← 메인으로" 링크

**⚠️ 주의:**
- 통신판매업 신고 주소 변경 신고 필요 (강동구청, 별도 진행)
- 법적 페이지 내용은 플레이스홀더로 시작 → 추후 검토

**체크포인트:**
- [ ] 사업자 정보 정확히 표시
- [ ] 3개 페이지 링크 작동
- [ ] 모바일에서도 읽기 편함

---

### Phase 8 — GitHub Pages 배포 + 도메인 연결 (1h)

**목적:** `blog.pluscoach.co.kr`로 실제 서비스 런칭.

#### 8-1. GitHub Pages 배포

1. `.gitignore` 확인:
   ```
   supabase/.env
   supabase/.temp/
   node_modules/
   .DS_Store
   *.log
   ```

2. Git 커밋 + 푸시:
   ```bash
   git add .
   git commit -m "feat: MVP 랜딩페이지 백엔드 연동"
   git push origin main
   ```

3. GitHub 리포 → Settings → Pages:
   - Source: `main` 브랜치, `/` (root)
   - Save

4. 배포 기본 URL 확인: `https://jsrb0.github.io/blogautopage/` (임시)

#### 8-2. 카페24에서 CNAME 레코드 추가

1. 카페24 로그인 → 나의 서비스관리 → 도메인 관리
2. `pluscoach.co.kr` → **DNS 관리** 또는 **네임서버/레코드 설정**
3. 레코드 추가:
   ```
   타입: CNAME
   호스트: blog
   값: jsrb0.github.io
   TTL: 기본값 (3600)
   ```
4. 저장 → 10~30분 대기 (DNS 전파)

**⚠️ 기존 `pluscoach.co.kr` 레코드(A, MX 등)는 건드리지 말 것.** 서브도메인 CNAME만 추가.

#### 8-3. GitHub Pages에 커스텀 도메인 연결

1. GitHub 리포 → Settings → Pages
2. **Custom domain** 입력: `blog.pluscoach.co.kr`
3. Save
4. DNS 확인 진행 (몇 분 소요)
5. **Enforce HTTPS** 체크 (DNS 확인 후 활성화 가능)

GitHub가 자동으로 리포 루트에 `CNAME` 파일 생성:
```
blog.pluscoach.co.kr
```

#### 8-4. 상대경로 점검

- `./assets/...` 또는 `assets/...` ✅
- `/assets/...` ❌ (절대경로 금지)

단, 커스텀 도메인 사용 시에는 서브패스가 없어서 `/assets/...`도 동작하지만, 일관성을 위해 상대경로 유지.

#### 8-5. 배포 확인

- `https://blog.pluscoach.co.kr` 접속
- HTTPS 정상 작동 (자물쇠 아이콘)
- 모든 CSS/JS 로드됨
- 폼 제출 실제 작동

**⚠️ 함정:**
- DNS 전파 10~60분 소요 (조급해 하지 말 것)
- HTTPS 인증서 발급 자동이지만 5~15분 걸림
- 처음엔 "DNS not configured" 에러 나올 수 있음 → 기다리면 해결

**체크포인트 (사장님 검수):**
- [ ] `https://blog.pluscoach.co.kr` 접속 정상
- [ ] HTTPS 자동 적용
- [ ] 기존 `pluscoach.co.kr` 자동매매 페이지 정상 (0% 영향 확인)
- [ ] 모든 디자인 깨짐 없음
- [ ] 폼 제출 → Supabase → 알림 3개 전체 작동

---

### Phase 9 — 실전 테스트 (30m)

**실제 사용자 흐름 시뮬레이션:**

1. `https://blog.pluscoach.co.kr` 접속
2. 무료체험 신청 (본인 이메일로):
   - [ ] 사장님 카톡에 알림
   - [ ] 사장님 텔레그램에 알림
   - [ ] 본인 이메일에 접수 확인
   - [ ] 본인 이메일에 인증키
3. 인증키로 프로그램 실행 테스트
4. 유료 플랜 신청 (본인 이메일로):
   - [ ] 사장님 카톡/텔레그램 알림
   - [ ] 본인 이메일에 접수 확인 (인증키 없음)
5. Supabase Dashboard:
   - [ ] orders에 2건 저장
   - [ ] 무료체험은 status `발송완료`, license_key 있음
   - [ ] 유료는 status `결제대기`

---

## 8. 파일 구조 (최종)

```
blogautopage/
│
├── CNAME                               # blog.pluscoach.co.kr (GitHub Pages 자동 생성)
├── index.html                          # 메인 랜딩페이지
├── privacy.html                        # 개인정보처리방침
├── terms.html                          # 이용약관
├── refund.html                         # 환불규정
├── 404.html                            # 404 페이지
│
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   └── legal.css
│   ├── js/
│   │   ├── config.js
│   │   ├── main.js
│   │   └── form.js
│   └── images/
│       ├── og-image.png
│       └── favicon.ico
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260409_001_orders_table.sql
│   │   ├── 20260409_002_create_order_rpc.sql
│   │   ├── 20260409_003_create_license_rpc.sql
│   │   ├── 20260409_004_kakao_tokens.sql
│   │   └── 20260409_005_notify_trigger.sql
│   └── functions/
│       ├── on-new-order/
│       │   └── index.ts
│       └── _shared/
│           ├── kakao.ts
│           ├── telegram.ts
│           └── resend.ts
│
├── docs/
│   ├── 인수인계_v3_MVP.md
│   ├── 사전준비_체크리스트.md
│   ├── Claude_Code_시작_프롬프트.md
│   ├── 구현_가이드.md
│   └── 설계_가이드.md
│
├── backup/
├── .gitignore
└── README.md
```

---

## 9. 환경변수 정리

### Supabase Edge Function Secrets

```bash
# 카카오
KAKAO_REST_API_KEY=...

# 텔레그램
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789

# Resend
RESEND_API_KEY=re_xxx...
RESEND_FROM_EMAIL=noreply@blog.pluscoach.co.kr

# 프로그램 다운로드
DOWNLOAD_URL=https://drive.google.com/...

# (자동 주입)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
```

### config.js (프론트엔드 — 공개 OK)

```javascript
window.APP_CONFIG = {
  supabase: {
    url: 'https://egwmkpplnzypkbedasrs.supabase.co',
    anonKey: 'eyJxxx...'
  },
  plans: {
    free: { plan: 'free_trial', amount: 0 },
    '1month': { plan: 'monthly', amount: 39000 },
    full: { plan: 'full_package', amount: 59000 }
  },
  kakao: {
    channelUrl: 'https://open.kakao.com/me/pluscoach'
  },
  site: {
    url: 'https://blog.pluscoach.co.kr'
  }
};
```

---

## 10. 사업자 정보 & 법적 요건

### 사업자 정보

- **상호:** 제이에스코퍼레이션
- **대표자:** 오준석
- **사업자등록번호:** 850-38-01085
- **통신판매업 신고번호:** 제 2023-서울강동-1311호
- **사업장 주소:** 서울특별시 관악구 남부순환로 1921-1, 401-A4호

### ⚠️ 주소 불일치 (별도 정리 필요)

통신판매업 신고 주소(강동구)가 사업자등록증 주소(관악구)와 다름. 강동구청에 주소 변경 신고 필요. 페이앱 사업자 심사 시 체크될 수 있음.

---

## 11. 주의사항 & 함정

### ⚠️ 도메인 / DNS

- **`pluscoach.co.kr` 기존 레코드 절대 건드리지 말 것** (A, MX, 기존 TXT 등)
- Resend, CNAME 모두 **`blog.` 서브도메인 관련만 추가**
- DNS 전파 10~60분 소요, 조급해하지 말 것
- 기존 자동매매 페이지는 0% 영향 받음 (서브도메인 방식이라 격리됨)

### ⚠️ Supabase

- licenses 테이블 절대 건드리지 말 것
- Database Trigger `net.http_post`에 Authorization 헤더 필수
- Edge Function `verify_jwt = false`
- `pg_net` 확장 활성화 확인
- 운영 DB에 push 전 migration 검토

### ⚠️ 카카오

- access_token 6시간 → 자동 갱신 필수
- refresh_token 60일 → 이것도 만료 전 갱신
- "나에게 보내기"는 사장님 본인 카톡만 가능
- 토큰은 kakao_tokens 테이블에 저장, service_role만 접근

### ⚠️ Resend

- 도메인 인증 완료 전에는 이메일 발송 실패
- 인증 후 `noreply@blog.pluscoach.co.kr` 포함 해당 도메인 모든 주소 발송 가능

### ⚠️ 보안

- ❌ service_role key, API 키, 토큰 프론트엔드 노출 금지
- ✅ 모든 민감 정보는 Edge Function Secrets에만
- ✅ `.gitignore`에 `supabase/.env` 필수

### ⚠️ 법적

- 통신판매업 주소 변경 필수
- 개인정보처리방침 없이 이메일 수집 금지
- 환불규정 명시 필수

### ⚠️ 무료체험 악용 방지

- 이메일 + IP 중복 체크
- 유효기간 24시간
- 한 이메일당 1회

---

## 12. 페이앱 승인 후 추가 작업

### Phase 10 — 페이앱 결제 연동 (2~3h)

1. 페이앱 대시보드 → userid + API 키 확보
2. 결제 모달 UI 수정 (페이앱 결제 버튼)
3. `assets/js/payment.js` — 페이앱 결제 요청 API 호출
4. `supabase/functions/payapp-webhook/index.ts`:
   - 페이앱 feedbackurl 수신
   - 서명 검증
   - orders status 업데이트
   - create_license 자동 호출
   - 인증키 이메일 발송
5. 환경변수:
   ```
   PAYAPP_USERID=...
   PAYAPP_API_KEY=...
   PAYAPP_VALUE=...
   ```
6. 배포 + 테스트 결제 1건

### Phase 11 — Analytics (선택, 1h)

- GA4, Meta Pixel, Microsoft Clarity
- 주요 이벤트 tracking

---

## 📞 참고 링크

- **운영 Supabase:** https://egwmkpplnzypkbedasrs.supabase.co
- **카카오 오픈채팅:** https://open.kakao.com/me/pluscoach
- **Kakao Developers:** https://developers.kakao.com
- **Telegram BotFather:** https://t.me/BotFather
- **Resend:** https://resend.com
- **페이앱:** https://www.payapp.kr
- **카페24 도메인:** https://hosting.cafe24.com

---

**작성자:** Claude (BlogAutoFriends 설계 대화창)
**버전:** v3.0 FINAL
**최종 수정:** 2026-04-09
**배포 도메인:** https://blog.pluscoach.co.kr
**다음 작업:** Claude Code에서 Phase 1부터 순차 진행
