# BlogAutoFriends 인수인계 v5
## MVP 완전 완료 → Phase 10부터 이어서

**작성일**: 2026-04-10
**이전 문서**: `인수인계_v4_Phase5완료.md` (Phase 5까지)
**현재 상태**: **Phase 1~9 전체 완료, 운영 가능 상태**
**다음 대화**: Phase 10부터 진행할 새 대화창
**작업자**: 사장님(jsrb0) + Claude Code + 설계 대화창 Claude

---

## 🎯 새 대화창 Claude에게 전달할 첫 메시지

> "BlogAutoFriends 운영 다음 단계 작업을 이어서 진행할 거야. MVP(Phase 1~9)는 이미 완료돼서 `blog.pluscoach.co.kr`에서 실제 운영 중이야. 이 인수인계 문서로 맥락 잡아줘. 그리고 Phase 10부터 같이 진행하자."

함께 첨부할 문서:
1. `인수인계_v5_MVP완료.md` (이 파일)
2. `인수인계_v4_Phase5완료.md` (Phase 1~5 상세)
3. `인수인계_v3_FINAL.md` (원본 마스터 설계)
4. `구현_과정_가이드.md` (Phase 1~9 전체 진행 로그)

---

## 📌 1줄 요약

**MVP 완전 작동 중**. `https://blog.pluscoach.co.kr` 라이브, HTTPS 적용, 무료체험 100% 자동화, 이메일 랜딩 톤 매칭 + 모바일 반응형, 법적 페이지 3종 + 사업자 푸터 완성, GitHub Pages 배포 완료. 남은 건 **Phase 10 페이앱 결제 자동화**, **Phase 11 운영 편의 기능**(카톡 플로팅 버튼 등), **Phase 12 디자인 마감**, **Phase 13 마케팅 준비**.

---

## 1. 현재 시스템 전체 상태 (Phase 1~9 완료)

### 🌐 라이브 URL
- **운영 사이트**: `https://blog.pluscoach.co.kr` (HTTPS 자동 발급 완료)
- **GitHub Pages 임시 URL**: `https://pluscoach.github.io/blogautopage/` (동일 리포, 병행 작동)
- **리포**: `https://github.com/pluscoach/blogautopage` (Public, 조직 계정 `pluscoach` 소유)

### 🏗️ 백엔드
- **Supabase Project Ref**: `egwmkpplnzypkbedasrs`
- **Supabase URL**: `https://egwmkpplnzypkbedasrs.supabase.co`
- **Edge Function URL**: `https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/on-new-order`
- **소유 계정**: `cotrader77@gmail.com` (조직: `cotrader77-dev's Org`)
- **프로젝트 표시명**: `블로그 백포테스트용`

### ✅ 작동 검증 완료된 플로우

```
[사용자] blog.pluscoach.co.kr 접속
  ↓ 무료체험 폼 제출
[Supabase] orders INSERT (RLS + anon RPC)
  ↓ Database Trigger: on_order_inserted
  ↓ pg_net.http_post → Vault에서 service_role_key 꺼내서 Bearer
[Edge Function: on-new-order]
  ↓ Promise.allSettled (무료/유료 공통)
  ├→ 카카오톡 "나에게 보내기" (자동 토큰 갱신)
  ├→ 텔레그램 봇 sendMessage
  └→ Resend 접수 확인 이메일
  ↓ (무료체험 분기)
  ├→ create_license RPC → licenses INSERT (id=8부터 자동 증가, sequence 보정 완료)
  ├→ orders.license_key + status='발송완료' UPDATE
  └→ Resend 인증키 이메일 발송 (랜딩 톤 + 구글 드라이브 + 노션 가이드)
```

**모두 실전 테스트 통과.** 1~2초 안에 전 과정 완료.

---

## 2. Phase 6~9에서 MVP 완료까지 추가된 것 (v4 이후)

