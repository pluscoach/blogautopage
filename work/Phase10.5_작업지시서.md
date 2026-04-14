# Phase 10.5 작업 지시서 — 평생 소유권 신규 추가 + 가격 조정

**전달 대상**: Claude Code
**기준 문서**: `doc/인수인계_v5_MVP완료.md` + `doc/인수인계_v5_Phase10패치.md`
**작업 성격**: UI/UX 변경 + 신규 플랜 + 이메일 템플릿 확장 + DB 마이그레이션
**가드레일**: v5 가드레일 전부 유지

---

## 🎯 변경 목표 한눈에 보기

| 항목 | 변경 전 (Phase 10 종료 시점) | 변경 후 |
|---|---|---|
| 무료체험 (UI) | 표시 중 | **숨김 처리** (코드는 보존) |
| 1개월 플랜 | 39,000원 | 39,000원 (변경 없음) |
| 풀 패키지 | **69,000원** | **59,000원** (인하, 기존 수준 복구) |
| 평생 소유권 | 없음 | **255,000원 신규 추가** |
| 이메일 템플릿 | 2종 (무료 / 유료) | **3종** (무료 / 유료 기간제 / 평생) |
| 환불 페이지 | 기본 | **평생 소유권 조항 추가** |
| DB 라이선스 만료일 | monthly, full_package만 | **lifetime 추가 (2099-12-31)** |

---

## 📋 작업 순서 (Step 1~7)

### Step 1: DB 마이그레이션 — `create_license` RPC 수정

**가장 먼저 진행** (프론트가 결제 넘겨도 DB가 lifetime을 모르면 에러).

#### 1-1. 마이그레이션 파일 신규 작성

`supabase/migrations/` 폴더에 새 파일 생성. 파일명:
```
supabase/migrations/20260410120000_create_license_add_lifetime.sql
```

(타임스탬프는 기존 마지막 마이그레이션보다 큰 값, 14자리 필수)

#### 1-2. 파일 내용

기존 `create_license` RPC를 DROP 후 재생성하는 방식. CASCADE 사용 금지 (의존성 확인 후 진행):

```sql
-- Phase 10.5: create_license RPC에 lifetime plan 지원 추가
-- 작업일: 2026-04-10
-- 기존 플랜: free_trial (24h), monthly (1month + 7day), full_package (3month + 14day)
-- 추가 플랜: lifetime (2099-12-31 23:59:59 고정)

CREATE OR REPLACE FUNCTION public.create_license(
  p_buyer_name TEXT,
  p_plan TEXT,
  p_order_code TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license_key TEXT;
  v_expires_at TIMESTAMPTZ;
  v_short_code TEXT;
BEGIN
  -- order_code에서 뒷부분 짧은 코드 추출 (예: 오준석-9C2A → 9C2A)
  v_short_code := SPLIT_PART(p_order_code, '-', 2);
  
  -- 고유 라이선스 키 생성: BAF-{이름}{짧은코드}-{랜덤6자}
  v_license_key := 'BAF-' || p_buyer_name || v_short_code || '-' || 
                   UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT), 1, 6));
  
  -- 플랜별 만료일 계산
  v_expires_at := CASE p_plan
    WHEN 'free_trial'   THEN NOW() + INTERVAL '24 hours'
    WHEN 'monthly'      THEN NOW() + INTERVAL '1 month' + INTERVAL '7 days'
    WHEN 'full_package' THEN NOW() + INTERVAL '3 months' + INTERVAL '14 days'
    WHEN 'lifetime'     THEN '2099-12-31 23:59:59'::timestamptz
    ELSE NULL
  END;
  
  -- NULL 방지: 알 수 없는 plan이면 에러
  IF v_expires_at IS NULL THEN
    RAISE EXCEPTION 'Unknown plan: %', p_plan;
  END IF;
  
  -- licenses 테이블 INSERT
  INSERT INTO public.licenses (key, buyer_name, plan, expires_at, is_active)
  VALUES (v_license_key, p_buyer_name, p_plan, v_expires_at, true);
  
  RETURN v_license_key;
END;
$$;

-- 권한 유지 (service_role only)
REVOKE ALL ON FUNCTION public.create_license(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_license(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_license(TEXT, TEXT, TEXT) TO service_role;
```

