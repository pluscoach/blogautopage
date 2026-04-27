# Meta Conversions API (CAPI) 통합 가이드

> "페이스북 광고 돌릴 때, 실제 구매자를 정확히 추적하려면 뭘 해야 하나?"
>
> 이 문서는 서버에서 Meta로 직접 구매 이벤트를 보내는 방법(CAPI)을 처음부터 끝까지 정리한 것입니다.

---

## 📋 목차

1. [CAPI가 뭔가요?](#1-capi가-뭔가요)
2. [왜 필요한가요?](#2-왜-필요한가요)
3. [작동 원리](#3-작동-원리)
4. [통합 순서 (전체 플로우)](#4-통합-순서-전체-플로우)
5. [Step 1: Meta Events Manager에서 토큰 발급](#step-1-meta-events-manager에서-토큰-발급)
6. [Step 2: 서버 환경변수 등록](#step-2-서버-환경변수-등록)
7. [Step 3: CAPI 모듈 작성](#step-3-capi-모듈-작성)
8. [Step 4: 결제 확정 시점에 호출](#step-4-결제-확정-시점에-호출)
9. [Step 5: 테스트 이벤트 검증](#step-5-테스트-이벤트-검증)
10. [Step 6: 원복 (테스트 코드 제거)](#step-6-원복-테스트-코드-제거)
11. [FAQ & 트러블슈팅](#faq--트러블슈팅)

---

## 1. CAPI가 뭔가요?

### 한 줄 요약

**내 서버에서 Meta 서버로 직접 "이 사람이 결제했다"는 신호를 보내는 기능.**

### 풀어서 설명

기존에 페이스북 광고의 구매 추적은 **브라우저**가 했습니다:

```
고객 브라우저 → Meta Pixel → Meta 서버
  ("이 사람 결제 페이지까지 갔어요!")
```

근데 브라우저 추적은 **불완전**해요:
- iOS 14.5+ 이후 Apple이 추적 제한 → 정확도 70% 이하
- 광고 차단 확장 프로그램 사용 시 추적 0%
- 쿠키 차단 시 추적 안 됨

그래서 Meta가 **서버끼리 직접 통신**하는 방법을 제공한 게 **CAPI (Conversions API)**:

```
내 서버 → Meta 서버
  ("박철수 고객이 방금 결제 완료했어. 금액 59,000원")
```

### 결과 비교

| 방식 | 정확도 | iOS 사용자 추적 | 광고 차단 회피 |
|---|---|---|---|
| **Pixel만 (브라우저)** | ~70% | ❌ 부정확 | ❌ 못함 |
| **CAPI (서버)** | **95%+** | ✅ 정확 | ✅ 가능 |
| **Pixel + CAPI 동시** | **99%+** | ✅ | ✅ |

---

## 2. 왜 필요한가요?

### 돈 나가는 이야기

**광고비 쓰는데 추적이 부정확하면:**

- Meta AI가 "누가 실제 구매했는지" 모름
- → 비슷한 사람 찾아주는 학습이 안 됨
- → 엉뚱한 사람한테 광고 계속 보여줌
- → **광고비 낭비**

### 구체적 시나리오

**광고비 월 90만원 쓴다고 가정:**

**CAPI 없이:**
```
광고 클릭 1,000명
폼 제출 100명        ← Meta는 이것까지만 추적
실제 결제 10명       ← Meta는 모름 ❌
  
Meta AI 학습: "폼 제출하는 사람을 찾자"
결과: 폼만 제출하고 결제 안 하는 사람들 계속 유입
```

**CAPI 있으면:**
```
광고 클릭 1,000명
폼 제출 100명
실제 결제 10명       ← Meta가 정확히 앎 ✅
  
Meta AI 학습: "실제로 결제하는 10명 같은 사람을 찾자"
결과: 결제 확률 높은 사람들 계속 유입
```

**똑같은 90만원 써도 CAPI 있으면 매출 2~3배 차이 날 수 있음.**

---

## 3. 작동 원리

### 전체 데이터 흐름

```
[고객]
  ↓ 사이트 방문 (Pixel이 브라우저에서 PageView 전송)
  ↓ 폼 제출 (Pixel이 Lead 이벤트 전송)
  ↓ 결제 시작 (Pixel이 InitiateCheckout 전송)
  ↓
[결제 확정]  ← 🔑 이 시점이 핵심
  ↓
[내 서버]
  ↓ 라이선스 발급, 이메일 발송 등 처리
  ↓
[서버 → Meta] 🆕 CAPI로 Purchase 이벤트 전송
  {
    event: "Purchase",
    value: 59000,
    currency: "KRW",
    email_hash: (SHA256),
    phone_hash: (SHA256)
  }
  ↓
[Meta 서버]
  → "이 사람 진짜 구매자! 비슷한 사람 더 찾아야지"
  → AI 학습 → 광고 최적화
```

### 왜 "결제 확정 시점"인가?

**결제 전 이벤트들은 허위일 수 있음:**

| 이벤트 | 허위 가능성 | 설명 |
|---|---|---|
| 폼 제출 | 높음 | 장난으로도 제출 가능 |
| "입금했어요" 버튼 클릭 | 중간 | 실제 입금 안 했을 수 있음 |
| **결제 확정** | **0%** | **돈이 진짜 들어왔거나, 카드 승인됨** |

그래서 **"진짜 돈 받은 순간"에 Meta로 신호** 보냅니다.

### 구체적 "결제 확정" 시점

결제 방식에 따라 다름:

| 결제 방식 | 확정 시점 |
|---|---|
| **무통장 입금** | 관리자가 입금 확인 후 **[승인] 버튼 클릭**한 순간 |
| **카드 결제 (PG사)** | PG사가 **웹훅**으로 "결제 성공" 알려준 순간 |
| **카카오페이/네이버페이** | 결제 완료 콜백 받은 순간 |
| **정기결제** | 매월 카드 승인된 순간 |

---

## 4. 통합 순서 (전체 플로우)

```
1. Meta Events Manager에서 CAPI 토큰 발급 (5분)
   ↓
2. 서버 환경변수에 토큰 + Pixel ID 등록 (2분)
   ↓
3. CAPI 공용 모듈 작성 (20분)
   ↓
4. 결제 확정 로직에 CAPI 호출 추가 (10분)
   ↓
5. 테스트 이벤트 코드로 검증 (15분)
   ↓
6. 테스트 코드 제거 후 원복 (5분)

✅ 완료!  (총 약 1시간)
```

---

## Step 1: Meta Events Manager에서 토큰 발급

### 1-1. Events Manager 접속

https://business.facebook.com/events_manager

### 1-2. Pixel 선택

좌측 **데이터 세트** → 본인 Pixel 클릭

### 1-3. 설정 탭 이동

상단 탭 중 **"설정"** 클릭

### 1-4. 전환 API 섹션 찾기

페이지 아래로 스크롤하면 **"전환 API"** 섹션 있음

### 1-5. 토큰 발급

**"직접 통합을 설정하세요"** 아래에:
- ⭐ **"Dataset Quality API로 설정"** 선택 (권장)
- **[액세스 토큰 만들기]** 버튼 클릭

### 1-6. 데이터 세트 선택

팝업 창에서 사용할 Pixel만 체크:
- ⚠️ **1개만** 선택 (여러 개 선택 시 토큰 권한 넓어짐 → 보안 위험)

### 1-7. 토큰 복사

긴 문자열(예: `EAAxxxxxxxxxxxxxx...`) 생성됨

**⚠️ 보안 수칙:**
- **메모장에 임시 저장**만
- 대화창, 이메일, 메신저에 **절대 붙여넣지 말기**
- 스크린샷에 포함되지 않게 주의
- 서버에 등록 후 메모장도 삭제

---

## Step 2: 서버 환경변수 등록

### 2-1. 환경변수 2개 등록

서버 환경에 맞게 등록:

**Supabase Edge Functions:**
```
Project Settings → Edge Functions → Secrets
→ Add new secret
```

**Vercel / Netlify:**
```
Project Settings → Environment Variables
```

**AWS Lambda:**
```
Configuration → Environment variables
```

**등록할 값:**

| 변수명 | 값 |
|---|---|
| `META_PIXEL_ID` | Pixel ID (예: 1234567890123456) |
| `META_CAPI_ACCESS_TOKEN` | 아까 발급받은 긴 토큰 문자열 |

### 2-2. 저장 후 확인

- 이름은 **정확히 대문자** 입력 (오타 주의)
- Value 앞뒤 공백 없이 붙여넣기
- 저장 후 Value는 다시 안 보이는 게 정상 (보안)

---

## Step 3: CAPI 모듈 작성

### 3-1. 설계 원칙

**공용 모듈로 만들기:**
- 여러 결제 방식(무통장, 카드 등)에서 재사용
- 한 군데만 고치면 모든 결제 방식에 반영
- 테스트 쉬움

**에러 격리:**
- CAPI 실패해도 결제 프로세스에 영향 없도록
- CAPI 에러는 로그만 남기고 조용히 넘어감

**개인정보 보호:**
- 이메일, 전화번호는 **SHA256 해시**로 익명화
- Meta는 해시 상태로만 받음

### 3-2. 모듈 코드 예시

**파일 위치:** `supabase/functions/_shared/meta-capi.ts` (또는 본인 프로젝트 구조)

```typescript
/**
 * Meta Conversions API (CAPI) 공용 모듈
 */

const META_API_VERSION = "v21.0";

/**
 * SHA256 해시 생성 (개인정보 익명화용)
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 전화번호 정규화 (+82 형식, 하이픈 제거)
 * 예: "010-1234-5678" → "821012345678"
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("010")) {
    return "82" + digits.substring(1);
  }
  if (digits.startsWith("82")) {
    return digits;
  }
  return digits;
}

/**
 * Meta CAPI Purchase 이벤트 전송
 *
 * @param params.orderCode - 주문코드 (event_id로 사용, 중복 방지)
 * @param params.email - 고객 이메일
 * @param params.phone - 고객 전화번호 (optional)
 * @param params.amount - 결제 금액 (원)
 * @param params.plan - 플랜 코드 (optional)
 * @param params.testEventCode - 테스트 코드 (검증용, 실운영은 없음)
 */
export async function sendMetaPurchaseEvent(params: {
  orderCode: string;
  email: string;
  phone?: string;
  amount: number;
  plan?: string;
  testEventCode?: string;
}): Promise<boolean> {
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");

  if (!pixelId || !accessToken) {
    console.error("[meta-capi] 환경변수 미설정");
    return false;
  }

  try {
    // 개인정보 해시
    const emailHash = await sha256(params.email);
    const phoneHash = params.phone
      ? await sha256(normalizePhone(params.phone))
      : undefined;

    // Unix timestamp (초 단위)
    const eventTime = Math.floor(Date.now() / 1000);

    const userData: Record<string, unknown> = {
      em: [emailHash],
    };
    if (phoneHash) {
      userData.ph = [phoneHash];
    }

    const customData: Record<string, unknown> = {
      value: params.amount,
      currency: "KRW",
    };
    if (params.plan) {
      customData.content_ids = [params.plan];
      customData.content_type = "product";
    }

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: "Purchase",
          event_time: eventTime,
          event_id: params.orderCode,
          action_source: "website",
          event_source_url: "https://본인도메인.com",
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    // 테스트 코드 (검증 시에만 추가)
    if (params.testEventCode) {
      payload.test_event_code = params.testEventCode;
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${accessToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(`[meta-capi] 전송 실패 (${res.status}):`, JSON.stringify(result));
      return false;
    }

    console.log(`[meta-capi] 전송 성공 (orderCode: ${params.orderCode})`);
    return true;
  } catch (err) {
    console.error("[meta-capi] 예외:", err);
    return false;
  }
}
```

### 3-3. 핵심 요소 설명

**`event_id` = 주문코드:**
- Pixel과 CAPI 양쪽에서 같은 이벤트 중복 전송될 수 있음
- Meta가 같은 `event_id`로 온 이벤트는 자동 중복 제거

**`em`, `ph` 해시 배열:**
- Meta 표준: 이메일은 `em`, 전화번호는 `ph`
- 배열로 전달 (여러 개 가능)

**`action_source: "website"`:**
- 이벤트 발생 출처 (website, app, phone_call, chat 등)

**`value`, `currency`:**
- 결제 금액 (숫자)
- 통화 코드 (KRW, USD 등)

---

## Step 4: 결제 확정 시점에 호출

### 4-1. 기존 결제 처리 함수 찾기

본인 시스템에서 **"결제 확정"** 처리하는 함수:

| 결제 방식 | 함수 예시 |
|---|---|
| 무통장 (텔레그램 승인) | `handleApprove()` |
| 카드 결제 (웹훅) | `handlePayappWebhook()` |
| 카카오페이 | `handleKakaoPayCallback()` |
| 정기결제 | `handleSubscriptionRenewal()` |

### 4-2. CAPI 호출 추가

**기존 코드 (예시):**
```typescript
async function handleApprove(orderCode: string) {
  // 1. 주문 조회
  const order = await getOrder(orderCode);
  
  // 2. 라이선스 발급
  const licenseKey = await createLicense(order);
  
  // 3. orders UPDATE
  await updateOrder(orderCode, { license_key: licenseKey, status: '결제완료' });
  
  // 4. 인증키 이메일 발송
  await sendLicenseKeyEmail(order.email, licenseKey);
  
  // 5. 텔레그램 메시지 편집
  await editTelegramMessage('✅ 완료됨');
}
```

**CAPI 호출 추가:**
```typescript
import { sendMetaPurchaseEvent } from "../_shared/meta-capi.ts";

async function handleApprove(orderCode: string) {
  // 1. 주문 조회
  const order = await getOrder(orderCode);
  
  // 2. 라이선스 발급
  const licenseKey = await createLicense(order);
  
  // 3. orders UPDATE
  await updateOrder(orderCode, { license_key: licenseKey, status: '결제완료' });
  
  // 4. 인증키 이메일 발송
  await sendLicenseKeyEmail(order.email, licenseKey);
  
  // 5. 텔레그램 메시지 편집
  await editTelegramMessage('✅ 완료됨');
  
  // 🆕 6. Meta CAPI Purchase 이벤트 전송
  await sendMetaPurchaseEvent({
    orderCode: order.order_code,
    email: order.email,
    phone: order.phone,
    amount: order.amount,
    plan: order.plan,
  });
}
```

### 4-3. 왜 맨 마지막에?

**순서가 중요:**
- 라이선스 발급, 이메일 발송 등 **핵심 비즈니스 로직 먼저**
- CAPI는 실패해도 괜찮은 **부가 작업**
- CAPI 실패가 라이선스 발급을 막으면 안 됨

**에러 처리:**
- `sendMetaPurchaseEvent`는 내부에서 try/catch
- 실패해도 `return false`만 하고 throw 안 함
- 호출부에서 `await`만 하면 문제 없음

### 4-4. 배포

본인 서버 환경에 맞게 배포:

**Supabase:**
```bash
supabase functions deploy telegram-callback
```

**Vercel/Netlify:** git push로 자동 배포

---

## Step 5: 테스트 이벤트 검증

### 5-1. 테스트 이벤트 코드 발급

**Meta Events Manager → 본인 Pixel → "이벤트 테스트" 탭**

1. "각 안내를 받을 마케팅 채널을 선택하세요" → **"웹사이트"** 선택
2. "테스트를 실행하려면" 섹션에 **`test_event_code: TEST12345`** 같은 코드 생성됨
3. **[복사]** 버튼으로 코드 복사

### 5-2. 코드에 테스트 코드 임시 추가

**Step 4에서 작성한 CAPI 호출 부분을 임시 수정:**

```typescript
await sendMetaPurchaseEvent({
  orderCode: order.order_code,
  email: order.email,
  phone: order.phone,
  amount: order.amount,
  plan: order.plan,
  testEventCode: "TEST12345",  // 🧪 임시 테스트용 (검증 후 반드시 제거!)
});
```

### 5-3. 재배포

```bash
supabase functions deploy telegram-callback
```

### 5-4. 실제 결제 플로우 테스트

본인 시스템으로 **실제 결제 한 건** 완료:
- 본인 이메일로 주문
- 결제 방식에 따라 끝까지 진행
- 관리자 승인 등 필요한 작업까지 완료

### 5-5. Events Manager에서 확인

"이벤트 테스트" 탭 열어둔 상태에서:
- 30초 ~ 2분 기다림
- 목록에 **Purchase 이벤트** 표시됨

**성공 지표:**

| 항목 | 기대값 |
|---|---|
| 이벤트 이름 | **구매** (Purchase) |
| 수신 | **서버** ⭐ |
| 설정 방법 | 직접 설정 |
| 이벤트 ID | 주문코드 |
| 값 | 결제 금액 |
| 통화 | KRW |

**"서버"** 출처로 표시되면 CAPI 정상 작동 100% 확인.

---

## Step 6: 원복 (테스트 코드 제거)

### ⚠️ 이 단계를 건너뛰면 광고비 낭비!

**테스트 코드 남겨두면:**
- 실제 운영 시 모든 Purchase 이벤트가 **테스트 데이터로 분류**
- Meta AI가 광고 학습 못함
- 광고비 쓰지만 최적화 안 됨

### 6-1. 코드에서 testEventCode 제거

```typescript
await sendMetaPurchaseEvent({
  orderCode: order.order_code,
  email: order.email,
  phone: order.phone,
  amount: order.amount,
  plan: order.plan,
  // testEventCode 줄 삭제 ✅
});
```

### 6-2. 재배포

```bash
supabase functions deploy telegram-callback
```

### 6-3. 확인

- 다음 실제 주문부터 **정상 Purchase 이벤트**로 분류
- Meta Events Manager "개요" 탭에서 일반 이벤트로 표시됨

### 6-4. 권장: 공용 모듈에는 파라미터 유지

**`_shared/meta-capi.ts`의 `testEventCode` 파라미터는 남겨두세요:**
- 나중에 재검증할 때 다시 사용 가능
- 단지 호출부에서 값을 전달하지 않으면 프로덕션 모드

---

## FAQ & 트러블슈팅

### Q1. CAPI만 써도 되나요? Pixel도 있어야 하나요?

**A.** 이상적으로는 **둘 다** 설치:
- Pixel: 브라우저 이벤트 (PageView, Lead, InitiateCheckout 등)
- CAPI: 결제 확정 (Purchase)

둘 다 있으면 Meta가 **교차 검증**해서 정확도 최대화.

**단, Purchase 이벤트만 놓고 보면 CAPI만 있어도 충분.**

---

### Q2. Pixel과 CAPI에서 같은 이벤트를 중복으로 보내면?

**A.** `event_id`로 중복 제거됨.

**원리:**
- Pixel과 CAPI에 **같은 event_id** 사용 (예: 주문코드)
- Meta가 같은 event_id 여러 번 받으면 1건으로 처리
- **Pixel이 먼저 도착하면 Pixel 버전 채택, 늦게 오는 CAPI는 무시** (또는 데이터 보강용)

**현실적으로:**
- 주문 완료 페이지에서 Pixel `Purchase` 이벤트도 발사
- 동시에 서버에서 CAPI `Purchase` 이벤트 발사
- 같은 event_id(주문코드) 사용 → 중복 제거 자동

---

### Q3. 이메일/전화 해시 왜 소문자로?

**A.** Meta 공식 가이드라인:

```
email: "HELLO@gmail.com" → "hello@gmail.com" → sha256
phone: "+82-10-1234-5678" → "821012345678" → sha256
```

- 소문자 + 공백 제거 + 정규화된 형식
- 광고 클릭한 사람이 입력한 값과 **정확히 같은 해시** 만들기 위해

---

### Q4. 테스트 이벤트가 "이벤트 테스트" 탭에 안 나타나요

**A.** 체크포인트:

1. **테스트 코드 정확히 입력했나?** (예: TEST12345)
2. **서버에 재배포 됐나?** (코드 수정 후 반드시 재배포)
3. **환경변수 METAPIXEL_ID, META_CAPI_ACCESS_TOKEN 등록됐나?**
4. **"이벤트 테스트" 탭 새로고침 해봤나?**
5. **서버 로그 확인** (`[meta-capi] 전송 성공` 로그 있나?)

**서버 로그 확인:**
```bash
# Supabase
supabase functions logs telegram-callback
```

---

### Q5. 403 Forbidden 오류가 뜨면?

**A.** 원인:
- 토큰이 잘못됨 (만료, 오타)
- 토큰 권한이 부족 (해당 Pixel에 권한 없음)

**해결:**
1. Events Manager에서 토큰 재발급
2. 환경변수 업데이트
3. 재배포

---

### Q6. 같은 주문을 두 번 승인하면?

**A.** 같은 `event_id`로 두 번 보내져도 Meta가 중복 제거.

**다만:**
- 보통 시스템에서 "이미 처리된 주문은 다시 처리 못하게" 막아두는 게 정석
- 텔레그램 승인 버튼도 한 번만 작동하도록 구현

---

### Q7. 카드 결제로 바꾸면 CAPI 코드 다시 작성해야 하나요?

**A.** 아뇨. **공용 모듈**로 만들어뒀으면 재사용 가능.

**예시:**
```typescript
// 무통장 승인
await sendMetaPurchaseEvent({ ... });

// 카드 결제 웹훅 (payapp, tossPayments 등)
await sendMetaPurchaseEvent({ ... });  // 같은 함수 호출
```

**호출부만 추가**하면 됨. CAPI 로직은 한 곳에서 관리.

---

### Q8. CAPI에서 보낼 수 있는 이벤트는?

**A.** Meta 표준 이벤트 전부 가능:

| 이벤트 | 언제 발사 |
|---|---|
| `PageView` | 페이지 방문 (보통 Pixel) |
| `Lead` | 폼 제출 (보통 Pixel) |
| `InitiateCheckout` | 결제 페이지 진입 |
| `AddToCart` | 장바구니 추가 |
| `Purchase` | **결제 확정** ⭐ |
| `CompleteRegistration` | 회원가입 완료 |
| `Subscribe` | 구독 시작 |
| `StartTrial` | 무료 체험 시작 |

**가장 중요한 건 `Purchase`.** 이게 있어야 광고 ROAS 정확 측정.

---

### Q9. 실수로 테스트 이벤트가 실제 데이터에 섞이면?

**A.** 복구 방법:

1. Events Manager → 본인 Pixel → **"이벤트 테스트"** 탭
2. **"활동 지우기"** 버튼 (또는 "데이터 삭제" 같은 옵션)
3. 잘못 들어간 테스트 이벤트 삭제 가능

**예방:**
- Step 6 **원복 작업 반드시 수행**
- 커밋 메시지에 "⚠️ 테스트 코드 제거 필요" 메모

---

### Q10. CAPI 잘 작동하는지 어떻게 정기 점검?

**A.** 월 1회 체크:

1. Events Manager → 본인 Pixel → **"개요"** 탭
2. 최근 Purchase 이벤트 확인:
   - **출처: 서버**로 분류된 이벤트가 있나?
   - 실제 매출 건수와 일치하나?
3. **이벤트 일치율(Event Match Quality)** 점수 확인:
   - 7~10점 = 좋음
   - 5~6점 = 개선 여지 있음
   - 5점 이하 = 해시 데이터 문제 가능

---

## 📌 정리 체크리스트

### 구현 시 체크리스트

- [ ] Meta Events Manager에서 CAPI 액세스 토큰 발급
- [ ] 서버 환경변수 2개 등록 (`META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`)
- [ ] 공용 CAPI 모듈 작성 (`meta-capi.ts`)
- [ ] `sendMetaPurchaseEvent` 함수 export
- [ ] 결제 확정 함수에 `sendMetaPurchaseEvent` 호출 추가
- [ ] `event_id = 주문코드`로 설정 (중복 방지)
- [ ] 이메일, 전화번호 SHA256 해시 처리
- [ ] 에러 격리 (CAPI 실패가 결제 플로우 안 막게)
- [ ] 서버 재배포
- [ ] 테스트 이벤트 코드로 검증
- [ ] Events Manager에서 "서버" 출처 Purchase 확인
- [ ] ⚠️ 테스트 코드 제거 후 재배포 (원복)

### 광고 집행 전 최종 점검

- [ ] 실제 주문 1건 완료 후 Events Manager에서 확인
- [ ] 일반 Purchase 이벤트(테스트 아님)로 표시되는지
- [ ] 이벤트 ID, 값, 통화 정상인지
- [ ] 서버 로그에 에러 없는지

---

## 💡 결제 방식별 CAPI 추가 가이드

### 무통장 입금 (관리자 수동 승인)

**발사 시점:** 관리자가 승인 버튼 클릭

**함수 예시:** `handleApprove()`

**특징:**
- 허위 클릭 가능성 없음 (관리자가 입금 확인 후)
- 가장 정확

### 카드 결제 (PG사 웹훅)

**발사 시점:** PG사 웹훅이 "결제 성공" 알려준 순간

**함수 예시:** `handlePayappWebhook()`, `handleTossPaymentsWebhook()`

**특징:**
- 자동화되어 실시간
- 중복 웹훅 가능성 → event_id로 중복 제거

### 카카오페이/네이버페이

**발사 시점:** 결제 완료 콜백 받은 순간

**함수 예시:** `handleKakaoPayCallback()`

**특징:**
- 콜백 검증(signature 체크) 후 CAPI 호출

### 정기결제 (구독)

**발사 시점:** 매월 카드 자동 결제 성공 순간

**함수 예시:** `handleSubscriptionRenewal()`

**특징:**
- 매번 CAPI 발사 → Meta가 고객 생애 가치(LTV) 학습
- `event_id`는 매월 새로 생성 (예: `주문코드-2026-04`)

---

## 🎯 마지막 정리

### CAPI 없이 광고 돌리면 안 되나?

- **돌릴 수는 있음**. Pixel만으로도 광고 가능.
- **하지만 광고비 월 50만원 이상 쓸 계획이면 CAPI 필수.**
- 정확한 ROAS 측정 + AI 학습 최적화로 **장기 수익성** 결정.

### 한 번 세팅하면 계속 쓸 수 있나?

- **네.** 한 번 통합하면 결제 방식 바뀌어도 호출부만 추가.
- 토큰 만료는 없음 (Meta 정책상 무기한 사용 가능, 재발급은 보안 이슈 시에만)

### 앞으로 추가할 수 있는 것?

- **Lead, AddToCart 등 다른 이벤트도 서버측으로 전환**
- **ViewContent (상품 상세 페이지 조회)** 추가 → 리마케팅 정확도↑
- **Custom Audience 업로드** (CAPI와 별개): 기존 고객 리스트로 Lookalike 타겟 생성

---

## 📚 참고 자료

- Meta CAPI 공식 문서: https://developers.facebook.com/docs/marketing-api/conversions-api
- Meta 이벤트 카탈로그: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters
- Events Manager: https://business.facebook.com/events_manager
- Graph API Explorer (테스트용): https://developers.facebook.com/tools/explorer

---

**기억할 한 줄:**

> **결제 확정 순간 → 서버에서 Meta로 직접 신호 → 광고 최적화**

이게 CAPI의 전부입니다. 🚀