### Phase 6: 무료체험 자동화 ✅
- `on-new-order/index.ts` 무료체험 분기 구현
- `create_license` RPC 호출 → `licenses` INSERT → `orders` UPDATE → 인증키 이메일
- 각 단계별 에러 핸들링 (status: `발급실패` / `이메일실패` / `발송완료` / `데이터오류`)
- 모든 경로에서 200 응답 (트리거 재시도 방지)
- **licenses 테이블 sequence 보정**: 기존 데이터 5건 있어서 `nextval` 충돌 발생 → `SELECT setval('licenses_id_seq', (SELECT MAX(id) FROM licenses))` 한 번 실행으로 해결

### Phase 6.5: 이메일 전면 리디자인 ✅
**문제 인식**: 초기 버전이 조잡함 — 박스 6개 난립, 빨강/노랑 경고 혼재, Courier New, 이모지 과다

**해결**: 랜딩페이지(`index.html`) 디자인 토큰을 100% 매칭
- 베이지 배경 `#faf9f6`
- 네이버 초록 `#03C75A` + 민트 `#00D4AA` 그라디언트 CTA
- 검정 가이드 버튼 (노션 링크)
- 초록 알약 뱃지 "네이버 블로그 서이추 자동화"
- 혜택 카드 2개 (1개월 +7일 / 풀패키지 +14일, 추천 뱃지)
- 주황 톤 경고 박스 (카운트다운 + 환불)
- 검정 원형 번호 뱃지 (사용법 1/2/3)

**한글 `from` 헤더**: RFC 2047 MIME encoded-word 방식으로 처리
```ts
const FROM_NAME_B64 = btoa(String.fromCharCode(...new TextEncoder().encode("블로그 자동화 솔루션")));
const FROM_HEADER = `=?UTF-8?B?${FROM_NAME_B64}?= <${RESEND_FROM_EMAIL}>`;
```

**모바일 반응형 대응**:
- 모든 `<p>`, `<h1>`, `<h3>`, `<li>`, `<td>` 에 `word-break: keep-all; overflow-wrap: break-word;` 인라인 직접 삽입 (상속 의존 X)
- 기본 폰트 축소: 타이틀 28px → 20px, 본문 15px → 13px
- `<style>` 블록에 미디어 쿼리 추가: `@media (max-width: 600px)` 에서 한 번 더 축소
- class 기반 override 패턴 (인라인 기본값 + 미디어쿼리 `!important`)

### Phase 7: 법적 페이지 + 사업자 푸터 ✅
- `privacy.html` — 개인정보처리방침 (8조)
- `terms.html` — 이용약관 (11조)
- `refund.html` — 환불규정 (6조 + 상단 강조 박스)
- `assets/css/legal.css` — 랜딩 톤 매칭 공통 스타일
- `index.html` 푸터 교체 — 사업자 정보 + 링크 4개 (가운데 정렬)

**환불 정책 핵심 조항**:
- 무료 체험: 환불 대상 아님
- 유료 + 인증키 미발급: 100% 환불
- 유료 + 인증키 발급 후: 원칙적 환불 불가
- 네이버 제재 + 근거 자료: 전액 환불
- 프로그램 오류: 7일 내 개선 안 되면 잔여 기간 환불 (법적 안전장치)
- 전자상거래법 제17조 청약철회권 조항 포함

### Phase 8: GitHub Pages 배포 + 커스텀 도메인 ✅
- **리포 Public 전환** (조직 계정 Free 플랜은 Private+Pages 불가)
- Git push → GitHub Pages 활성화
- 카페24 CNAME 추가:
  ```
  *.pluscoach.co.kr      → pluscoach.co.kr       (기존)
  www.pluscoach.co.kr    → pluscoach.github.io   (기존, 자동매매 페이지)
  blog.pluscoach.co.kr   → pluscoach.github.io   (신규, 이번에 추가)
  ```
- GitHub Pages Custom domain 등록 → DNS 확인 → HTTPS 자동 발급 → Enforce HTTPS

⚠️ **중요**: 기존 자동매매 페이지가 이미 `pluscoach.github.io`로 연결돼 있었음. `blog` 서브도메인은 같은 `pluscoach.github.io`로 가지만 GitHub이 리포별 `CNAME` 파일로 구분하여 각각 다른 리포 서빙.

