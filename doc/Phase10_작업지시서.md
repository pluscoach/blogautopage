# Phase 10 작업 지시서 — 페이앱 결제 자동화

**전달 대상**: Claude Code
**기준 문서**: `doc/인수인계_v5_MVP완료.md` (v5가 진실의 원천)
**연동 방식**: PayApp JS API (`https://lite.payapp.kr/public/api/v2/payapp-lite.js`)

---

## 🎯 목표

유료 플랜(1개월/풀패키지) 폼 제출 → PayApp 결제창 자동 호출 → 결제 완료 → Webhook 수신 → 라이선스 자동 발급 → 정식판 인증키 이메일 자동 발송.

## 🧭 전체 흐름

```
[유저] 유료 플랜 선택 → 이름/이메일 입력 → 제출
  ↓
form.js: create_order RPC (status='결제대기')
  ↓ orders INSERT → Trigger → on-new-order
  ├→ 카톡/텔레그램 "주문 접수" 알림 (기존 로직 유지)
  └→ 접수 확인 이메일 (기존 로직 유지)
  ↓ 프론트가 RPC 응답에서 order_code 받음
payment.js: PayApp.payrequest() 호출 (order_code를 var1에 담음)
  ↓ 페이앱 결제창 팝업
[유저] 카드/간편결제 완료
  ↓
[PayApp 서버] → POST https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/payapp-webhook
  ↓
payapp-webhook Edge Function:
  1. linkval === PAYAPP_VALUE 검증
  2. pay_state=1(요청) 무시, pay_state=4(결제완료)만 처리
  3. var1(order_code)로 orders 행 찾기
  4. price 일치 검증 (orders.amount === body.price)
  5. 이미 license_key 있으면 중복 처리 방지 → SUCCESS 반환
  6. create_license RPC → 라이선스 발급
  7. orders.license_key + status='결제완료' UPDATE
  8. sendLicenseKeyEmail (DOWNLOAD_URL_PAID 사용)
  9. 응답 body에 정확히 "SUCCESS" 텍스트 반환 (HTTP 200)
```

---

## 📋 작업 순서 (Step 1~3)

### Step 1: 백엔드 (Edge Function)

#### 1-1. 새 파일: `supabase/functions/_shared/payapp.ts`

페이앱 웹훅 요청 파싱 + 검증 유틸.

**구현 내용**:
- `parsePayappForm(req: Request): Promise<Record<string, string>>` — PayApp은 `application/x-www-form-urlencoded` 로 POST 전송함. `req.formData()` 사용해서 전 필드 파싱.
- `verifyPayappLinkval(linkval: string): boolean` — `Deno.env.get('PAYAPP_VALUE')` 와 상수시간 비교.
- 타입 정의:
  ```ts
  export interface PayappFeedback {
    userid: string;
    linkkey: string;
    linkval: string;
    goodname: string;
    price: number;
    pay_state: number;  // 1=요청, 4=결제완료, 8/32=요청취소, 9/64=승인취소, 10=결제대기
    pay_type: number;
    mul_no: number;     // 결제요청번호 (취소 시 사용)
    var1: string;       // order_code 담음
    var2: string;       // 'blogauto' 고정 (식별자)
    pay_date: string;
    reqdate: string;
  }
  ```

#### 1-2. 새 파일: `supabase/functions/payapp-webhook/index.ts`

**로직** (위 흐름의 Webhook 부분 그대로):

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parsePayappForm, verifyPayappLinkval } from '../_shared/payapp.ts';
import { sendLicenseKeyEmail } from '../_shared/resend.ts';