⚠️ **중요 주의사항**:
1. **기존 마이그레이션 파일 `20260409000300_create_license_rpc.sql` 내용을 먼저 확인**하고, 위 SQL의 기존 플랜 부분(`free_trial`, `monthly`, `full_package` 기간)을 **기존 파일 값과 정확히 일치시킬 것**. 기존 기간 값이 다르면 위 SQL의 INTERVAL 부분을 기존 값으로 교체. 위 값은 표준 추정치이므로 반드시 크로스체크 필요.
2. `licenses` 테이블 컬럼명(`key`, `buyer_name`, `plan`, `expires_at`, `is_active`)도 기존 테이블 스키마와 정확히 일치하는지 확인
3. 라이선스 키 생성 방식도 기존 RPC의 로직 재사용 권장 — 기존 RPC를 먼저 읽고 기존 로직을 최대한 보존하면서 lifetime CASE만 추가하는 방향이 안전

#### 1-3. 운영 DB에 push (사장님 검수 필수)

마이그레이션 파일 작성 후 **먼저 사장님한테 SQL 내용 보여주고 검수받은 뒤** 다음 명령으로 push:

```bash
supabase db push
```

완료 후 검증 SQL (SQL Editor에서 직접 실행해서 확인):

```sql
-- lifetime plan으로 라이선스 발급 테스트 (테스트 후 DELETE)
SELECT public.create_license('테스트', 'lifetime', '테스트-TEST');
-- 반환값 확인 → expires_at이 2099-12-31인지 licenses 테이블 조회
SELECT key, plan, expires_at FROM licenses WHERE plan = 'lifetime' ORDER BY id DESC LIMIT 1;

-- 테스트 데이터 정리
DELETE FROM licenses WHERE key LIKE '%테스트TEST%';
```

---

### Step 2: `config.js` 수정 (SSOT)

**이 파일이 가격 구조의 단일 출처.** 다른 파일은 이 값을 참조.

```js
// assets/js/config.js

// ⚠️ 가격 변경은 이 파일에서만. payment.js와 index.html은 자동 반영됨.
// 현재 운영 가격: 1month=39000, full=59000, lifetime=255000
// 가격 정책 이력:
//   - Phase 10 테스트: 1month=1000, full=1000
//   - 2026-04-10 Phase 10 완료: 1month=39000, full=69000
//   - 2026-04-10 Phase 10.5 평생 소유권 추가: 1month=39000, full=59000, lifetime=255000
//     (full 69000→59000 인하, 평생 소유권 미끼 상품 신규 추가)

const PLAN_CONFIG = {
  free: {
    amount: 0,
    label: '무료체험 (0원)',
    name: '무료체험',
    planCode: 'free_trial',
    visible: false,  // ← UI에서 숨김, 코드는 보존
  },
  '1month': {
    amount: 39000,
    label: '1개월 플랜 (39,000원)',
    name: '블로그 자동화 1개월',
    planCode: 'monthly',
    visible: true,
  },
  full: {
    amount: 59000,
    label: '풀 패키지 (59,000원)',
    name: '블로그 자동화 풀패키지',
    planCode: 'full_package',
    visible: true,
  },
  lifetime: {
    amount: 255000,
    label: '평생 소유권 (255,000원)',
    name: '블로그 자동화 평생 소유권',
    planCode: 'lifetime',
    visible: true,
  },
};

window.PLAN_CONFIG = PLAN_CONFIG;
```

**추가된 것**: `visible` 필드 (true/false). 기존 객체 구조에 이 필드만 추가. 이걸로 UI 숨김 처리.

---

### Step 3: `main.js` 수정 — visible 플래그 기반 라벨 주입

DOMContentLoaded 시 PLAN_CONFIG 읽어서 카드 라벨 주입하는 기존 로직에, **visible=false면 해당 카드를 DOM에서 숨김** 처리 추가:

```js
document.querySelectorAll('[data-plan-key]').forEach(el => {
  const key = el.dataset.planKey;
  const cfg = window.PLAN_CONFIG?.[key];
  if (!cfg) return;
  
  // visible=false면 카드 자체를 숨김
  if (cfg.visible === false) {
    el.style.display = 'none';
    // 라디오 인풋도 비활성화 (숨겼는데 submit되면 안 되니까)
    const radio = el.querySelector('input[type="radio"]');
    if (radio) radio.disabled = true;
    return;
  }
  
  // 라벨 텍스트 주입 (기존 로직 유지)
  const labelEl = el.querySelector('.plan-label');
  if (labelEl) labelEl.textContent = cfg.label;
});
```

