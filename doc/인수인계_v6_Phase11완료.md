# BlogAutoFriends 인수인계 v6
## Phase 11 완료 → 무통장 입금 임시 결제 구조 + Phase 12부터 이어서

**작성일**: 2026-04-14
**이전 문서**: `인수인계_v5_MVP완료.md` + `인수인계_v5_Phase10패치.md`
**현재 상태**: **Phase 1~11 전체 완료, 유료 결제 100% 자동화 운영 중**
**다음 대화**: 무통장 입금 임시 결제 구조 + Phase 12부터 진행할 새 대화창
**작업자**: 사장님(jsrb0) + Claude Code + 설계 대화창 Claude

---

## 🎯 새 대화창 Claude에게 전달할 첫 메시지

> "BlogAutoFriends 운영 다음 단계 작업을 이어서 진행할 거야. Phase 1~11 전부 완료돼서 `blog.pluscoach.co.kr`에서 실제 유료 결제까지 100% 자동화된 상태야. 이 인수인계 문서로 맥락 잡아줘.
>
> **급한 작업이 있어**: 현재 PG사(페이앱) 가입이 안 되는 상황이라 **임시로 무통장 입금 구조를 추가**해야 해. 기존 페이앱 결제 코드는 삭제하지 말고 보존하면서, 무통장 입금 → 고객이 '입금 확인' 버튼 클릭 → 이메일/핸드폰/결제 상품 등 정보가 텔레그램으로 → 사장님이 텔레그램에서 '이메일 전송' 확인 → 기존 인증키 이메일 발송되는 구조.
>
> 이 무통장 구조를 같이 설계하고, 그 다음 Phase 12(디자인 마감)도 진행하자."

함께 첨부할 문서:
1. `인수인계_v6_Phase11완료.md` (이 파일, 최신 상태)
2. `인수인계_v5_MVP완료.md` (Phase 1~9 마스터)
3. `인수인계_v5_Phase10패치.md` (Phase 10 상세)
4. (선택) `구현_과정_가이드.md` (Phase 1~11 Claude Code 작업 로그, 1535줄)

---

## 📌 1줄 요약

**Phase 1~11 전체 완료.** `blog.pluscoach.co.kr` 라이브. 무료체험(숨김) + 1개월(39,000) + 풀패키지(59,000, 강력추천) + 평생소유권(255,000, 미끼). 페이앱 결제 자동화 → 라이선스 자동 발급 → 인증키 이메일 → 카톡/텔레그램 결제완료 알림 **전체 실결제 검증 완료**(3건: 39K+59K+255K). 카카오톡 플로팅 채널 버튼 전 페이지 적용. 이메일 3종 분기(무료/유료기간제/평생). 환불 페이지에 평생 소유권 전용 조항(월 20,000원 차감 공식) 추가.

---

## 1. 현재 시스템 전체 상태

### 🌐 라이브 URL
- **운영 사이트**: `https://blog.pluscoach.co.kr` (HTTPS 자동 발급)
- **GitHub Pages**: `https://pluscoach.github.io/blogautopage/`
- **리포**: `https://github.com/pluscoach/blogautopage` (Public)

### 🏗️ 백엔드
- **Supabase Project Ref**: `egwmkpplnzypkbedasrs`
- **Supabase URL**: `https://egwmkpplnzypkbedasrs.supabase.co`
- **소유 계정**: `cotrader77@gmail.com`
- **Edge Function URLs**:
  - `on-new-order`: 무료체험 전용 3중 알림 + 라이선스 발급
  - `payapp-webhook`: 페이앱 결제 완료 Webhook → 라이선스 + 알림

### ✅ 작동 검증 완료된 전체 흐름