Deno.serve(async (req) => {
  // 항상 200 + SUCCESS 반환 (페이앱이 재시도 10회까지 때림)
  // 에러는 console.error 로만 기록
  try {
    const body = await parsePayappForm(req);
    
    // 1. linkval 검증
    if (!verifyPayappLinkval(body.linkval ?? '')) {
      console.error('[payapp-webhook] linkval 불일치', { linkval: body.linkval });
      return new Response('SUCCESS', { status: 200 });  // 악성 호출에 에러 노출 금지
    }
    
    // 2. pay_state=4(결제완료)만 처리. 1=요청, 10=대기는 무시
    const payState = parseInt(body.pay_state ?? '0');
    if (payState !== 4) {
      return new Response('SUCCESS', { status: 200 });
    }
    
    // 3. var1에서 order_code 추출
    const orderCode = body.var1 ?? '';
    if (!orderCode) {
      console.error('[payapp-webhook] order_code 없음');
      return new Response('SUCCESS', { status: 200 });
    }
    
    // 4. Supabase 클라이언트
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // 5. orders 조회
    const { data: order, error: selectErr } = await supabase
      .from('orders')
      .select('id, name, email, plan, amount, status, license_key, order_code')
      .eq('order_code', orderCode)
      .single();
    
    if (selectErr || !order) {
      console.error('[payapp-webhook] 주문 없음', orderCode);
      return new Response('SUCCESS', { status: 200 });
    }
    
    // 6. 중복 처리 방지 (이미 라이선스 발급됨)
    if (order.license_key) {
      console.log('[payapp-webhook] 이미 처리됨', orderCode);
      return new Response('SUCCESS', { status: 200 });
    }
    
    // 7. 금액 검증
    const paidPrice = parseInt(body.price ?? '0');
    if (paidPrice !== order.amount) {
      console.error('[payapp-webhook] 금액 불일치', { expected: order.amount, paid: paidPrice });
      await supabase.from('orders').update({ status: '금액불일치' }).eq('id', order.id);
      return new Response('SUCCESS', { status: 200 });
    }
    
    // 8. 라이선스 발급
    const { data: licenseKey, error: licenseErr } = await supabase.rpc('create_license', {
      p_buyer_name: order.name,
      p_plan: order.plan,
      p_order_code: order.order_code,
    });
    
    if (licenseErr || !licenseKey) {
      console.error('[payapp-webhook] 라이선스 발급 실패', licenseErr);
      await supabase.from('orders').update({ status: '발급실패' }).eq('id', order.id);
      return new Response('SUCCESS', { status: 200 });
    }
    
    // 9. orders UPDATE
    await supabase.from('orders').update({
      license_key: licenseKey,
      status: '결제완료',
    }).eq('id', order.id);
    
    // 10. 인증키 이메일 (DOWNLOAD_URL_PAID 사용)
    try {
      await sendLicenseKeyEmail({
        to: order.email,
        name: order.name,
        plan: order.plan,
        licenseKey,
        downloadUrl: Deno.env.get('DOWNLOAD_URL_PAID')!,
        isPaid: true,  // 무료/유료 템플릿 분기 플래그
      });
    } catch (e) {
      console.error('[payapp-webhook] 이메일 실패', e);
      await supabase.from('orders').update({ status: '이메일실패' }).eq('id', order.id);
    }
    
    return new Response('SUCCESS', { status: 200 });
  } catch (e) {
    console.error('[payapp-webhook] 예외', e);
    return new Response('SUCCESS', { status: 200 });
  }
});
```

**⚠️ 핵심 포인트**:
- **모든 경로에서 `SUCCESS` 200 반환** (에러 던지면 페이앱이 10회 재시도)
- 에러는 `console.error` 로만 기록
- `pay_state=1`(요청)은 JS API 연동 시 최초 노티되지만 우리는 무시
- `var1=order_code` 로 매칭 (우리가 JS에서 넘길 때 정함)

#### 1-3. `_shared/resend.ts` 수정

기존 `sendLicenseKeyEmail` 함수에 `isPaid: boolean` 옵션 추가. 유료일 때 이메일 본문 차이:
- 제목: 무료 `[블로그 자동화] 무료체험 인증키가 발급되었습니다` → 유료 `[블로그 자동화] 정식판 인증키가 발급되었습니다`
- 혜택 카드: 유료는 "24시간 체험" 문구 제거, 대신 플랜별 기간 표기 (1개월 +7일 / 풀패키지 +14일)
- 나머지 디자인(베이지 배경, 네이버 초록 CTA, 검정 가이드 버튼, `word-break` 인라인, 모바일 미디어쿼리, RFC 2047 한글 from 헤더)은 **절대 건드리지 말 것** — 이미 Phase 6.5에서 완성된 상태.

#### 1-4. Edge Function Secrets 등록

```bash
supabase secrets set PAYAPP_USERID=dhwnstjr00
supabase secrets set PAYAPP_LINKKEY=<연동 KEY 값>
supabase secrets set PAYAPP_VALUE=<연동 VALUE 값>
supabase secrets set DOWNLOAD_URL_PAID=https://drive.google.com/drive/folders/1OeWFuPwR7AIByryIt6jdPLQK1Pi7SYIz?usp=drive_link
```

#### 1-5. 배포

```bash
supabase functions deploy payapp-webhook --no-verify-jwt
```

배포 후 URL 확인: `https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/payapp-webhook`

---

### Step 2: 프론트엔드

#### 2-1. `index.html` 수정

**`<head>` 안에 PayApp JS SDK 추가**:
```html
<script src="https://lite.payapp.kr/public/api/v2/payapp-lite.js"></script>
```

**무통장 입금 모달 완전 제거** (v5 결정사항 A안):
- 기존 "무통장 입금 안내" 모달 HTML 전체 삭제
- 관련 CSS (`.payment-modal` 등) 삭제
- 관련 JS 핸들러 (`openPaymentModal`, `closePaymentModal` 등) 삭제

**결제 중 로딩 오버레이 추가**:
```html
<div id="paymentLoading" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;">
  <div style="background:#fff; padding:32px 40px; border-radius:16px; text-align:center;">
    <p style="margin:0; font-size:15px; color:#333;">결제창을 여는 중입니다...</p>
  </div>