---

### Step 4: `index.html` 수정

#### 4-1. 무료체험 카드는 건드리지 말 것
`data-plan-key="free"` 카드는 HTML 그대로 두세요. `main.js`의 visible 체크가 런타임에 숨겨줍니다.

#### 4-2. 풀 패키지 카드
현재 `69,000원` 하드코딩이 남아있다면 제거 (SSOT 원칙대로 `<span class="plan-label"></span>` 빈 요소로 유지).

#### 4-3. 평생 소유권 카드 신규 추가

풀 패키지 카드 **바로 다음에** 평생 소유권 카드 추가. 기존 카드 구조를 복제하되 다음 차이점 적용:
- `data-plan-key="lifetime"`
- 라디오 `value="lifetime"`
- **"추천" 뱃지 없음** (미끼 상품이므로)
- 하위 설명 한 줄: `"한 번 구매, 평생 사용"` (라벨 아래 작은 글씨로)

구체 구조 (기존 카드 구조에 맞춰 조정 필요):

```html
<label data-plan-key="lifetime" class="plan-card">
  <input type="radio" name="plan" value="lifetime">
  <div class="plan-info">
    <span class="plan-label"></span>  <!-- main.js가 "평생 소유권 (255,000원)" 주입 -->
    <span class="plan-description">한 번 구매, 평생 사용</span>
  </div>
</label>
```

⚠️ **주의**: 실제 클래스명(`plan-card`, `plan-info`, `plan-description`)은 기존 HTML의 실제 클래스명에 맞춰야 함. 기존 1개월/풀패키지 카드 구조를 먼저 읽고 동일한 패턴 적용.

#### 4-4. "추천" 뱃지 위치 재확인
- 풀 패키지 카드에 **"추천" 뱃지 유지**
- 평생 소유권에는 뱃지 없음

---

### Step 5: `form.js` 수정 — lifetime 매핑 추가

기존 planKey 매핑 로직에 lifetime 추가:

```js
// 기존: '1month' → 'monthly', 'full' → 'full_package'
// 추가: 'lifetime' → 'lifetime'

var mappedPlan;
if (planKey === '1month') {
  mappedPlan = 'monthly';
} else if (planKey === 'full') {
  mappedPlan = 'full_package';
} else if (planKey === 'lifetime') {
  mappedPlan = 'lifetime';
} else {
  console.error('Unknown planKey:', planKey);
  return;
}
```

(또는 기존 구조가 삼항연산자라면 그대로 확장)

---

### Step 6: `_shared/labels.ts` + `_shared/resend.ts` 수정

#### 6-1. `labels.ts`에 lifetime 추가

```ts
export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    monthly: "1개월 플랜",
    full_package: "풀 패키지",
    free_trial: "무료 체험",
    lifetime: "평생 소유권",  // ← 신규
  };
  return labels[plan] || plan;
}
```

#### 6-2. `resend.ts` — 이메일 템플릿 3종 분기

현재 `sendLicenseKeyEmail`의 시그니처를 확장. 기존 `isPaid: boolean` 대신 `licenseType`을 명시적으로 받는 방식으로 개선:

```ts
// 기존: isPaid?: boolean
// 변경: licenseType?: 'trial' | 'paid_term' | 'lifetime' (기본값 'paid_term')

export async function sendLicenseKeyEmail({
  to,
  name,
  plan,
  licenseKey,
  downloadUrl,
  licenseType = 'paid_term',  // 기본값
  isPaid,  // ← 하위호환용, 내부에서 licenseType으로 변환
}: {
  to: string;
  name: string;
  plan?: string;
  licenseKey: string;
  downloadUrl: string;
  licenseType?: 'trial' | 'paid_term' | 'lifetime';
  isPaid?: boolean;  // deprecated, 하위호환
}): Promise<void> {
  // 하위호환: isPaid가 명시적으로 false면 trial, true면 paid_term (plan이 lifetime이면 lifetime)
  if (isPaid === false) licenseType = 'trial';
  else if (isPaid === true && plan === 'lifetime') licenseType = 'lifetime';
  else if (isPaid === true) licenseType = 'paid_term';
  
  // 3종 분기에 따라 이메일 본문 조정
  // ...
}
```

