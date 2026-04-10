# BlogAutoFriends 랜딩페이지 백엔드 연동 — 전체 진행 가이드

> **목적**: 동일한 구조의 자동 배포 프로그램 만들 때 처음부터 따라할 수 있는 풀 가이드  
> **작성일**: 2026-04-10  
> **대상**: 사장님(jsrb0) 본인 + 미래의 비슷한 프로젝트  
> **현재 진행**: Phase 1~5 완료, Phase 6~9 남음

---

## 📋 목차

1. [전체 시스템 구조](#1-전체-시스템-구조)
2. [기술 스택과 선택 이유](#2-기술-스택과-선택-이유)
3. [Supabase 프로젝트 구조](#3-supabase-프로젝트-구조)
4. [작업 시작 전 사전 준비물 10개](#4-작업-시작-전-사전-준비물-10개)
5. [Phase 1 — 프론트엔드 구조 리팩터링](#5-phase-1--프론트엔드-구조-리팩터링)
6. [Phase 2 — Supabase CLI 설정](#6-phase-2--supabase-cli-설정)
7. [Phase 3 — DB 스키마 마이그레이션](#7-phase-3--db-스키마-마이그레이션)
8. [Phase 4 — 폼 백엔드 연결](#8-phase-4--폼-백엔드-연결)
9. [Phase 5 — Edge Function 알림 시스템](#9-phase-5--edge-function-알림-시스템)
10. [발생했던 오류와 해결법](#10-발생했던-오류와-해결법)
11. [Claude Code에게 보낸 핵심 명령어 모음](#11-claude-code에게-보낸-핵심-명령어-모음)
12. [보안 가드레일](#12-보안-가드레일)
13. [다음 작업 준비 (Phase 6~9)](#13-다음-작업-준비-phase-69)

---

## 1. 전체 시스템 구조

### 시스템 흐름도

```
[사용자 브라우저]
    ↓ https://blog.pluscoach.co.kr (Phase 8 후)
[GitHub Pages: 정적 랜딩페이지]
    ↓ submitForm()
    ↓ supabaseClient.rpc('create_order', {...})
[Supabase 프로젝트: egwmkpplnzypkbedasrs]
    ├── public.licenses (기존, 프로그램 라이선스용 — 절대 안 건드림)
    ├── public.orders (신규, 주문 저장)
    ├── public.kakao_tokens (신규, 카카오 토큰 자동 갱신용)
    ├── RPC: create_order (anon 호출)
    ├── RPC: create_license (service_role 전용)
    ├── Database Trigger: on_order_inserted
    └── Vault: service_role_key (Trigger에서 사용)
         ↓ INSERT 시 자동 호출
[Edge Function: on-new-order]
    ├── _shared/kakao.ts → 카카오톡 "나에게 보내기"
    ├── _shared/telegram.ts → 텔레그램 봇 sendMessage
    └── _shared/resend.ts → Resend 이메일 발송
         ↓ Promise.allSettled로 3개 병렬 발송
[사장님 카카오톡] + [사장님 텔레그램] + [사용자 이메일]
```

### 핵심 설계 결정

| 결정 | 이유 |
|---|---|
| Supabase 프로젝트 통합 (분리 X) | 라이선스 RPC와 주문 RPC가 같은 DB에 있어야 Edge Function에서 네트워크 왕복 없이 호출 가능 |
| 카카오 + 텔레그램 + Resend 3중 알림 | 하나가 실패해도 사장님이 주문을 놓치지 않게 |
| Database Trigger → Edge Function | 폼 → DB INSERT 한 번이면 알림까지 자동. 프론트엔드에서 직접 알림 호출 X |
| Vault에 service_role_key 저장 | `current_setting()`이나 `ALTER DATABASE` 권한 문제 회피 |
| RLS + RPC만 노출 | anon key가 노출돼도 테이블 직접 접근 불가 |

---

## 2. 기술 스택과 선택 이유

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 프론트엔드 | HTML + Tailwind CDN + Vanilla JS | 빌드 도구 없이 GitHub Pages에 바로 배포 가능 |
| 폰트 | Pretendard (CDN) | 한국어 최적화 |
| 백엔드 DB | Supabase (PostgreSQL) | 무료 tier, RLS, RPC, Edge Function, Vault 통합 |
| 백엔드 함수 | Supabase Edge Functions (Deno + TypeScript) | DB 가까이 실행, 콜드 스타트 짧음 |
| 알림 1 | 카카오톡 "나에게 보내기" API | 무료, 사장님 본인 카톡으로 즉시 |
| 알림 2 | 텔레그램 Bot API | 무료, 토큰 갱신 불필요, 백업으로 안정 |
| 이메일 | Resend | 무료 3,000건/월, 도메인 인증 후 자기 도메인 발신 |
| 도메인 | `blog.pluscoach.co.kr` (카페24 서브도메인) | 비용 0원, 기존 루트 도메인 격리 |
| 호스팅 | GitHub Pages | 무료, 정적 사이트 자동 배포 |
| 결제 | 페이앱 (심사 대기 중, MVP 제외) | 사업자 가입비 0원 |

---

## 3. Supabase 프로젝트 구조

### 프로젝트 정보

- **Project Ref**: `egwmkpplnzypkbedasrs`
- **URL**: `https://egwmkpplnzypkbedasrs.supabase.co`
- **Region**: 미상 (검증 시점 확인 필요)
- **Owner 계정**: `cotrader77@gmail.com` (조직: `cotrader77-dev's Org`)
- **프로젝트 이름**: `블로그 백포테스트용`

⚠️ **주의**: v2 인수인계 문서에는 `lsykymwqzlypnichhids` 라는 옛 프로젝트 Ref가 적혀있었음. 보안 강화 작업 때 `egwmkpplnzypkbedasrs`로 전환됨. 작업 시작 전 사장님이 어느 프로젝트를 운영으로 쓰는지 확인 필수.

### 테이블 구조

#### `public.licenses` (기존, 절대 건드리지 않음)
```
id              bigint, primary key
key             text, unique
buyer_name      text
is_active       boolean
expires_at      timestamptz
last_ip         text
last_active_at  timestamptz
last_machine_id text
created_at      timestamptz
```
- RLS 활성화, 정책 0개 → anon 직접 접근 차단
- 기존 RPC 3개로만 접근: `verify_and_activate`, `update_session`, `clear_session`

#### `public.orders` (신규, Phase 3에서 생성)
```
id          bigserial, primary key
name        text, NOT NULL
email       text, NOT NULL
plan        text, CHECK (plan IN ('free_trial', 'monthly', 'full_package'))
amount      integer, default 0
status      text, default '결제대기'
ip          text
user_agent  text
order_code  text, unique
license_key text
created_at  timestamptz, default NOW()
updated_at  timestamptz, default NOW()
```
- RLS 활성화, 정책 0개
- Index: `idx_orders_email_plan (email, plan)` — 무료체험 중복 체크용
- Trigger: `on_orders_updated` (updated_at 자동 갱신)
- Trigger: `on_order_inserted` (Edge Function 호출)

#### `public.kakao_tokens` (신규, 단일 행 제약)
```
id                       integer, primary key, CHECK (id = 1)
access_token             text, NOT NULL
refresh_token            text, NOT NULL
access_token_expires_at  timestamptz, NOT NULL
updated_at               timestamptz, default NOW()
```
- RLS 활성화, 정책 0개 → service_role만 접근
- 단일 행 제약: 토큰은 하나만 존재해야 함

### RPC 함수

| 함수 | 호출 권한 | 용도 |
|---|---|---|
| `verify_and_activate(p_key, p_machine_id)` | anon | 프로그램 라이선스 검증 (기존) |
| `update_session(p_key, p_machine_id)` | anon | 세션 갱신 (기존) |
| `clear_session(p_key)` | anon | 세션 해제 (기존) |
| `create_order(p_name, p_email, p_plan, p_amount, p_ip, p_user_agent)` | anon | 주문 생성, 무료체험 중복 체크 (신규) |
| `create_license(p_buyer_name, p_plan, p_order_code)` | service_role only | 라이선스 발급 (신규) |
| `notify_new_order()` | trigger | orders INSERT 시 Edge Function 호출 (신규) |
| `handle_updated_at()` | trigger | updated_at 자동 갱신 (신규) |

### Vault Secret

```
name: 'service_role_key'
value: <service_role_key 값>
```
- `notify_new_order()` 트리거 함수가 `vault.decrypted_secrets`에서 조회해서 사용
- Edge Function 호출 시 `Authorization: Bearer <service_role_key>` 헤더에 사용

### Extensions

- `pg_net` (HTTP 요청 from Postgres)
- `supabase_vault` (secret 암호화 저장)

### Edge Function

- 이름: `on-new-order`
- 위치: `supabase/functions/on-new-order/index.ts`
- 공유 모듈: `supabase/functions/_shared/{kakao,telegram,resend}.ts`
- 배포 플래그: `--no-verify-jwt` (Trigger가 JWT 없이 호출하므로 필수)
- URL: `https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/on-new-order`

### Edge Function Secrets (환경변수)

| Key | 용도 |
|---|---|
| `KAKAO_REST_API_KEY` | 카카오 토큰 갱신 시 client_id |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 인증 |
| `TELEGRAM_CHAT_ID` | 메시지 받을 채팅 ID |
| `RESEND_API_KEY` | Resend 이메일 발송 인증 |
| `RESEND_FROM_EMAIL` | `noreply@blog.pluscoach.co.kr` |
| `SUPABASE_URL` | (자동 주입) |
| `SUPABASE_SERVICE_ROLE_KEY` | (자동 주입) |

---

## 4. 작업 시작 전 사전 준비물 10개

| # | 항목 | 소요 시간 | 비용 | 필요 Phase |
|---|---|---|---|---|
| 1 | Supabase CLI 설치 | 10분 | 무료 | Phase 2 |
| 2 | Supabase DB 비밀번호 확인/Reset | 2분 | - | Phase 2~3 |
| 3 | Kakao Developers 앱 등록 | 30분 | 무료 | Phase 5 |
| 4 | Kakao 초기 토큰 발급 | 10분 | - | Phase 5 |
| 5 | 텔레그램 봇 생성 | 5분 | 무료 | Phase 5 |
| 6 | 텔레그램 chat_id 확인 | 3분 | - | Phase 5 |
| 7 | Resend 계정 + API 키 | 5분 | 무료 | Phase 5 |
| 8 | Resend 도메인 인증 | 15분 | 무료 | Phase 5 |
| 9 | 프로그램 다운로드 링크 | 5분 | - | Phase 6 |
| 10 | 카페24 CNAME 레코드 추가 | 5분 | 무료 | Phase 8 |

각 준비물 상세는 아래 Phase별 가이드에서 다룸.

---

## 5. Phase 1 — 프론트엔드 구조 리팩터링

### 목적
1724줄 단일 `index.html` 파일을 외부 CSS/JS로 분리해서 유지보수 가능하게 만듦.

### 작업 결과
- `index.html`: 1724줄 → 1407줄
- `assets/css/main.css`: 78줄 (custom 애니메이션, 토스트, 모달)
- `assets/js/config.js`: 17줄 (APP_CONFIG 플레이스홀더)
- `assets/js/main.js`: 148줄 (UI 로직, 애니메이션, 스크롤, 토스트)
- `assets/js/form.js`: 55줄 (Supabase 클라이언트, 폼 제출)

### 중요 원칙

1. **Tailwind config는 인라인 유지 필수**
   ```html
   <script src="https://cdn.tailwindcss.com"></script>
   <script>
     tailwind.config = {
       theme: { extend: { colors: { naver: '#03C75A', ... } } }
     }
   </script>
   <link rel="stylesheet" href="assets/css/main.css">
   ```
   외부 JS 파일로 빼면 Tailwind가 이미 초기화된 후라 커스텀 컬러 전부 깨짐.

2. **JS 함수는 전역 스코프 유지**
   `function scrollToForm()` 으로 선언. `const`/`let` 쓰면 HTML의 `onclick="scrollToForm('free')"`에서 호출 못 함.

3. **로드 순서 고정**
   ```html
   <script src="assets/js/config.js"></script>
   <script src="assets/js/main.js"></script>
   <script src="assets/js/form.js"></script>
   ```
   `config.js`가 가장 먼저 (window.APP_CONFIG 정의), `form.js`가 마지막 (config 참조).

### 검수 방법
1. 로컬 브라우저로 `index.html` 열기
2. F12 Console 탭 — 빨간 에러 0개 확인
3. 디자인 동일성 확인 (히어로 타이핑, STEP 그래프 애니메이션, 가격 카드 버튼)

---

## 6. Phase 2 — Supabase CLI 설정

### 단계별 명령어

#### 1) Scoop 설치 (Windows)
```powershell
# PowerShell 일반 권한으로 실행
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

#### 2) Supabase CLI 설치
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
supabase --version  # 2.84.2 확인
```

#### 3) 로그인
```powershell
supabase login
# 엔터 → 브라우저 열림 → verification code 확인 → 로그인
```

⚠️ **주의**: 여러 Supabase 계정이 있는 경우, 작업할 프로젝트를 만든 계정으로 **브라우저에서 먼저 로그인**되어 있는 상태에서 `supabase login` 해야 함. 다른 계정으로 인증되면 `link` 시 권한 거부 발생.

#### 4) 프로젝트 폴더에서 init + link
```powershell
cd C:\Users\jsrb0\Documents\GitHub\blogautopage
supabase init  # supabase/ 폴더 생성
supabase link --project-ref egwmkpplnzypkbedasrs
```

⚠️ `link`는 API 토큰 기반이라 DB 비밀번호 안 물음. DB 비밀번호는 `db push` 때 필요.

#### 5) config.toml 수정
`supabase/config.toml`에 추가:
```toml
[functions.on-new-order]
verify_jwt = false
```
이유: Database Trigger가 JWT 없이 Edge Function 호출하므로 `verify_jwt = false` 필수.

### DB 비밀번호 준비
- Supabase Dashboard → Settings → Database → "Reset database password"
- 한 번 생성하면 다시 못 봄. 즉시 메모장에 저장.

---

## 7. Phase 3 — DB 스키마 마이그레이션

### 마이그레이션 파일 5개

`supabase/migrations/` 폴더에 생성:

1. `20260409_001_orders_table.sql` — orders 테이블 + RLS + updated_at trigger + index
2. `20260409_002_create_order_rpc.sql` — create_order RPC 함수, anon GRANT
3. `20260409_003_create_license_rpc.sql` — create_license RPC, service_role 전용
4. `20260409_004_kakao_tokens.sql` — kakao_tokens 테이블 + RLS
5. `20260409_005_notify_trigger.sql` — pg_net + Vault + Trigger 함수

### 005번 파일 핵심 (Vault 방식)

```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER AS $$
DECLARE
    v_service_key TEXT;
BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

    PERFORM net.http_post(
        url := 'https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/on-new-order',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
            'record', jsonb_build_object(
                'id', NEW.id, 'name', NEW.name, 'email', NEW.email,
                'plan', NEW.plan, 'amount', NEW.amount, 'status', NEW.status,
                'order_code', NEW.order_code, 'ip', NEW.ip,
                'user_agent', NEW.user_agent, 'created_at', NEW.created_at
            )
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_inserted
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_order();
```

### push 전 Vault에 secret 저장

Supabase Dashboard → SQL Editor에서 실행:
```sql
SELECT vault.create_secret(
  '<service_role_key 값>',
  'service_role_key'
);
```
결과로 UUID가 반환되면 성공.

⚠️ **함정**: `current_setting('app.settings.service_role_key')` 방식은 Supabase managed Postgres에서 권한 문제로 동작 안 할 수 있음. Vault 방식이 공식 권장.

### 마이그레이션 push
```powershell
supabase db push
# 5개 migration이 순서대로 적용됨
# Finished supabase db push.
```

⚠️ 마이그레이션 파일명의 버전 번호(앞 14자리)가 모두 동일하면 충돌 발생. 각 파일이 고유한 타임스탬프여야 함.

### 검증 SQL (Dashboard SQL Editor)

```sql
-- 테이블 3개 존재 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('licenses', 'orders', 'kakao_tokens');

-- licenses 컬럼 변경 없음 확인 (9개 컬럼)
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'licenses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- RPC 5개 확인
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('create_order', 'create_license', 
                        'verify_and_activate', 'update_session', 'clear_session');

-- Trigger 2개 확인
SELECT trigger_name, event_object_table FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name IN ('on_order_inserted', 'on_orders_updated');

-- 정책 0개 확인 (RLS만으로 차단)
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('licenses', 'orders', 'kakao_tokens');

-- create_order 실제 호출 테스트
SELECT create_order('테스트', 'test@test.com', 'free_trial', 0, '1.2.3.4', 'test');
DELETE FROM orders WHERE email = 'test@test.com';
```

---

## 8. Phase 4 — 폼 백엔드 연결

### config.js 수정
```javascript
window.APP_CONFIG = {
  supabase: {
    url: 'https://egwmkpplnzypkbedasrs.supabase.co',
    anonKey: '<anon public key>'  // Supabase Dashboard → Settings → API
  },
  plans: {
    free:     { plan: 'free_trial',    amount: 0 },
    '1month': { plan: 'monthly',       amount: 39000 },
    full:     { plan: 'full_package',  amount: 59000 }
  },
  ...
};
```

⚠️ **anon key는 사장님이 직접 입력**. Claude Code에 주지 말 것. config.js가 Git에 커밋되면 GitHub에 올라가지만, RLS + 정책 0개 상태면 안전.

### form.js 핵심 로직
```javascript
const { data, error } = await supabaseClient.rpc('create_order', {
  p_name: name,
  p_email: email,
  p_plan: plan,
  p_amount: amount,
  p_ip: await getUserIP(),  // ipify API
  p_user_agent: navigator.userAgent
});

if (error) throw error;
// RAISE EXCEPTION 한글 메시지가 err.message로 옴
```

### 검증
1. RLS 상태 확인 (위 SQL의 pg_policies 쿼리)
2. 로컬 브라우저로 폼 제출
3. Supabase Dashboard → orders 테이블에 row 생성 확인
4. 무료체험 중복 차단 확인 (같은 이메일로 재시도)
5. 유료 플랜 → 결제 모달 표시 확인

---

## 9. Phase 5 — Edge Function 알림 시스템

### 사전 준비물 (Phase 5 시작 전 필수)

#### 5-1. 텔레그램 봇 (5분)
1. 텔레그램에서 `@BotFather` 검색
2. `/newbot` → 이름: `BlogAutoFriends 알림` → username: `blogautofriends_notify_bot`
3. 봇 토큰 받음 (예: `8634116354:AAH...`)
4. **봇과 대화 시작 (`/start`)** ← 필수, 안 하면 메시지 못 보냄
5. `@userinfobot` 검색 → `/start` → 사장님의 chat_id 확인

#### 5-2. Resend API + 도메인 인증
1. https://resend.com 가입
2. API Keys 메뉴 → "Create API Key" → Name: `BlogAutoFriends`, Permission: Full access
3. **`re_` 키 즉시 메모장에 저장** (다시 못 봄)
4. Domains 메뉴 → "Add Domain" → `blog.pluscoach.co.kr`, Region: Tokyo
5. Resend가 보여주는 DNS 레코드 4개 (DKIM, SPF, MX, DMARC)를 카페24 DNS에 추가:
   - 카페24 → 도메인 → `pluscoach.co.kr` → DNS 관리
   - **TXT 관리** 메뉴에서 DKIM, SPF, DMARC 추가
   - **MX 관리** 메뉴에서 MX 추가
   - 카페24 SPF 관리는 IP만 받아서 사용 불가, TXT 관리에서 처리
   - 호스트 입력 시 `send.blog`, `resend._domainkey.blog`, `_dmarc.blog` 형태 (`.pluscoach.co.kr` 자동 붙음)
6. Resend 화면에서 "I've added the records" → 5~15분 내 Verified

#### 5-3. Kakao Developers 앱 등록 (30분, 가장 복잡)

1. https://developers.kakao.com 접속 → **알림 받을 본인 카톡 계정**으로 로그인
2. "내 애플리케이션" → "애플리케이션 추가하기"
3. 앱 이름: `블로그 자동화`, 회사명: `제이에스코퍼레이션`, 카테고리: `비즈니스`
4. **앱 기본 정보 수정**: 카테고리 `비즈니스`, 앱 대표 도메인 `blog.pluscoach.co.kr`
5. **제품 링크 관리** → 웹 도메인 등록 → `https://blog.pluscoach.co.kr`
6. **개인 개발자 비즈 앱 전환** (사업자 정보 등록 권장 — 권한 제약 적음)
7. **카카오 로그인** → 활성화 ON
8. **플랫폼 키 → REST API 키 클릭** → "카카오 로그인 리다이렉트 URI" 입력란에 `https://localhost:3000/oauth/callback` 등록 → 저장
   - ⚠️ 주의: 카카오 UI 자주 바뀜. 옛날엔 "카카오 로그인 → 일반"에 있었지만 현재는 **REST API 키 상세 페이지**에 있음
9. **카카오 로그인 → 동의항목** → `talk_message` 행의 "설정" 클릭 → "선택 동의" → 저장

#### 5-4. Kakao 토큰 발급 (10분)

**1단계: 인증 코드 받기**

브라우저 주소창에 (REST_API_KEY 부분만 본인 키로 교체):
```
https://kauth.kakao.com/oauth/authorize?client_id=<REST_API_KEY>&redirect_uri=https://localhost:3000/oauth/callback&response_type=code&scope=talk_message
```

→ 카카오 로그인 → 동의 → `localhost:3000/oauth/callback?code=XXXXX...` 로 리다이렉트 → "사이트 연결할 수 없음" 에러 페이지 (정상)
→ **주소창의 `code=` 뒤 값을 즉시 복사** (10분 후 만료)

**2단계: access_token + refresh_token 받기**

Claude Code 또는 PowerShell에서 curl 실행:
```bash
curl -X POST "https://kauth.kakao.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=<REST_API_KEY>" \
  -d "client_secret=<CLIENT_SECRET>" \
  -d "redirect_uri=https://localhost:3000/oauth/callback" \
  -d "code=<위에서 받은 code>"
```

⚠️ **클라이언트 시크릿이 ON이면 client_secret도 필수**. REST API 키 상세 페이지에서 확인.

응답 JSON:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 21599,         // 약 6시간
  "refresh_token_expires_in": 5183999,  // 약 60일
  "scope": "talk_message"
}
```

**3단계: kakao_tokens 테이블에 INSERT**

Supabase SQL Editor에서:
```sql
INSERT INTO public.kakao_tokens (id, access_token, refresh_token, access_token_expires_at)
VALUES (
  1,
  '<access_token>',
  '<refresh_token>',
  NOW() + INTERVAL '21599 seconds'
)
ON CONFLICT (id) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  refresh_token = EXCLUDED.refresh_token,
  access_token_expires_at = EXCLUDED.access_token_expires_at,
  updated_at = NOW();
```

### Edge Function 코드 구조

#### `index.ts` 핵심
```typescript
serve(async (req) => {
  const { record } = await req.json();
  
  const results = await Promise.allSettled([
    sendKakaoNotification(record),
    sendTelegramNotification(record),
    sendOrderConfirmationEmail(record),
  ]);
  
  // 각 결과 로그
  // 항상 200 반환 (Trigger 재시도 방지)
  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

#### `_shared/kakao.ts` 핵심 — 토큰 자동 갱신
```typescript
async function getValidAccessToken(): Promise<string> {
  // kakao_tokens 테이블에서 토큰 읽기
  const { data } = await supabase.from('kakao_tokens').select('*').eq('id', 1).single();
  
  // 만료 5분 전이면 refresh_token으로 갱신
  if (expiresAt - now < 5 * 60 * 1000) {
    return await refreshAccessToken(data.refresh_token);
  }
  return data.access_token;
}

async function refreshAccessToken(refreshToken) {
  // POST https://kauth.kakao.com/oauth/token (grant_type=refresh_token)
  // 새 토큰 받아서 DB 업데이트
  // refresh_token도 갱신된 경우 같이 저장
}
```

### Edge Function Secrets 등록

Supabase Dashboard → Edge Functions → Secrets 에서 5개 추가:
- `KAKAO_REST_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL=noreply@blog.pluscoach.co.kr`

### 배포
```powershell
supabase functions deploy on-new-order --no-verify-jwt
```

⚠️ `--no-verify-jwt` 플래그 필수.

### 실전 테스트
1. 로컬 브라우저에서 폼 제출 (무료 체험)
2. 5~10초 내 카카오톡 도착
3. 5~10초 내 텔레그램 도착
4. 1분 내 이메일 도착 (스팸함도 확인)

---

## 10. 발생했던 오류와 해결법

### 오류 1: `supabase link` 권한 거부
```
Unexpected error retrieving remote project status: 
Your account does not have the necessary privileges to access this endpoint.
```
**원인**: CLI에 로그인된 계정과 프로젝트 소유 계정이 다름.  
**해결**: 브라우저에서 프로젝트 소유 계정으로 로그인 → `supabase logout` → `supabase login` 재실행.

### 오류 2: 마이그레이션 버전 충돌
```
Found local migration files to be inserted before the last migration on remote database.
```
**원인**: 5개 마이그레이션 파일의 앞 8자리가 모두 `20260409`로 동일.  
**해결**: 파일명을 14자리 고유 타임스탬프로 변경 (예: `20260409000100`, `20260409000200`).

### 오류 3: orders 테이블 이미 존재
**원인**: 첫 번째 push 시도가 부분 성공 → 001번 마이그레이션의 `CREATE TABLE`이 이미 적용됨.  
**해결**: 001번 SQL을 `CREATE TABLE IF NOT EXISTS`로 수정 후 재push.

### 오류 4: 카카오 KOE006 (Redirect URI 미등록)
```
앱 관리자 설정 오류 (KOE006)
```
**원인**: `redirect_uri`가 카카오 앱에 등록 안 됨.  
**해결**: Kakao Developers → 플랫폼 키 → **REST API 키 클릭** → "카카오 로그인 리다이렉트 URI" 입력란에 `https://localhost:3000/oauth/callback` 등록 → 저장.

### 오류 5: 카페24 SPF 관리 메뉴 사용 불가
**원인**: 카페24 SPF 관리가 IP 주소만 받음. `include:amazonses.com` 형식 미지원.  
**해결**: SPF도 TXT 관리 메뉴에서 직접 추가. SPF 관리 메뉴는 무시.

### 오류 6: Vault `current_setting` 방식 권한 문제
**원인**: `ALTER DATABASE postgres SET app.settings.service_role_key`가 Supabase managed Postgres에서 권한 제한.  
**해결**: Supabase Vault 사용. `vault.create_secret()` + `vault.decrypted_secrets` 뷰 조회.

### 오류 7: 카카오 앱 2개 생성으로 인한 혼동
**원인**: "블로그 자동화" 앱과 "블로그 솔루션" 앱 두 개 만들어서 어느 쪽에 설정했는지 헷갈림.  
**해결**: 우측 상단 "앱 변경"으로 작업할 앱 명확히 지정. 앱 ID 메모.

---

## 11. Claude Code에게 보낸 핵심 명령어 모음

### Phase 1 시작
```
BlogAutoFriends 랜딩페이지 백엔드 연동 작업을 시작할게. MVP 버전이야.
docs/인수인계_v3_FINAL.md 와 docs/사전준비_체크리스트_FINAL.md 읽고
사전 준비물 어디까지 됐는지 나한테 확인 질문해.
확인 끝나면 Phase 1 (구조 리팩터링) 시작.
```

### Phase 2 (프로젝트 Ref 수정)
```
v3 문서에 lsykymwqzlypnichhids로 되어 있지만, 
실제 운영 프로젝트는 egwmkpplnzypkbedasrs야. 
docs 폴더의 모든 lsykymwqzlypnichhids를 egwmkpplnzypkbedasrs로 치환해줘.
치환 후 supabase init, supabase link 진행.
supabase link 할 때 비밀번호 입력 프롬프트 나오면 멈추고 알려줘.
```

### Phase 3 (DB 스키마)
```
Phase 3 진행해. orders 테이블 + kakao_tokens 테이블 + RPC 2개 + Trigger.
중요:
1. licenses 테이블은 절대 건드리지 말 것
2. RLS 활성화하고 정책은 만들지 말 것 (RPC로만 접근)
3. create_license는 anon에게 GRANT 하지 말 것 (service_role 전용)
4. Database Trigger는 Supabase Vault에서 service_role_key 읽어오는 방식으로
5. supabase db push 전에 migration SQL 5개 파일 전체 내용 보여주고 검토 받을 것
```

### Phase 4 (폼 연결)
```
Phase 4 진행. config.js에 Supabase URL은 입력하되 anon key는 플레이스홀더로 둬 (내가 직접 입력).
form.js를 supabaseClient.rpc('create_order', {...}) 방식으로 교체.
파라미터 이름은 p_name, p_email, p_plan, p_amount, p_ip, p_user_agent.
getUserIP()는 ipify API 사용.
RAISE EXCEPTION 한글 메시지를 토스트에 그대로 표시.
```

### Phase 5-A (Edge Function 코드)
```
Phase 5 Edge Function 코드 먼저 작성해줘. 
사전 준비물(카카오/텔레그램)은 아직 안 챙겼으니 배포는 나중.

작성할 파일:
- supabase/functions/on-new-order/index.ts
- supabase/functions/_shared/kakao.ts (토큰 자동 갱신 로직 포함)
- supabase/functions/_shared/telegram.ts
- supabase/functions/_shared/resend.ts

요구사항:
1. Database Trigger가 보내는 {record: {...}} 페이로드를 받음
2. Promise.allSettled로 카카오/텔레그램/Resend 3개 병렬 발송
3. 카카오 토큰: kakao_tokens 테이블에서 읽고, 만료 임박 시 refresh_token으로 갱신 후 다시 저장
4. 무료체험 분기는 Phase 6 주석으로 표시만
5. Resend From: noreply@blog.pluscoach.co.kr
6. 환경변수는 Deno.env.get()로 참조
7. Supabase client는 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (자동 주입)로 초기화
8. 각 발송 결과를 console.log로 찍기
9. 에러 나도 함수 전체는 200 반환 (Trigger 재시도 방지)

작성 완료되면 4개 파일 전체 내용 나한테 보여주고 대기.
```

### Phase 5-B (배포)
```
환경변수 6개 모두 Edge Function Secrets 등록 완료.
kakao_tokens 테이블에도 초기 토큰 INSERT 완료.

이제 on-new-order Edge Function 배포해줘:
supabase functions deploy on-new-order --no-verify-jwt

⚠️ --no-verify-jwt 플래그 필수.
배포 결과 보여줘.
```

---

## 12. 보안 가드레일

작업 내내 지킨 원칙들:

1. **`licenses` 테이블 절대 건드리지 않음** — 기존 프로그램 라이선스 시스템이 의존 중
2. **`pluscoach.co.kr` 루트 도메인 DNS 건드리지 않음** — 기존 자동매매 페이지가 의존 중
3. **DNS 추가는 `blog.` 서브도메인 관련만** — 격리 보장
4. **`service_role_key`는 Edge Function Secrets + Supabase Vault에만**
5. **Database Trigger의 `net.http_post`에 `Authorization` 헤더 필수**
6. **Edge Function 배포 시 `--no-verify-jwt` 플래그 필수**
7. **`anon key`는 RLS + 정책 0개로 안전 보장**
8. **모든 RPC는 `SECURITY DEFINER`로 RLS 우회하되, GRANT로 호출 권한 제한**

---

## 13. 다음 작업 준비 (Phase 6~9)

### Phase 6 — 무료체험 자동화 (1시간)
- Edge Function `index.ts`의 무료체험 분기 주석 해제
- `record.plan === 'free_trial'`이면:
  1. `create_license` RPC 호출
  2. orders 테이블에 license_key 업데이트
  3. Resend로 인증키 이메일 발송
  4. status를 '발송완료'로 업데이트
- 환경변수 추가: `DOWNLOAD_URL`

### Phase 7 — 사업자 푸터 + 법적 페이지 (1~2시간)
- 사업자 정보 푸터 (전자상거래법 필수)
- `privacy.html`, `terms.html`, `refund.html` 생성

### Phase 8 — GitHub Pages 배포 + 도메인 (1시간)
- Git push → Settings → Pages 활성화
- 카페24 DNS에 CNAME 추가: `blog` → `jsrb0.github.io`
- GitHub Pages Custom domain: `blog.pluscoach.co.kr`
- HTTPS 강제

### Phase 9 — 실전 테스트 (30분)
- 본인 디바이스로 전체 플로우 검증

### 보안 정리 (Phase 6 끝나고 즉시)
이 가이드 작성 과정에서 채팅창에 노출된 키들 재발급:
- Kakao REST API 키 + Client Secret
- 카카오 access_token + refresh_token (재발급 후 kakao_tokens 테이블 UPDATE)
- 텔레그램 봇 토큰 (`@BotFather → /revoke`)
- 모든 Supabase Edge Function Secrets 새 값으로 교체

---

## 부록 A: 사용한 URL 모음

| 용도 | URL |
|---|---|
| Supabase 대시보드 | https://supabase.com/dashboard/project/egwmkpplnzypkbedasrs |
| Supabase API 키 | https://supabase.com/dashboard/project/egwmkpplnzypkbedasrs/settings/api-keys |
| Supabase DB 설정 | https://supabase.com/dashboard/project/egwmkpplnzypkbedasrs/database/settings |
| Supabase SQL Editor | https://supabase.com/dashboard/project/egwmkpplnzypkbedasrs/sql/new |
| Supabase Edge Function Secrets | https://supabase.com/dashboard/project/egwmkpplnzypkbedasrs/functions/secrets |
| Kakao Developers | https://developers.kakao.com |
| Kakao 인증 코드 받기 (예시) | `https://kauth.kakao.com/oauth/authorize?client_id=<KEY>&redirect_uri=https://localhost:3000/oauth/callback&response_type=code&scope=talk_message` |
| Kakao 토큰 발급 | https://kauth.kakao.com/oauth/token |
| Kakao 메시지 발송 | https://kapi.kakao.com/v2/api/talk/memo/default/send |
| 텔레그램 BotFather | https://t.me/BotFather |
| 텔레그램 userinfobot | https://t.me/userinfobot |
| Resend | https://resend.com |
| 카페24 도메인 관리 | https://hosting.cafe24.com |

---

**작성 완료**: 2026-04-10  
**다음 리비전**: Phase 6~9 진행 후 업데이트