### Phase 9: 실전 테스트 ✅
- `blog.pluscoach.co.kr` 접속 정상
- 무료체험 전 플로우 작동 (3중 알림 + 인증키 이메일)
- 법적 페이지 3개 정상 접속
- 모바일 반응형 확인
- 무통장 입금 모달 문구 수정: "텔레그램 채팅" → "카카오톡"

---

## 3. 핵심 환경 정보 (최신)

### Supabase DB 테이블
- `licenses` — 기존, 절대 안 건드림 (9개 컬럼 그대로)
- `orders` — 신규, 컬럼: id, name, email, plan, amount, status, ip, user_agent, order_code, license_key, created_at, updated_at
- `kakao_tokens` — 신규, 단일 행 (id=1), 토큰 저장

### Supabase RPC
**기존 (건드리지 않음)**:
- `verify_and_activate(key, machine_id)` — anon
- `update_session(key, machine_id)` — anon
- `clear_session(key)` — anon

**신규**:
- `create_order(p_name, p_email, p_plan, p_amount, p_ip, p_user_agent)` — anon, 무료체험 중복 차단 + order_code 생성
- `create_license(p_buyer_name, p_plan, p_order_code)` — service_role only
- `notify_new_order` — Trigger 함수 (Vault에서 service_role_key 읽음)
- `handle_updated_at` — Trigger 함수

### Edge Function Secrets (등록 완료, 7종)
- `KAKAO_REST_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` = `noreply@blog.pluscoach.co.kr`
- `DOWNLOAD_URL_FREE` = `https://drive.google.com/drive/folders/1MIY0tj35A_v6g29M_Mdln7KAyBIxjHGW?usp=drive_link`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (자동 주입)

### 구글 드라이브 링크 (공개)
- **무료체험 폴더**: `https://drive.google.com/drive/folders/1MIY0tj35A_v6g29M_Mdln7KAyBIxjHGW?usp=drive_link`
- **정식판 폴더**: `https://drive.google.com/drive/folders/1OeWFuPwR7AIByryIt6jdPLQK1Pi7SYIz?usp=drive_link` (Phase 10 페이앱 승인 시 `DOWNLOAD_URL_PAID` Secret으로 등록 예정)

### 노션 가이드 (공개)
- 프로그램 사용 가이드: `https://www.notion.so/phomean/33b1f9e9a5ab8094b653c7b16e9006e5?source=copy_link`
- 인증키 이메일의 "📖 프로그램 사용 가이드" 검정 버튼에 연결됨

### 사업자 정보
- 상호: **제이에스코퍼레이션**
- 대표자: 오준석
- 사업자등록번호: 850-38-01085
- 통신판매업 신고번호: 제 2023-서울강동-1311호
- 사업장 주소: 서울특별시 관악구 남부순환로 1921-1, 401-A4호
- 문의 이메일: **jscorpor88@gmail.com**
- 카카오톡 오픈채팅: `https://open.kakao.com/me/pluscoach`

⚠️ **주소 불일치 미해결**: 통신판매업 신고 주소가 강동구로 돼있음 → 관악구로 변경 신고 필요 (강동구청).

---

## 4. 파일 구조 (Phase 9 완료 기준)

