# BlogAutoFriends 인수인계 v5 — Phase 10 패치

**기준 문서**: `인수인계_v5_MVP완료.md` (이 파일과 함께 읽을 것)
**패치 작성일**: 2026-04-10
**상태**: **Phase 10 완료 → 유료 결제 100% 자동화 → 완전 무인 운영 진입** ✅
**작업자**: 사장님(jsrb0) + 설계 대화창 Claude + Claude Code

---

## 🎯 새 대화창 Claude에게 전달할 첫 메시지

> "BlogAutoFriends 운영 이어서 진행할 거야. Phase 1~10 전부 완료돼서 `blog.pluscoach.co.kr`에서 실제 유료 결제까지 100% 자동화된 상태야. 이 패치 문서 + `인수인계_v5_MVP완료.md` 읽고 맥락 잡아줘. 그리고 Phase 11부터 같이 진행하자."

함께 첨부할 문서:
1. `인수인계_v5_Phase10패치.md` (이 파일, 최신 상태 요약)
2. `인수인계_v5_MVP완료.md` (Phase 1~9 마스터)
3. (선택) `인수인계_v4_Phase5완료.md`, `인수인계_v3_FINAL.md` — 히스토리 참고용

---

## 📌 1줄 요약

v5 이후 **Phase 10(페이앱 결제 자동화)** 완료. 유료 플랜 폼 제출 → 페이앱 JS API 결제창 → Webhook 수신 → 라이선스 자동 발급 → 정식판 인증키 이메일 + 카톡/텔레그램 결제완료 알림까지 **실전 테스트 통과**(카카오페이 1,000원 승인 → 프로그램 29일 라이선스 활성화 확인). 가격 복구 완료, Phase 11~13 대기.

---

## 1. Phase 10에서 추가/변경된 것

### 🆕 신규 파일

| 파일 | 역할 |
|---|---|
| `supabase/functions/_shared/payapp.ts` | 페이앱 Webhook 파싱 + linkval 검증 유틸 |
| `supabase/functions/_shared/labels.ts` | `getPlanLabel`, `getPayTypeLabel` 공통 매핑 |
| `supabase/functions/payapp-webhook/index.ts` | 페이앱 Webhook 수신 → 라이선스 발급 → 알림 |
| `assets/js/payment.js` | PayApp JS SDK(`payapp-lite.js`) 호출, `window.requestPayappPayment` 전역 함수 |

### 🔧 수정된 파일

| 파일 | 변경 내용 |
|---|---|
| `supabase/functions/on-new-order/index.ts` | **유료 플랜 조기 반환 추가** — `plan !== 'free_trial'`이면 즉시 200 SUCCESS. 유료는 payapp-webhook이 처리. 기존 무료체험 로직은 한 단계 언인덴트, 기능 동일. |
| `supabase/functions/_shared/kakao.ts` | `sendPaidOrderKakao` 함수 추가 (토큰 자동 갱신 재사용). 결제완료 전용 템플릿. |
| `supabase/functions/_shared/telegram.ts` | `sendPaidOrderTelegram` 함수 추가. 동일한 파라미터 구조. |
| `supabase/functions/_shared/resend.ts` | `sendLicenseKeyEmail` 시그니처 확장 — `plan?`, `isPaid?` optional. `isPaid=true`일 때 제목 "정식판~", 유료 플랜용 혜택 카드로 분기. 디자인 토큰은 Phase 6.5 그대로 유지. |
| `supabase/config.toml` | `[functions.payapp-webhook] verify_jwt = false` 추가 |
| `assets/js/config.js` | **SSOT 리팩터링** — 가격/라벨/이름/planCode를 `window.PLAN_CONFIG` 단일 객체로 통합. 가격 변경은 이 파일 한 곳에서만. |
| `assets/js/payment.js` | `PLAN_CONFIG` 참조 방식으로 변경 (하드코딩 제거) |
| `assets/js/form.js` | `1month → monthly`, `full → full_package` 매핑 후 `window.requestPayappPayment` 호출. 무통장 모달 진입 로직 제거. |
| `assets/js/main.js` | DOMContentLoaded 시 `PLAN_CONFIG`로 카드 라벨 자동 주입. `closeModal` + `paymentModal` 리스너 제거. |
| `assets/css/main.css` | `.modal-overlay` 스타일 제거 |
| `index.html` | PayApp JS SDK `<script>` 태그 추가, 무통장 입금 모달 전체 제거, 결제 로딩 오버레이 추가, 플랜 카드에 `data-plan-key` + `<span class="plan-label">` 빈 요소(런타임 주입용) |