**이메일 본문 분기 포인트**:

| 요소 | trial (무료체험) | paid_term (1개월/풀패키지) | lifetime (평생) |
|---|---|---|---|
| 제목 | `[블로그 자동화 솔루션] 무료체험 인증키가 발급되었어요` | `[블로그 자동화 솔루션] 정식판 인증키가 발급되었어요` | `[블로그 자동화 솔루션] 평생 소유권 인증키가 발급되었어요 🎉` |
| 이용 기간 안내 | "24시간 동안 사용 가능" | "N개월 동안 사용 가능 (+보너스)" | **"평생 이용 가능"** |
| 혜택 카드 | 무료체험용 | 유료 플랜별 | "평생 소유권 · 한 번 구매, 평생 사용" |
| 환불 안내 | 기존 문구 | 기존 문구 | "평생 소유권은 인증키 발급 후 환불 조건이 엄격합니다. 환불 규정 페이지를 참고해주세요." + refund.html 링크 |
| 만료일 표시 | 발급일 + 24시간 | 발급일 + 기간 | **표시 안 함** (또는 "제한 없음") |

**주의사항**:
- **디자인 토큰 절대 변경 금지** (베이지 배경, 네이버 초록 CTA, 검정 가이드 버튼, word-break 인라인, RFC 2047 from 헤더)
- 기존 무료/유료 호출부(`on-new-order/index.ts`, `payapp-webhook/index.ts`)와 **하위호환 유지** — 기존 `isPaid` 파라미터가 제거되면 안 됨
- `payapp-webhook/index.ts`에서 평생 소유권 결제 시 `sendLicenseKeyEmail` 호출 부분에 `licenseType: 'lifetime'` 또는 `plan: 'lifetime'`을 명시적으로 넘기도록 로직 보강

---

### Step 7: `refund.html` 업데이트

**별도 지침 파일 참조**: `doc/refund_update_instructions.md` 파일에 상세 지침 포함. 해당 파일의 3개 수정 항목을 정확히 반영:

1. 상단 강조 박스에 평생 소유권 경고 추가
2. 평생 소유권 환불 조항 신규 추가 (6개 조항)
3. 기존 유료 플랜 환불 조항에 상호참조 문구 추가

**핵심 값**:
- 부분 환불 공식: `255,000 − (경과 월수 × 20,000) − 결제 수수료`
- 약 13개월 경과 시 환불 불가
- 고객센터 이메일: `jscorpor88@gmail.com`
- 카카오톡 오픈채팅: `https://open.kakao.com/me/pluscoach`
- 라이선스 유효 기간 표기: `2099-12-31`

---

## 🧪 작업 후 검증 체크리스트

### DB 검증
- [ ] `supabase/migrations/` 에 신규 파일 존재
- [ ] `supabase db push` 성공
- [ ] SQL Editor에서 `create_license('테스트', 'lifetime', '테스트-TEST')` 호출 성공
- [ ] 반환된 라이선스의 `expires_at`이 `2099-12-31 23:59:59`
- [ ] 테스트 데이터 정리 완료

### 프론트엔드 검증 (시크릿 브라우저에서)
- [ ] `blog.pluscoach.co.kr` 접속 시 **무료체험 카드 안 보임**
- [ ] 1개월 플랜 (39,000원) 표시
- [ ] 풀 패키지 (59,000원) 표시 + "추천" 뱃지 유지
- [ ] **평생 소유권 (255,000원) 표시** + "한 번 구매, 평생 사용" 설명 + 뱃지 없음
- [ ] 평생 소유권 라디오 선택 가능
- [ ] 평생 소유권 선택 후 제출 시 페이앱 결제창에 "255,000원" 정상 표시
- [ ] 페이앱 결제창 좌측 상단에 "블로그 자동화 평생 소유권" 표시

### 이메일 검증 (실결제 1건 — Phase 10 테스트 방식 참고)
- [ ] 평생 소유권 결제 완료 시 인증키 이메일 도착
- [ ] 제목에 "평생 소유권"
- [ ] 이용 기간 안내가 "평생 이용 가능"
- [ ] 혜택 카드에 "평생 소유권 · 한 번 구매, 평생 사용"
- [ ] 환불 안내에 refund.html 링크 포함
- [ ] 만료일 표시 안 됨 (또는 "제한 없음")
- [ ] 디자인 토큰 그대로 유지 (베이지/네이버 초록/word-break 정상)
- [ ] 카톡/텔레그램 "💰 결제 완료" 알림에 `플랜: 평생 소유권 (255,000원)` 정확히 표시