```
blogautopage/ (pluscoach/blogautopage, Public)
├── CNAME                               # blog.pluscoach.co.kr (GitHub Pages 자동 생성)
├── index.html                          # 랜딩페이지 + 사업자 푸터
├── privacy.html                        # 개인정보처리방침
├── terms.html                          # 이용약관
├── refund.html                         # 환불규정
├── assets/
│   ├── css/
│   │   ├── main.css                   # 랜딩페이지 스타일
│   │   └── legal.css                  # 법적 페이지 공통 스타일
│   └── js/
│       ├── config.js                  # Supabase URL + anon key
│       ├── main.js                    # UI 로직
│       └── form.js                    # create_order RPC 호출
├── supabase/
│   ├── config.toml                    # verify_jwt = false
│   ├── migrations/
│   │   ├── 20260409000100_orders_table.sql
│   │   ├── 20260409000200_create_order_rpc.sql
│   │   ├── 20260409000300_create_license_rpc.sql
│   │   ├── 20260409000400_kakao_tokens.sql
│   │   └── 20260409000500_notify_trigger.sql
│   └── functions/
│       ├── on-new-order/
│       │   └── index.ts               # 무료체험 분기 + 3중 알림
│       └── _shared/
│           ├── kakao.ts               # 토큰 자동 갱신
│           ├── telegram.ts
│           └── resend.ts              # FROM_HEADER + 2개 이메일 함수
├── docs/
│   ├── 인수인계_v3_FINAL.md
│   ├── 인수인계_v4_Phase5완료.md
│   ├── 인수인계_v5_MVP완료.md         # ← 이 파일
│   ├── 구현_과정_가이드.md
│   └── 진행상황.md
└── .gitignore                         # supabase/.env, supabase/.temp/ 등 포함
```

---

## 5. 남은 작업 로드맵 (Phase 10~13)

사장님 확정 우선순위:
1. **Phase 10**: 페이앱 결제 자동화 (핵심 비즈니스 기능)
2. **Phase 11**: 카카오톡 플로팅 채널 버튼 (사이트 내 문의 편의)
3. **Phase 12**: 미세한 디자인 마감 작업
4. **Phase 13**: 광고·마케팅·홍보 자료 제작

---

### Phase 10 — 페이앱 결제 자동화 (2~4시간, 심사 완료 후)

**전제 조건**: 페이앱 가맹점 심사 완료 + API 키 발급 받음. 현재 심사 상태 재확인 필요.

**목적**: 유료 플랜(1개월 / 풀 패키지) 결제 자동화 → 결제 성공 시 자동으로 라이선스 발급 + 인증키 이메일 발송. 사장님이 카톡으로 수동 응대하는 현재 방식 종료.

**작업 내용**:

1. **페이앱 대시보드에서 확보할 것**
   - 가맹점 ID (userid)
   - API 키 (Linkkey / Value)
   - 결제 승인 IP 화이트리스트 (페이앱 서버 IP)
   - Webhook(feedbackurl) 등록: `https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/payapp-webhook`

2. **`index.html` 결제 모달 수정**
   - 현재 "무통장 입금 안내" 모달 → 페이앱 결제 버튼으로 교체
   - 은행/계좌/예주 "(추후 입력)" 부분 제거
   - `assets/js/payment.js` 신규 — 페이앱 결제 요청 API 호출 로직

3. **신규 Edge Function: `payapp-webhook`**
   - 페이앱이 호출하는 Webhook 수신
   - 서명 검증 (HMAC 또는 페이앱 제공 방식)
   - orders 테이블에서 해당 주문 찾기 (order_code 기준)
   - 결제 완료 확인 → `create_license` RPC 호출
   - orders.license_key + status='결제완료' UPDATE
   - `sendLicenseKeyEmail` 호출 (단, `DOWNLOAD_URL_PAID` 사용)
   - 200 응답으로 페이앱에 완료 확인

4. **새 Edge Function Secret 등록**
   ```
   PAYAPP_USERID=...
   PAYAPP_LINKKEY=...
   PAYAPP_VALUE=...
   DOWNLOAD_URL_PAID=https://drive.google.com/drive/folders/1OeWFuPwR7AIByryIt6jdPLQK1Pi7SYIz?usp=drive_link
   ```

5. **배포 + 실전 테스트**
   - 페이앱 테스트 모드로 1천원짜리 테스트 결제
   - 전 플로우 작동 확인 (폼 → 결제 → Webhook → 라이선스 → 이메일)
   - 실제 인증키로 프로그램 활성화 확인

6. **이메일 템플릿 조정**
   - `sendOrderConfirmationEmail`의 유료 분기 복구 필요 여부 판단
   - 현재는 MVP에서 유료 분기 제거했는데, 페이앱 자동화되면 "결제 진행 중 → 결제 완료 후 인증키 도착" 2단계 안내 필요할 수 있음
   - 또는 결제 즉시 인증키 발송이라 별도 안내 불필요하면 현재 구조 유지