</div>
```

#### 2-2. 새 파일: `assets/js/payment.js`

```js
// 유료 플랜별 가격 (서버 검증과 일치해야 함)
const PLAN_PRICES = {
  'month_1': 39000,      // 예시값, 실제 가격으로 수정
  'full_package': 99000, // 예시값, 실제 가격으로 수정
};

const PLAN_NAMES = {
  'month_1': '블로그 자동화 1개월',
  'full_package': '블로그 자동화 풀패키지',
};

/**
 * PayApp 결제창 호출
 * @param {object} params
 * @param {string} params.orderCode - create_order RPC가 반환한 order_code
 * @param {string} params.plan - 'month_1' | 'full_package'
 * @param {string} params.name - 구매자 이름
 * @param {string} params.email - 구매자 이메일
 */
export function requestPayappPayment({ orderCode, plan, name, email }) {
  const price = PLAN_PRICES[plan];
  const goodname = PLAN_NAMES[plan];
  
  if (!price || !goodname) {
    alert('플랜 정보가 올바르지 않습니다.');
    return;
  }
  
  // 로딩 표시
  const loading = document.getElementById('paymentLoading');
  if (loading) loading.style.display = 'flex';
  
  PayApp.setDefault('userid', 'dhwnstjr00');  // PAYAPP_USERID
  PayApp.setDefault('shopname', '블로그 자동화 솔루션');
  PayApp.setDefault('feedbackurl', 'https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/payapp-webhook');
  PayApp.setDefault('checkretry', 'y');  // 실패 시 10회 재시도
  PayApp.setDefault('smsuse', 'n');      // SMS 발송 안 함 (우린 이메일로 처리)
  PayApp.setDefault('redirectpay', '1'); // 결제창 바로 띄우기
  
  PayApp.setParam('goodname', goodname);
  PayApp.setParam('price', String(price));
  PayApp.setParam('recvphone', '01000000000'); // 더미값 (SMS 안 보내지만 필수 파라미터)
  PayApp.setParam('var1', orderCode);    // ★ 우리 매칭 키
  PayApp.setParam('var2', 'blogauto');   // 식별자
  PayApp.setParam('buyerid', email);
  
  PayApp.payrequest();
  
  // 결제창이 팝업으로 뜨므로 3초 후 로딩 숨김 (유저가 결제창에서 작업)
  setTimeout(() => {
    if (loading) loading.style.display = 'none';
  }, 3000);
}
```

#### 2-3. `assets/js/form.js` 수정

**기존 유료 플랜 분기**(현재는 무통장 모달 여는 부분)를 다음으로 교체:

```js
import { requestPayappPayment } from './payment.js';