### 환불 페이지 검증
- [ ] `refund.html` 접속 시 상단 강조 박스에 평생 소유권 경고 표시
- [ ] 평생 소유권 환불 조항 6개 하위 항목 모두 표시
- [ ] 환불 공식이 코드 블록 스타일로 강조됨
- [ ] 고객센터 이메일/카톡 링크 정상 작동

---

## 📌 배포 순서 (중요)

**반드시 다음 순서로 진행**:

1. **Step 1 먼저** (DB 마이그레이션) — 프론트보다 DB가 먼저 준비돼야 함
2. Step 2~6 (프론트 + Edge Function)
3. Step 7 (환불 페이지)
4. Edge Function 재배포 (resend.ts 변경 때문):
   ```bash
   supabase functions deploy on-new-order --no-verify-jwt
   supabase functions deploy payapp-webhook --no-verify-jwt
   ```
5. Git commit + push
   - 메시지: `"feat: Phase 10.5 - 평생 소유권 추가, 풀패키지 인하, 무료체험 UI 숨김"`
6. GitHub Pages 자동 배포 대기 (1~2분)

---

## ⚠️ 가드레일 (반드시 준수)

1. **DB 마이그레이션 push 전 사장님 검수 필수** — SQL 내용 먼저 보여주고 확인받을 것
2. **`licenses` 테이블 스키마 변경 금지** — RPC만 수정, 테이블 컬럼은 건드리지 말 것
3. **기존 `isPaid` 파라미터 하위호환 유지** — 기존 호출부 깨지지 않게
4. **이메일 디자인 토큰 절대 변경 금지** (Phase 6.5 완성본 유지)
5. **무료체험 코드 삭제 금지** — UI 숨김만
6. **SSOT 원칙 유지** — 가격은 `config.js`에서만
7. **모든 Webhook은 항상 200 SUCCESS 반환** (기존 설계 유지)

---

## 📊 작업 완료 보고 형식

Claude Code는 작업 완료 시 다음 형식으로 보고:

1. **Step별 체크** — 각 Step 완료 여부 (1~7)
2. **수정/생성 파일 목록** (경로 + 줄 수 + 주요 변경)
3. **DB 마이그레이션 파일 내용** (Step 1 SQL 전체, 사장님 검수용)
4. **Edge Function 재배포 결과** (on-new-order, payapp-webhook)
5. **Git 커밋 해시**
6. **검증 체크리스트 결과** (위 섹션, 가능한 항목까지)
7. **다음 단계 필요 항목** (예: 실결제 테스트, refund.html 구조 확인 필요 등)

---

## ❓ Claude Code가 작업 시작 전 먼저 확인할 것

1. **기존 `create_license` RPC의 실제 SQL 내용 확인**
   - 파일: `supabase/migrations/20260409000300_create_license_rpc.sql`
   - `licenses` 테이블 컬럼명 정확한 값
   - 기존 plan별 expires_at 계산 공식
   - 라이선스 키 생성 로직

2. **현재 `index.html`의 플랜 카드 HTML 구조** 확인
   - 실제 클래스명 (.plan-card, .plan-badge 등)
   - 추천 뱃지가 어떻게 구현돼 있는지
   - data-plan-key 속성 위치

3. **`refund.html`의 현재 구조** 확인
   - 조 번호 체계 (제1조, 제2조, ...)
   - 상단 강조 박스 클래스명
   - 유료 플랜 환불 조항 위치

4. **`_shared/resend.ts`의 현재 sendLicenseKeyEmail 구현** 확인
   - isPaid 분기가 어떤 영역에서 어떻게 일어나는지
   - 혜택 카드 구조 (풀패키지 +14일 추천 뱃지 부분)

이 4가지를 먼저 확인 보고하고, 사장님 OK 받은 후 Step 1 착수.

---

**기준일**: 2026-04-10
**작업자**: Claude Code + 설계 대화창 Claude
**다음 마일스톤**: Phase 10.5 완료 → 미끼 상품 전략 실험 시작