```
[무료체험] (현재 UI 숨김, 코드 보존)
사용자 → create_order RPC → orders INSERT (free_trial)
  → Trigger → on-new-order
  → 카톡/텔레그램/접수이메일 3중 알림
  → create_license (24시간) → 인증키 이메일 (trial)

[유료 결제] (페이앱 JS API)
사용자 → create_order RPC → orders INSERT (monthly/full_package/lifetime)
  → Trigger → on-new-order → 유료 플랜 조기 반환 (아무것도 안 함)
  → payment.js → PayApp.payrequest() → 페이앱 결제창 팝업
  → 결제 완료 → 페이앱 서버 → POST payapp-webhook
  → linkval 검증 → pay_state=4만 처리 → 금액 검증
  → create_license → orders UPDATE(결제완료)
  → 인증키 이메일 (paid_term 또는 lifetime)
  → 카톡/텔레그램 결제완료 알림
```

### 실결제 검증 이력 (2026-04-14)
| 플랜 | 금액 | 결제수단 | 라이선스 | 이메일 | 알림 | 결과 |
|---|---|---|---|---|---|---|
| 1개월 | 39,000원 | 실결제 | 31일 ✅ | paid_term ✅ | 카톡/텔레그램 ✅ | **통과** |
| 풀패키지 | 59,000원 | 실결제 | 62일 ✅ | paid_term ✅ | 카톡/텔레그램 ✅ | **통과** |
| 평생소유권 | 255,000원 | 실결제 | 2099-12-31 ✅ | lifetime ✅ | 카톡/텔레그램 ✅ | **통과** |

3건 모두 페이앱 관리자에서 즉시 취소 처리 완료.

---

## 2. 현재 플랜 구성 (SSOT: config.js)

| 키 | planCode | 금액 | UI | 만료일 | 이메일 | 포지셔닝 |
|---|---|---|---|---|---|---|
| free | free_trial | 0원 | **숨김** (코드 보존) | 24시간 | trial | 리드 수집 (현재 비활성) |
| 1month | monthly | 39,000원 | 표시 | **31일** | paid_term | 진입장벽 |
| full | full_package | 59,000원 | 표시 (**강력 추천 뱃지**) | **62일** | paid_term | **메인 판매 타겟** |
| lifetime | lifetime | 255,000원 | 표시 (뱃지 없음) | **2099-12-31** | lifetime | 미끼 (앵커링 효과) |

**가격 변경**: `assets/js/config.js`의 `PLAN_CONFIG` 한 곳에서만. 화면/결제/DB/검증 전부 자동 반영.

### 가격 전략 설계 의도
```
[고객 심리]
1개월 39,000원 ← "체험용으로 적당"
풀패키지 59,000원 ⭐ ← "1.5배에 2배 기간? 추천 뱃지도? 이거다" ← 실제 목표
평생 255,000원 ← "비싸네..." (하지만 이 가격이 59,000원을 '합리적'으로 보이게 함)
```

---

## 3. Phase 10~11에서 추가된 핵심 변경사항 (v5 이후)

### Phase 10: 페이앱 결제 자동화
- `payapp-webhook/index.ts` 신규 — 페이앱 Webhook 전체 로직
- `_shared/payapp.ts` 신규 — linkval 검증 유틸
- `_shared/labels.ts` 신규 — getPlanLabel, getPayTypeLabel 공통 매핑
- `payment.js` 신규 — PayApp JS SDK 호출
- `on-new-order/index.ts` 수정 — 유료 플랜 조기 반환 (plan !== 'free_trial')
- `_shared/resend.ts` 수정 — isPaid/plan 파라미터, sendPaidOrderKakao/Telegram 추가
- 무통장 입금 모달 제거 → 페이앱 결제창으로 대체
- SSOT 가격 구조 리팩터링 (config.js → PLAN_CONFIG)

### Phase 10.5: 평생 소유권 + 가격 조정
- `create_license` RPC 수정 — lifetime CASE 추가 (2099-12-31), monthly 30→31일, full_package 365→62일
- `orders.plan` CHECK 제약조건에 'lifetime' 추가
- config.js — `visible` 필드 추가, 무료체험 숨김, 풀패키지 69K→59K, 평생 255K 신규
- 이메일 3종 분기 (trial / paid_term / lifetime)
- `refund.html` — 평생 소유권 전용 환불 조항 6개 하위항목 (월 20,000원 차감 공식)
- index.html — 평생 소유권 카드 신규, "우선 업데이트 지원" → "모든 기능 완전 이용" 교체