**주의 사항**:
- 페이앱 Webhook은 외부에서 호출되므로 Edge Function을 `--no-verify-jwt`로 배포해야 함 (이미 `on-new-order`와 동일)
- 서명 검증 실패한 요청은 무조건 거부
- 동일 주문에 대한 중복 Webhook 방지 (idempotency) — orders.status로 체크
- 금액 검증: Webhook에서 받은 amount와 orders.amount가 일치하는지 확인 (위변조 방지)

---

### Phase 11 — 카카오톡 플로팅 채널 버튼 (30분~1시간)

**목적**: 사이트 우하단에 항상 떠 있는 카카오톡 문의 버튼 추가. 사용자가 스크롤하든 어느 페이지(법적 페이지 포함)든 즉시 문의 가능.

**작업 내용**:

1. **`assets/css/main.css`에 플로팅 버튼 스타일 추가**
   ```css
   .kakao-float {
     position: fixed;
     right: 24px;
     bottom: 24px;
     z-index: 9999;
     background: #FEE500; /* 카카오 노랑 */
     color: #0A0A0A;
     padding: 14px 20px;
     border-radius: 999px;
     box-shadow: 0 4px 16px rgba(0,0,0,0.15);
     font-weight: 700;
     text-decoration: none;
     display: flex;
     align-items: center;
     gap: 8px;
     transition: transform 0.2s;
   }
   .kakao-float:hover { transform: translateY(-2px); }
   @media (max-width: 600px) {
     .kakao-float { right: 16px; bottom: 16px; padding: 12px 16px; }
   }
   ```

2. **`index.html`, `privacy.html`, `terms.html`, `refund.html` 각각에 추가**
   `</body>` 직전:
   ```html
   <a href="https://open.kakao.com/me/pluscoach"
      target="_blank"
      rel="noopener"
      class="kakao-float">
     💬 카카오톡 문의
   </a>
   ```

3. **법적 페이지는 `legal.css`에 플로팅 버튼 스타일도 추가**
   (또는 `main.css`와 공유하도록 구조 조정)

4. **아이콘 대안**
   - 이모지 💬 대신 실제 카카오톡 로고 SVG 사용 가능
   - 간단하게 가려면 이모지로 충분

**검증 포인트**:
- 랜딩페이지 모든 섹션 스크롤해도 계속 보임
- 법적 페이지 3개에서도 보임
- 모바일에서 겹치는 요소 없음 (특히 폼 모달과 충돌 X)
- 클릭 시 카카오톡 오픈채팅 새 창으로 열림

---

### Phase 12 — 미세한 디자인 마감 작업 (1~2시간, 사장님 피드백 기반)

**목적**: 운영하면서 발견되는 디자인 디테일 이슈 개선. 구체 범위는 사장님이 실제 사용/관찰하면서 결정.

**잠재 작업 항목 (예시)**:

1. **랜딩페이지 섹션별 점검**
   - 히어로 섹션 CTA 버튼 위치/크기
   - 기능 소개 섹션 정렬
   - 가격 플랜 카드 여백
   - FAQ 섹션 아코디언 동작
   - 푸터 가운데 정렬 미세 조정

2. **반응형 추가 검증**
   - 태블릿 (768~1024px) 레이아웃
   - 아이폰 SE (375px) 같은 작은 화면
   - 가로 모드(landscape)

3. **OG 이미지 설정**
   - 카톡/페북/트위터로 링크 공유 시 썸네일
   - `<meta property="og:image">`, `<meta property="og:title">`, `<meta property="og:description">`
   - 이미지 1200×630px 권장

4. **파비콘**
   - 현재 파비콘 설정 여부 확인
   - 브라우저 탭 아이콘 + iOS 홈 화면 추가 시 아이콘

5. **페이지 로딩 성능**
   - Lighthouse 점수 확인
   - 이미지 최적화 (webp 포맷 등)
   - 폰트 preload