### 🗑️ 제거된 것
- 무통장 입금 모달 (HTML/JS/CSS 전부)
- `closeModal`, `paymentModal` 관련 핸들러
- `assets/js/config.js`, `assets/js/payment.js`, `index.html`에 흩어져있던 가격 하드코딩

---

## 2. 새로 생긴 Edge Function Secrets (4개)

Phase 10 시작 시 등록됨. 현재 총 14개 Secrets 운영 중.

| Secret | 값 | 용도 |
|---|---|---|
| `PAYAPP_USERID` | `dhwnstjr00` | 페이앱 가맹점 ID |
| `PAYAPP_LINKKEY` | (페이앱 관리자 → 설정 → 연동정보) | 결제 요청 식별 |
| `PAYAPP_VALUE` | (동일 경로) | Webhook `linkval` 검증용 |
| `DOWNLOAD_URL_PAID` | `https://drive.google.com/drive/folders/1OeWFuPwR7AIByryIt6jdPLQK1Pi7SYIz?usp=drive_link` | 정식판 구글 드라이브 폴더 |

---

## 3. 페이앱 대시보드 설정

- **가맹점 ID**: `dhwnstjr00`
- **가입일**: 2026-04-09
- **연동 방식**: JS API (`https://lite.payapp.kr/public/api/v2/payapp-lite.js`)
- **공통 통보 URL(feedbackurl)**: `https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/payapp-webhook`
- **사용 결제수단**: 신용카드, 계좌이체, 네이버페이, 카카오페이, 스마일페이, 애플페이, 페이코, 내통장결제, 토스페이, 휴대전화 등 11종
- **최소 결제금액**: **1,000원** (페이앱 시스템 제약, 에러코드 50054)
- **테스트 상점 신청**: 고객센터에 접수 완료 (2026-04-10), 승인 대기 중

---

## 4. 결제 자동화 전체 흐름 (최종 확정)

```
[사용자] blog.pluscoach.co.kr
  ↓ 유료 플랜 선택 + 폼 제출
[form.js] create_order RPC → orders INSERT (status 초기값)
  ↓ Trigger → on-new-order
  ↓ plan !== 'free_trial' → 조기 반환 SUCCESS (아무 알림 없음)
[payment.js] window.requestPayappPayment() → PayApp.payrequest()
  ↓ 페이앱 결제창 팝업 (var1 = order_code)
[사용자] 카드/간편결제 완료
  ↓
[PayApp 서버] → POST payapp-webhook (application/x-www-form-urlencoded)
  ↓
[payapp-webhook]
  1. linkval === PAYAPP_VALUE 검증 (상수시간 비교)
  2. pay_state !== 4(완료) 무시
  3. var1에서 order_code 추출
  4. orders 조회 + license_key 있으면 중복 방지
  5. body.price === order.amount 검증
  6. create_license RPC → 라이선스 발급
  7. orders.license_key + status='결제완료' UPDATE
  8. sendLicenseKeyEmail (isPaid=true, DOWNLOAD_URL_PAID)
  9. Promise.allSettled [sendPaidOrderKakao, sendPaidOrderTelegram]
  10. 모든 경로에서 "SUCCESS" 200 반환 (페이앱 재시도 방지)
```

**핵심 설계 원칙**:
- 모든 경로에서 `SUCCESS` 200 (페이앱 10회 재시도 회피)
- 에러는 `console.error`만 기록, 응답 상태는 유지
- `license_key` 중복 체크로 동일 Webhook 여러 번 와도 멱등
- `pay_state=9`(취소)는 무시 → 발급된 라이선스는 유지 (수동 환불 정책)

---

## 5. 가격 정책 (Phase 10 종료 시점)

SSOT: `assets/js/config.js`의 `PLAN_CONFIG` 객체