### Phase 11: 카카오톡 플로팅 채널 버튼
- `assets/css/floating-kakao.css` 신규 — position:fixed, 노란 원형 + 검정 툴팁
- index.html, privacy.html, terms.html, refund.html 4개 페이지에 HTML 삽입
- 모바일: 원형만 (툴팁 숨김), 데스크톱: 원형 + "💬 문의하기" 말풍선
- 카톡 인앱 브라우저에서 position:fixed 이슈 확인 → Chrome/Safari 직접 접속 시 정상. 카톡 인앱은 별도 대응 안 함 (영향 미미)

---

## 4. Edge Function Secrets (현재 14개)

| Secret | 용도 | Phase |
|---|---|---|
| KAKAO_REST_API_KEY | 카톡 "나에게 보내기" | 5 |
| TELEGRAM_BOT_TOKEN | 텔레그램 봇 | 5 |
| TELEGRAM_CHAT_ID | 텔레그램 채팅방 ID | 5 |
| RESEND_API_KEY | Resend 이메일 발송 | 5 |
| RESEND_FROM_EMAIL | noreply@blog.pluscoach.co.kr | 5 |
| DOWNLOAD_URL_FREE | 무료체험 구글 드라이브 폴더 | 6 |
| PAYAPP_USERID | dhwnstjr00 | 10 |
| PAYAPP_LINKKEY | 페이앱 연동 KEY | 10 |
| PAYAPP_VALUE | 페이앱 연동 VALUE (Webhook 검증) | 10 |
| DOWNLOAD_URL_PAID | 정식판 구글 드라이브 폴더 | 10 |
| SUPABASE_URL | 자동 주입 | - |
| SUPABASE_SERVICE_ROLE_KEY | 자동 주입 | - |
| SUPABASE_ANON_KEY | (있을 수도 있음) | - |
| SUPABASE_DB_URL | (있을 수도 있음) | - |

---

## 5. 사업자 정보

- 상호: **제이에스코퍼레이션**
- 대표자: 오준석
- 사업자등록번호: 850-38-01085
- 통신판매업 신고번호: 제 2023-서울강동-1311호
- 사업장 주소: 서울특별시 관악구 남부순환로 1921-1, 401-A4호
- 문의 이메일: **jscorpor88@gmail.com**
- 카카오톡 오픈채팅: `https://open.kakao.com/me/pluscoach`
- ⚠️ 통신판매업 주소 변경 신고 미처리 (강동구 → 관악구)

---

## 6. 파일 구조 (Phase 11 완료 시점)

```
blogautopage/ (pluscoach/blogautopage, Public)
├── CNAME                                    # blog.pluscoach.co.kr
├── index.html                               # 랜딩페이지 (무료체험 숨김, 3플랜 표시, 플로팅 카톡 버튼)
├── privacy.html                             # 개인정보처리방침 + 플로팅 카톡 버튼
├── terms.html                               # 이용약관 + 플로팅 카톡 버튼
├── refund.html                              # 환불규정 (평생 소유권 조항 포함) + 플로팅 카톡 버튼
├── assets/
│   ├── css/
│   │   ├── main.css                        # 랜딩페이지 스타일
│   │   ├── legal.css                       # 법적 페이지 공통 스타일
│   │   └── floating-kakao.css              # 카카오톡 플로팅 버튼 전용 스타일 (Phase 11)
│   └── js/
│       ├── config.js                       # SSOT — PLAN_CONFIG + APP_CONFIG
│       ├── main.js                         # UI 로직 + visible 기반 카드 숨김/라벨 주입
│       ├── form.js                         # create_order RPC + planKey→planCode 매핑 + PayApp 호출
│       └── payment.js                      # PayApp JS SDK 호출, PLAN_CONFIG 참조
├── supabase/
│   ├── config.toml                         # [on-new-order] + [payapp-webhook] verify_jwt = false
│   ├── migrations/
│   │   ├── 20260409000100_orders_table.sql
│   │   ├── 20260409000200_create_order_rpc.sql
│   │   ├── 20260409000300_create_license_rpc.sql
│   │   ├── 20260409000400_kakao_tokens.sql
│   │   ├── 20260409000500_notify_trigger.sql
│   │   ├── 20260410120000_create_license_fix_durations.sql  # monthly 31일, full 62일, lifetime 2099
│   │   └── 20260414120000_orders_plan_check_add_lifetime.sql
│   └── functions/
│       ├── on-new-order/
│       │   └── index.ts                    # 유료 조기 반환 + 무료 3중 알림 + 라이선스
│       ├── payapp-webhook/
│       │   └── index.ts                    # 페이앱 Webhook → 검증 → 라이선스 → 알림
│       └── _shared/
│           ├── kakao.ts                    # sendKakaoNotification + sendPaidOrderKakao
│           ├── telegram.ts                 # sendTelegramNotification + sendPaidOrderTelegram
│           ├── resend.ts                   # 접수 확인 + 인증키 이메일 (3종 분기)
│           ├── payapp.ts                   # parsePayappForm + verifyPayappLinkval
│           └── labels.ts                   # getPlanLabel + getPayTypeLabel
├── doc/
│   ├── 인수인계_v3_FINAL.md
│   ├── 인수인계_v4_Phase5완료.md
│   ├── 인수인계_v5_MVP완료.md
│   ├── 인수인계_v5_Phase10패치.md
│   ├── 인수인계_v6_Phase11완료.md         # ← 이 파일
│   ├── 구현_과정_가이드.md                 # Phase 1~11 Claude Code 작업 로그 (1535줄)
│   └── (기타 가이드/패치 문서들)
└── .gitignore                              # supabase/.env, supabase/.temp/ 등
```