6. **접근성 (a11y)**
   - 이미지 alt 속성
   - 버튼 aria-label
   - 키보드 네비게이션
   - 색 대비 (특히 회색 텍스트)

7. **스크롤 애니메이션**
   - 섹션 등장 시 페이드인 (과하지 않게)
   - CTA 버튼 호버 효과

8. **마이크로카피 점검**
   - 버튼 문구 ("시작하기" vs "무료로 체험하기")
   - 에러 메시지 톤
   - 빈 상태 메시지

**진행 방식**: 사장님이 "이 부분 이렇게 수정해" 식으로 구체 지시. 한 번에 몰아서 처리하는 게 효율적.

---

### Phase 13 — 광고·마케팅·홍보 자료 제작 (별도 프로젝트)

**목적**: MVP 런칭 후 실제 유입 확보. 디자인·카피·채널 전략이 모두 필요한 별도 영역.

**작업 영역**:

1. **퍼포먼스 광고 소재**
   - 네이버 검색광고 (블로그 자동화 키워드)
   - 메타(페이스북/인스타그램) 광고 이미지 + 카피
   - 유튜브 광고 (쇼츠 또는 프리롤)
   - 구글 애즈 (디스플레이 네트워크)

2. **콘텐츠 마케팅**
   - 블로그 포스팅 (네이버 블로그 자동화 관련 정보성 글 → 자사 솔루션 자연스럽게 언급)
   - 유튜브 사용법 영상
   - 브런치/미디엄 장문 콘텐츠

3. **카카오 채널 활용**
   - 기존 오픈채팅을 공식 채널로 승격 고려
   - 친구 추가 이벤트
   - 주간 뉴스레터

4. **SNS 브랜드 계정**
   - 인스타그램: 기능 소개 카드뉴스
   - 트위터/X: 실시간 팁
   - 스레드: 운영 비하인드

5. **랜딩페이지 최적화 (CRO)**
   - A/B 테스트 (헤드라인, CTA 버튼 색상)
   - GA4 + Microsoft Clarity 설치
   - 히트맵 분석
   - 이탈 지점 파악

6. **파트너십**
   - 블로거 커뮤니티 제휴
   - 인플루언서 리뷰 요청
   - 제휴 수수료 프로그램

7. **PR·외부 노출**
   - 보도자료 배포
   - 스타트업 미디어(플래텀, TechCrunch 등) 컨택
   - Product Hunt 런칭

**진행 방식**: Phase 10~12가 끝난 뒤 별도 세션에서 영역별로 쪼개서 진행. Claude는 카피 작성, 이미지 컨셉 제안, 광고 스크립트, A/B 테스트 아이디어 등을 도울 수 있음.

---

## 6. 보안 정리 작업 (여전히 보류 중)

⚠️ 설계 대화창에서 노출됐던 키들 — 사장님 판단으로 "프로그램 배포에 영향 없으면 넘어감" → **Phase 10 시작 전후에 한 번 몰아서 처리 권장**.

재발급 대상:
- Kakao REST API 키 + Client Secret → Kakao Developers
- Kakao access_token + refresh_token → 새 키로 재발급 후 `kakao_tokens` UPDATE
- Telegram Bot Token → @BotFather /revoke

Supabase Edge Function Secrets 교체 → Edge Function은 재배포 불필요 (Secrets만 바뀌면 즉시 반영).

---

## 7. 가드레일 (여전히 유효)