| 플랜 | planCode | 가격 | 포지셔닝 |
|---|---|---|---|
| 무료체험 | `free_trial` | 0원 (24시간) | 리드 수집 |
| 1개월 플랜 | `monthly` | **39,000원** | 진입장벽 |
| 풀 패키지 | `full_package` | **69,000원** | 마진 확보 (기존 59,000 → 인상) |

**가격 이력**:
- Phase 10 테스트: 1,000원 (페이앱 최소금액 제약)
- 2026-04-10 실운영: 39,000원 / 69,000원

**가격 변경 방법**: `config.js`의 `PLAN_CONFIG` 한 파일만 수정 → push. 화면/결제/DB/검증 전부 자동 반영. 백엔드 재배포 불필요.

---

## 6. Phase 10 검증 이력 (2026-04-10)

| 검증 항목 | 결과 |
|---|---|
| 무료체험 회귀 테스트 | ✅ 구조 변경 후에도 3중 알림 + 인증키 이메일 정상 |
| 유료 폼 제출 → 결제 전 알림 안 감 | ✅ on-new-order 조기 반환 확인 |
| 페이앱 결제창 호출 | ✅ JS API 정상 |
| 카카오페이 1,000원 실결제 | ✅ 승인번호 58212496 (order_code: 오준석-9C2A) |
| linkval 검증 | ✅ |
| 금액 검증 (1000===1000) | ✅ |
| create_license RPC | ✅ 라이선스 `BAF-오준석9C2A-E42479` 발급 |
| orders status='결제완료' UPDATE | ✅ |
| 정식판 인증키 이메일 | ✅ DOWNLOAD_URL_PAID로 수신함 도착 |
| 카톡/텔레그램 결제완료 알림 | ✅ planLabel="1개월 플랜", payTypeLabel="카카오페이" 정확 매핑 |
| 실제 프로그램 라이선스 활성화 | ✅ "인증: 오준석 (29일 남음)" |

**결제 취소 처리**: 페이앱 관리자에서 1,000원 건 즉시 취소. 시스템에는 영향 없음(`pay_state=9` 무시 설계). 라이선스 그대로 유지.

---

## 7. 알려진 이슈 / 기술 부채

### 🟡 이메일 스팸 분류 (Gmail 일부)
- **현상**: Resend 발송 이메일이 Gmail에서 가끔 스팸함 분류
- **원인**: `blog.pluscoach.co.kr` 도메인 평판이 아직 낮음 (최근 인증). SPF/DKIM/DMARC 모두 설정 완료 상태지만 발송 이력 부족.
- **대응**: 자연 해결 (2~4주 발송량 쌓이면서 평판 상승). 고객에겐 "스팸함 확인 요청" 안내 문구를 이메일 하단에 추가해둠.
- **우선순위**: 낮음, 모니터링만.

### 🟡 보안 키 재발급 미처리
- 설계 대화창에서 노출됐던 Kakao REST/Secret, 토큰, Telegram Bot Token 재발급 **여전히 보류**
- Phase 11 시작 전후 처리 권장

### 🟡 통신판매업 주소 변경 신고
- 강동구 → 관악구 변경 신고 필요 (관악구청)
- 전자상거래법 관련, 운영 지속 시 반드시 처리

### 🟢 결제대기 orders 정리 정책 = 방치 (의도적)
- 결제 안 하고 이탈한 주문은 DB에 보존
- **리타겟팅 광고 자산** (메타/구글 맞춤 타겟)
- 자동 삭제 금지

---

## 8. 다음 로드맵 (우선순위 그대로)

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 11 | 카카오톡 플로팅 채널 버튼 | 🔲 대기 |
| Phase 12 | 디자인 마감 (OG 이미지, 파비콘, Lighthouse, a11y, 스팸함 안내 문구 등) | 🔲 대기 |
| Phase 13 | 광고/마케팅/홍보 자료 제작 | 🔲 대기 |
| **별도** | **문서 재편 — 플레이북(PLAYBOOK) 형식으로 정리** | 🔲 **추천: 다음 세션 첫 작업** |

### 📝 문서 재편 계획 (다음 세션에서 진행)