---

## 7. 🔴 다음 대화창에서 가장 먼저 해야 할 일 — 무통장 입금 임시 결제 구조

### 배경
PG사(페이앱) 가입/심사가 안 되는 상황이 발생할 수 있음. 이 경우 **기존 페이앱 결제 코드를 삭제하지 않고 보존**하면서, **임시로 무통장 입금 구조를 추가**하여 매출이 끊기지 않도록 대응.

### 설계 방향 (다음 대화에서 구체화)

```
[고객] 플랜 선택 → 폼 제출
  ↓
[프론트] create_order RPC → orders INSERT (status='입금대기')
  ↓
[프론트] 무통장 입금 안내 모달 표시
  - 은행: (사장님 지정)
  - 계좌: (사장님 지정)
  - 예금주: 제이에스코퍼레이션 또는 오준석
  - 금액: 39,000원 / 59,000원 / 255,000원
  ↓
[고객] 입금 완료 후 모달에서 "입금 확인 요청" 버튼 클릭
  ↓
[프론트 → 백엔드] 주문 정보 전송:
  - 이메일
  - 핸드폰 번호 (신규 필드)
  - 결제 상품 (플랜명)
  - 입금자명
  - 주문 코드
  ↓
[사장님 텔레그램] 입금 확인 요청 알림 수신:
  "💳 입금 확인 요청
   이름: 오준석
   이메일: xxx@gmail.com
   전화번호: 010-xxxx-xxxx
   플랜: 풀 패키지 (59,000원)
   주문코드: 오준석-XXXX
   [이메일 전송하기] 버튼"
  ↓
[사장님] 실제 입금 확인 후 텔레그램에서 "이메일 전송" 확인
  ↓
[백엔드] create_license → orders UPDATE → 인증키 이메일 발송
  (기존 sendLicenseKeyEmail 재사용)
```

### 핵심 원칙
1. **기존 페이앱 결제 코드 삭제 금지** — 나중에 PG사 연동되면 바로 복귀 가능하게
2. **config.js SSOT 유지** — 결제 방식만 분기, 가격/플랜은 단일 출처
3. **기존 알림 시스템 재사용** — 텔레그램 봇, Resend 이메일 인프라 그대로
4. **수동 확인 포인트 = 사장님 텔레그램에서 "이메일 전송" 승인** — 자동 발송 아님 (입금 미확인 위험 방지)