1. **`licenses` 테이블 스키마 건드리지 말 것** — 기존 프로그램 라이선스가 의존. 단, `SELECT setval('licenses_id_seq', ...)` 같은 시퀀스 보정은 안전 (Phase 6 이슈 해결 때 이미 사용).
2. **`pluscoach.co.kr` 루트 도메인 DNS 절대 건드리지 말 것** — 기존 자동매매 페이지. `*.pluscoach.co.kr` 와일드카드와 `www.pluscoach.co.kr` CNAME도 건드리지 말 것.
3. **DNS 추가는 `blog.` 서브도메인 관련만**.
4. **`service_role_key`는 Edge Function Secrets + Supabase Vault에만**. 프론트엔드/공개 리포에 절대 노출 금지.
5. **Database Trigger의 `net.http_post`에 `Authorization` 헤더 필수**.
6. **Edge Function 배포 시 `--no-verify-jwt` 플래그 필수** (외부 호출받는 함수).
7. **운영 DB에 `supabase db push` 전 사장님 검수 필수**.
8. **anon key는 RLS + 정책 0개로 보호 중 — 정책 추가하지 말 것**.
9. **GitHub 리포 Public 상태 유지** — Private 전환 시 GitHub Pages 끊김 (조직 Free 플랜).
10. **이메일 템플릿 수정 시 `word-break: keep-all`, 모바일 미디어 쿼리 유지**.
11. **기존 CNAME 레코드 수정/삭제 금지** — 카페24에서 "수정"/"삭제" 버튼 누르지 말 것. "CNAME 추가"만 사용.

---

## 8. 운영 시작 체크리스트 (MVP 런칭 직전)

### 필수
- [ ] `blog.pluscoach.co.kr` 접속 정상, HTTPS 자물쇠 아이콘 확인
- [ ] 본인 이메일로 무료체험 전 플로우 최종 테스트 (카톡/텔레그램/이메일 2통)
- [ ] 인증키로 실제 프로그램 활성화 성공
- [ ] 구글 드라이브 **무료체험 폴더**에 프로그램 zip + 메모장 + 사용법 파일 모두 업로드 완료
- [ ] 구글 드라이브 **정식판 폴더**도 준비 완료 (Phase 10 이후 자동화용)
- [ ] 노션 가이드 페이지 내용 완성 + 공개 권한 확인
- [ ] 무통장 입금 모달 계좌 정보 실제 값 입력 (현재 "추후 입력" 상태) **또는** Phase 10에서 한 번에 페이앱으로 교체
- [ ] 사장님 카카오톡 알림 ON + 텔레그램 알림 ON
- [ ] 텔레그램 봇 채팅방 접근 가능
- [ ] 법적 페이지 3개 오탈자 최종 검토

### 권장
- [ ] GA4 / Microsoft Clarity 설치
- [ ] OG 이미지 설정
- [ ] 파비콘 설정
- [ ] 구글 서치콘솔 + 네이버 웹마스터 도구 등록
- [ ] 통신판매업 주소 변경 신고 (강동구 → 관악구, 관악구청)

### 마케팅 준비 (Phase 13)
- [ ] 카카오톡 오픈채팅 자동응답 템플릿
- [ ] 주문 응대 매크로 (결제 안내, 입금 확인, 환불 문의)
- [ ] 첫 30일 예상 FAQ 정리

---

## 9. 빠른 디버깅 SQL 모음 (v4 + 업데이트)

### 모든 주요 테이블 확인
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('licenses', 'orders', 'kakao_tokens');
```

### 최근 주문 조회
```sql
SELECT id, name, email, plan, status, license_key, created_at 
FROM orders ORDER BY created_at DESC LIMIT 10;
```

### 특정 사용자 주문 + 라이선스 연결 확인
```sql
SELECT 
  o.id AS order_id, o.name, o.email, o.plan, o.status, o.license_key, o.created_at,
  l.id AS license_id, l.key, l.is_active, l.expires_at
FROM orders o
LEFT JOIN licenses l ON o.license_key = l.key
WHERE o.email = '사용자이메일'
ORDER BY o.created_at DESC;
```

### 카카오 토큰 상태 (만료 임박 여부)
```sql
SELECT 
  id, 
  access_token_expires_at,
  access_token_expires_at - NOW() AS time_left,
  updated_at 
FROM kakao_tokens;
```

### 라이선스 시퀀스 상태 확인
```sql
SELECT 
  MAX(id) AS max_id,
  (SELECT last_value FROM licenses_id_seq) AS seq_last_value