현재 문서 상태:
- `인수인계_v3_FINAL.md`, `v4_Phase5완료.md`, `v5_MVP완료.md`, 이 패치 (4개 버전)
- `자동_결제_프로그램_배포_가이드.md` (Phase 1~5 이력, 804줄)
- `구현_과정_가이드.md` (Phase 1~8 Claude Code 로그, 974줄)

→ **유지보수 부담 증가.** 다음 세션 시작 시 아래 2개 문서로 재편 권장:
1. **`PLAYBOOK_결제시스템구축.md`** — 재사용 가능한 작업 플레이북 (300~500줄, 프로젝트 독립적)
2. **`STATE_현재운영상태.md`** — 살아있는 현황판 (항상 최신, 덮어쓰기)

기존 파일들은 `docs/archive/` 이동 후 히스토리로 보존.

---

## 9. 가드레일 (v5에서 그대로 승계 + Phase 10 추가)

1. `licenses` 테이블 스키마 건드리지 말 것 (sequence 보정은 OK)
2. `pluscoach.co.kr` 루트 도메인 DNS 건드리지 말 것
3. `service_role_key`는 Secrets + Vault에만, 프론트 절대 노출 금지
4. Edge Function 배포 시 `--no-verify-jwt` 필수
5. **모든 Webhook은 항상 200 SUCCESS 반환** (페이앱/Trigger 재시도 방지)
6. **가격 변경은 `config.js`의 `PLAN_CONFIG`에서만** (SSOT 원칙, 다른 파일 수정 시 가격 불일치 버그 발생 확정)
7. `_shared/resend.ts`의 이메일 디자인 토큰/반응형/RFC 2047 from 헤더 건드리지 말 것
8. 결제대기 `orders` 자동 삭제 금지 (리타겟팅 자산)
9. GitHub 리포 Public 유지 (조직 Free 플랜 Pages 제약)
10. 카페24 CNAME 기존 레코드 수정/삭제 금지, 추가만 가능

---

## 10. 빠른 디버깅 — Phase 10 추가

### 페이앱 Webhook 수신 확인
```
Supabase Dashboard → Edge Functions → payapp-webhook → Logs
```
정상 시 로그 순서: `결제 완료 수신` → `라이선스 발급 성공` → `인증키 이메일 발송 완료` → `kakao 결제 알림: ✅` → `telegram 결제 알림: ✅`

### 결제 성공했는데 시스템 처리 안 된 경우
```sql
-- 해당 주문 상태 확인
SELECT id, name, email, plan, amount, status, license_key, created_at
FROM orders
WHERE order_code = '오준석-XXXX';
```
- `status='결제완료'` 이고 `license_key` 채워짐 → 정상
- `status` 비어있거나 `결제대기` → Webhook 못 받음 (페이앱 공통 통보 URL 설정 확인)
- `status='금액불일치'` → PLAN_CONFIG와 실제 결제액 불일치
- `status='발급실패'` → create_license RPC 에러 (Logs 확인)
- `status='이메일실패'` → Resend API 에러 또는 DOWNLOAD_URL_PAID 미설정

### 페이앱 결제창 에러코드
- **50054**: 최소 결제금액 1,000원 미만

---

## 11. 새 대화창 킥오프 체크리스트

Phase 11 시작 시:

1. **이 패치 + v5 인수인계 첨부**
2. 위 "🎯 새 대화창 Claude에게 전달할 첫 메시지" 입력
3. Claude Code도 동일하게:
   ```
   docs/인수인계_v5_MVP완료.md + docs/인수인계_v5_Phase10패치.md 읽고
   현재 상태 파악해줘. Phase 11 카톡 플로팅 채널 버튼 작업 대기.
   ```
4. (선택) **문서 재편 먼저** 하고 싶으면:
   ```
   doc 폴더의 모든 인수인계/가이드 문서 재편 작업 들어가자.
   PLAYBOOK + STATE 2개 파일로 정리하고 기존 것들은 archive로.
   ```

---

**작성자**: 설계 대화창 Claude (Phase 10 완료 세션)
**상태**: ✅ 유료 결제 100% 자동화 완료, 완전 무인 운영 진입
**라이브**: https://blog.pluscoach.co.kr
**다음 마일스톤**: Phase 11 카카오톡 플로팅 채널 버튼 또는 문서 재편