### 다음 대화에서 결정할 사항
- [ ] 은행/계좌 정보 확정
- [ ] 핸드폰 번호 필드: 폼에 추가할지 (필수/선택)
- [ ] 텔레그램 "이메일 전송" 구현 방식:
  - **옵션 A**: 텔레그램 봇 인라인 버튼 → 봇이 Edge Function 호출 → 자동 발송
  - **옵션 B**: 텔레그램 알림 확인 후 사장님이 별도 관리 페이지에서 수동 발송
  - **옵션 C**: 텔레그램에 주문코드 표시 → 사장님이 Supabase Dashboard에서 직접 처리
- [ ] 페이앱 결제와 무통장의 전환 방식 (config.js에 `paymentMethod: 'bank_transfer' | 'payapp'` 같은 스위치?)
- [ ] orders 테이블 추가 필드 필요 여부 (phone, depositor_name 등)
- [ ] orders.plan CHECK 제약조건은 그대로 (플랜 자체는 변하지 않음, 결제 방식만 다름)

---

## 8. Phase 12 작업 계획 (무통장 구조 이후 진행)

### Phase 12A: 런칭 필수 마감 (2시간)
1. **OG 이미지** — 카톡/페북/트위터 공유 시 미리보기 이미지 (1200x630px)
2. **파비콘** — 브라우저 탭 아이콘 + iOS 홈 화면 아이콘
3. **스팸 안내 문구** — 폼 성공 토스트에 "이메일이 안 오면 스팸함 확인" 추가
4. **robots.txt + sitemap.xml** — 검색 엔진 크롤러 대응

### Phase 12B: 런칭 후 최적화 (1~2주에 걸쳐)
1. Lighthouse 점수 개선 (성능/접근성/SEO)
2. GA4 + Microsoft Clarity 설치 (방문자 트래킹)
3. 구글 서치콘솔 + 네이버 웹마스터 도구 등록
4. 404 페이지 커스터마이징
5. 이미지 alt 속성 정리

### Phase 13: 마케팅 (별도 영역)
- 광고 소재 제작 (네이버/메타/구글)
- 콘텐츠 마케팅 (블로그/유튜브)
- CRO (A/B 테스트, 히트맵)

---

## 9. 가드레일 (전체 누적, Phase 11까지)

1. **`licenses` 테이블 스키마 건드리지 말 것** — sequence 보정은 OK
2. **`pluscoach.co.kr` 루트 도메인 DNS 건드리지 말 것** — `blog.` 서브도메인만
3. **`service_role_key`는 Secrets + Vault에만** — 프론트 절대 노출 금지
4. **Edge Function 배포 시 `--no-verify-jwt` 필수**
5. **모든 Webhook은 항상 200 SUCCESS 반환** (페이앱/Trigger 재시도 방지)
6. **가격 변경은 `config.js`의 `PLAN_CONFIG`에서만** (SSOT)
7. **이메일 디자인 토큰 건드리지 말 것** (베이지/초록/word-break/RFC 2047)
8. **결제대기 orders 자동 삭제 금지** (리타겟팅 자산)
9. **GitHub 리포 Public 유지** (조직 Free 플랜 Pages 제약)
10. **카페24 CNAME 기존 레코드 수정/삭제 금지** — 추가만
11. **무료체험 코드 삭제 금지** — UI 숨김만 (visible: false)
12. **페이앱 결제 코드 삭제 금지** — 무통장 추가 시 보존, 나중에 PG 복귀 가능

---

## 10. 알려진 이슈 / 기술 부채

### 🟡 Gmail 스팸 분류 (초기 현상)
- Resend 도메인 `blog.pluscoach.co.kr` 평판 아직 낮음
- 자연 해결 (2~4주), 고객에겐 스팸함 확인 안내 필요

### 🟡 보안 키 재발급 미처리
- Kakao REST/Secret, 토큰, Telegram Bot Token 재발급 보류 중
- 운영 지속 시 반드시 처리 (Phase 12B 때 권장)

### 🟡 통신판매업 주소 변경 신고
- 강동구 → 관악구 변경 필요 (관악구청)

### 🟡 카톡 인앱 브라우저 플로팅 버튼
- 카톡 인앱에서 position:fixed 작동 안 함
- Chrome/Safari 직접 접속 시 정상
- 영향 미미하여 대응 보류 (Phase 12B 모니터링)