FROM licenses;
```
→ 이 둘이 크게 차이 나면 시퀀스 재보정 필요:
```sql
SELECT setval('licenses_id_seq', (SELECT MAX(id) FROM licenses));
```

### 특정 주문 status 수동 변경 (운영 중 이슈 대응)
```sql
UPDATE orders SET status = '발송완료' WHERE id = 123;
```

### 테스트 데이터 정리
```sql
DELETE FROM orders WHERE email = 'dhwnstjr00@naver.com';
-- licenses 테이블은 건드리지 말 것
```

---

## 10. 주요 함정 이력 (Phase 1~9 경험 축적)

1. **Supabase CLI 계정 불일치** — 브라우저 로그인 계정이 프로젝트 소유 계정인지 확인 필수
2. **마이그레이션 파일명 동일 시 충돌** — 14자리 고유 타임스탬프 사용
3. **카카오 Redirect URI 위치** — 옛날 메뉴 아니고 REST API 키 상세 페이지 안
4. **Vault `current_setting` 방식 동작 안 함** — `vault.create_secret` + `vault.decrypted_secrets` 사용
5. **Resend SPF는 카페24 SPF 관리 메뉴 사용 불가** — TXT 관리에서 처리
6. **카카오 토큰 만료** — access 6시간 / refresh 60일, 60일 이상 미호출 시 재발급
7. **licenses 테이블 sequence 충돌** — 기존 데이터 있을 때 `setval`로 보정
8. **이메일 `from` 헤더 한글** — RFC 2047 MIME encoded-word 인코딩 필수
9. **이메일 `word-break` 상속 안 됨** — 모든 텍스트 태그에 인라인 직접 삽입
10. **GitHub Pages + 조직 Free 플랜** — Private 리포 불가, Public 전환 필요
11. **카페24 CNAME UI** — 라디오 버튼이 자동 선택돼 있어도 "수정/삭제"만 안 누르면 안전
12. **GitHub Pages 같은 도메인 공유** — 여러 리포가 `*.github.io` 공유 가능, GitHub이 `CNAME` 파일로 구분

---

## 11. 새 대화창에서 첫 작업 (Phase 10 시작)

1. **이 문서 + 인수인계_v4 + 구현_과정_가이드.md 첨부**
2. 위 "🎯 새 대화창 Claude에게 전달할 첫 메시지" 그대로 입력
3. 설계 대화창 Claude:
   - 이 문서 읽고 현재 상태 파악
   - "Phase 10 페이앱 자동화부터 진행할까요?" 확인 질문
4. 사장님:
   - "응. 먼저 페이앱 심사 상태 확인부터 도와줘" 또는
   - "페이앱 심사 완료됐어. API 키 받아뒀어. 바로 연동 가자"
5. Claude Code도 동일하게 킥오프:
   ```
   docs/인수인계_v5_MVP완료.md 읽고 현재 상태 파악해줘.
   Phase 10 페이앱 결제 자동화부터 진행할 거야. 일단 대기.
   ```

---

## 12. MVP 완성 후 첫 일주일 운영 가이드

### 매일 체크
- [ ] orders 테이블 신규 주문 확인 (1일 1회)
- [ ] 이메일 반송 여부 확인 (Resend 대시보드)
- [ ] 카카오톡 오픈채팅 문의 응답
- [ ] 무료체험 → 유료 전환율 간단 기록

### 주간 체크
- [ ] 카카오 토큰 만료일 확인 (2개월 기준)
- [ ] licenses 테이블 expires_at 만료 건수 집계
- [ ] 환불 요청 처리 내역 기록
- [ ] 버그/불만 사항 수집 → Phase 12 디자인 마감 작업에 반영

### 월간 체크
- [ ] Supabase 사용량 확인 (무료 플랜 한도)
- [ ] Resend 발송량 확인 (월 3,000건)
- [ ] 매출 정산 (페이앱 연동 후)
- [ ] Phase 13 마케팅 성과 분석

---

**작성자**: 설계 대화창 Claude (Phase 1~9 완료 세션)
**상태**: MVP 완료, 운영 대기 + Phase 10 준비
**다음 마일스톤**: 페이앱 결제 자동화 → 완전 무인 운영 진입
**라이브**: https://blog.pluscoach.co.kr