// submitForm 함수 내부, create_order RPC 성공 후:
if (plan === 'free_trial') {
  // 기존 무료체험 성공 토스트 로직 유지
  showSuccessToast('무료체험 신청이 완료되었습니다! 이메일을 확인해주세요.');
} else {
  // 유료: PayApp 결제창 호출
  const orderCode = data.order_code;  // RPC 응답에서 추출
  requestPayappPayment({
    orderCode,
    plan,
    name: formData.name,
    email: formData.email,
  });
}
```

**⚠️ 확인 필요**: `create_order` RPC가 현재 `order_code`를 반환하는지 Claude Code가 먼저 마이그레이션 파일에서 확인할 것. 반환 안 하면 RPC 수정 필요 (RETURN TABLE에 order_code 추가). v5 문서에 RPC가 order_code를 생성한다고 돼있으니 반환도 하고 있을 확률 높음.

#### 2-4. `orders` 테이블 `amount` 컬럼 확인

v5 문서에 `orders` 컬럼에 `amount` 있다고 기록됨. 웹훅에서 금액 검증에 사용하므로 `create_order` 호출 시 프론트가 플랜별 가격을 `p_amount`로 넘기는지 확인. 안 넘기면 `form.js`에서 `PLAN_PRICES[plan]` 값으로 넘기도록 수정.

---

### Step 3: 페이앱 대시보드 설정 + 통합 테스트

#### 3-1. 페이앱 "공통 통보 URL" 입력

페이앱 관리자 → 설정 → 연동정보 → 공통 통보 URL 칸에:
```
https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/payapp-webhook
```
→ 변경 버튼 클릭.

⚠️ **Edge Function 배포 완료 후에 입력할 것.** 빈 URL이나 404 URL 등록 시 에러.

#### 3-2. 테스트 계획

1. **임시 가격 변경**: `payment.js`의 `PLAN_PRICES.month_1 = 1000` 로 수정 후 배포 (1,000원 테스트용)
2. `blog.pluscoach.co.kr` 에서 1개월 플랜 신청 (본인 이메일)
3. 확인:
   - [ ] 카톡/텔레그램 알림 도착 (기존 플로우)
   - [ ] 접수 확인 이메일 도착 (기존 플로우)
   - [ ] PayApp 결제창 뜸
4. 실제 본인 카드로 1,000원 결제
5. 확인:
   - [ ] Supabase `orders` 테이블: `status='결제완료'`, `license_key` 채워짐
   - [ ] Supabase `licenses` 테이블: 새 row, `plan='month_1'`
   - [ ] 정식판 인증키 이메일 도착 (DOWNLOAD_URL_PAID 링크)
6. 인증키로 실제 프로그램 활성화 테스트
7. **페이앱 관리자 → 결제 내역 → 1,000원 건 즉시 취소**
8. 취소 시 웹훅에 `pay_state=9` 들어오지만 우리 로직은 `pay_state=4`만 처리하므로 무시됨 (정상)
9. `payment.js` 가격을 실제 가격으로 복구 후 재배포
10. (선택) 실제 가격으로 최종 1건 테스트 → 즉시 취소

---

## 🔒 가드레일 재확인 (v5에서 그대로 승계)

1. `licenses` 테이블 스키마 건드리지 말 것 (sequence 보정은 OK)
2. `_shared/resend.ts` 의 이메일 템플릿 디자인 토큰/반응형/한글 from 헤더 건드리지 말 것 — Phase 6.5에서 완성된 상태
3. 모든 Edge Function은 `--no-verify-jwt` 플래그로 배포
4. Webhook은 항상 `SUCCESS` 200 반환 (페이앱 재시도 방지)
5. `service_role_key` 는 Secrets에만, 프론트 JS 절대 노출 금지
6. 운영 DB에 `supabase db push` 전 사장님 검수

---

## 📊 진행 보고 형식

Claude Code는 각 Step 완료 시 다음 형식으로 보고:

```
Step 1 완료 보고:
- 생성/수정한 파일 목록 (경로 + 줄 수)
- Secrets 등록 여부 (supabase secrets list 결과)
- 배포 결과 (supabase functions deploy 출력)
- 확인 필요한 이슈 (있다면)
```

---

## ❓ 작업 시작 전 Claude Code가 먼저 확인할 것

1. `supabase/migrations/20260409000200_create_order_rpc.sql` 읽고 `create_order` RPC 반환값 구조 확인 (`order_code` 반환 여부)
2. `supabase/migrations/20260409000100_orders_table.sql` 읽고 `amount` 컬럼 존재/타입 확인
3. `assets/js/form.js` 현재 유료 플랜 분기 로직 확인
4. `assets/js/config.js` 에 Supabase URL/anon key 포함 여부 확인 (payment.js에서 import 필요 없음, 이미 form.js 거쳐 옴)
5. `_shared/resend.ts` 현재 `sendLicenseKeyEmail` 시그니처 확인 (파라미터 구조 파악 후 `isPaid` 추가 방식 결정)

확인 결과 먼저 보고 → 사장님 검수 → Step 1 착수.

---

**작성자**: 설계 대화창 Claude  
**기준일**: 2026-04-10  
**다음 마일스톤**: Phase 10 완료 → 유료 결제 100% 자동화 → 완전 무인 운영 진입