### 🟢 결제대기 orders 데이터 보존 (의도적)
- 리타겟팅 광고 자산 (메타/구글 맞춤 타겟용)
- 자동 삭제 금지

---

## 11. 환불 정책 요약

### 일반 유료 플랜 (1개월/풀패키지)
- 인증키 발급 전: 100% 환불
- 인증키 발급 후: 원칙 환불 불가
- 프로그램 오류 7일 내 미해결: 전액 환불
- 네이버 제재 증빙 시: 전액 환불
- 네이버 정책 변경 시: 잔여 기간 비례 환불

### 평생 소유권 (255,000원)
- 인증키 발급 전: 100% 환불
- 인증키 발급 후: 원칙 환불 불가
- 프로그램 오류 7일 내 미해결: 전액 환불
- 네이버 제재 증빙 시: 전액 환불
- 네이버 정책 변경 시: **부분 환불 공식 적용**
  - `환불액 = 255,000 − (경과 월수 × 20,000) − 결제 수수료(약 3.74%)`
  - **약 13개월 경과 시 환불 불가**
- 업데이트: **개발자 재량**, 사전 보장 없음 (환불 사유 아님)
- 고객 지원: 일반 플랜과 동일 (VIP 없음)
- 라이선스 유효: 시스템상 2099-12-31까지

---

## 12. 빠른 디버깅 SQL

### 최근 주문 확인
```sql
SELECT id, name, email, plan, amount, status, license_key, created_at
FROM orders ORDER BY created_at DESC LIMIT 10;
```

### 특정 주문 + 라이선스 연결 확인
```sql
SELECT o.id, o.name, o.email, o.plan, o.status, o.license_key,
       l.expires_at, EXTRACT(DAY FROM (l.expires_at - NOW()))::int AS days_left
FROM orders o
LEFT JOIN licenses l ON o.license_key = l.key
WHERE o.email = '사용자이메일'
ORDER BY o.created_at DESC;
```

### 카카오 토큰 만료 확인
```sql
SELECT id, access_token_expires_at,
       access_token_expires_at - NOW() AS time_left
FROM kakao_tokens;
```

### 라이선스 시퀀스 상태
```sql
SELECT MAX(id), (SELECT last_value FROM licenses_id_seq) FROM licenses;
```

### 플랜별 CHECK 제약 확인
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'orders_plan_check';
```

---

## 13. 새 대화창 Claude Code 킥오프

```
doc/인수인계_v6_Phase11완료.md 읽고 현재 상태 파악해줘.
추가로 doc/구현_과정_가이드.md 도 읽어줘 (Phase 1~11 작업 로그).

현재 상태 파악 후 보고:
- 로컬 리포 git status (커밋 안 된 파일?)
- 현재 배포된 Edge Function 목록
- config.js PLAN_CONFIG 현재 값
- 마지막 git log -3

보고 완료 후 대기.
다음 작업: 무통장 입금 임시 결제 구조 추가 (설계 대화창에서 지시 예정)
```

---

## 14. 문서 재편 계획 (권장, 아직 미착수)

현재 문서 상태:
- 인수인계 v3, v4, v5, v5 Phase10 패치, v6 (5개 버전)
- 구현_과정_가이드.md (1535줄 작업 로그)
- 기타 사전준비/배포/설계 가이드 다수

→ **유지보수 부담 증가.** 다음 세션 중 적절한 타이밍에 2개 문서로 통합 권장:
1. **PLAYBOOK_결제시스템구축.md** — 재사용 가능한 작업 플레이북 (프로젝트 독립적)
2. **STATE_현재운영상태.md** — 살아있는 현황판 (항상 최신)

기존 파일들은 `docs/archive/` 이동 후 히스토리로 보존.

---

**작성자**: 설계 대화창 Claude (Phase 10~11 완료 세션)
**상태**: Phase 11 완료, 무통장 입금 임시 구조 + Phase 12 대기
**라이브**: https://blog.pluscoach.co.kr
**다음 마일스톤**: 무통장 입금 임시 결제 → Phase 12A 런칭 마감 → 광고 집행 준비
