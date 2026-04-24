/**
 * Meta Conversions API (CAPI) 공용 모듈
 *
 * 서버측에서 Meta로 직접 이벤트 전송.
 * 개인정보는 SHA256 해시로 익명화.
 *
 * 재사용처:
 *  - telegram-callback: 무통장 승인 시 Purchase 발사
 *  - payapp-webhook: 카드 결제 성공 시 Purchase 발사 (dormant, 복귀 시 활성화)
 *  - on-new-order: (선택) 무료체험 CompleteRegistration 발사
 *
 * CAPI 실패 시 throw하지 않음 — 호출자가 try/catch 없이도 안전하게 사용.
 */

const META_API_VERSION = "v21.0";

/**
 * SHA256 해시 생성 (Meta CAPI 개인정보 익명화용)
 * Meta는 이메일·전화번호를 소문자 trim 후 SHA256 해시한 값을 기대함.
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 전화번호 정규화 (+82 형식으로, 하이픈 제거)
 * 예: "010-1234-5678" → "821012345678"
 * 예: "+82 10 1234 5678" → "821012345678"
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  // 010으로 시작하면 0 제거 후 82 붙임
  if (digits.startsWith("010")) {
    return "82" + digits.substring(1);
  }
  // 이미 82로 시작하면 그대로
  if (digits.startsWith("82")) {
    return digits;
  }
  // 기타 형식은 그대로 반환 (해외 번호 등)
  return digits;
}

/**
 * Meta CAPI Purchase 이벤트 전송
 *
 * @param params.orderCode - 주문코드 (event_id로 사용, 중복 방지)
 * @param params.email - 고객 이메일
 * @param params.phone - 고객 전화번호 (optional)
 * @param params.amount - 결제 금액 (원)
 * @param params.plan - 플랜 코드 (monthly, full_package, lifetime)
 * @returns 성공 여부 (실패해도 throw 안 함)
 */
export async function sendMetaPurchaseEvent(params: {
  orderCode: string;
  email: string;
  phone?: string;
  amount: number;
  plan?: string;
}): Promise<boolean> {
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");

  if (!pixelId || !accessToken) {
    console.error("[meta-capi] META_PIXEL_ID 또는 META_CAPI_ACCESS_TOKEN 미설정");
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

    // Meta CAPI 이벤트 페이로드
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

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: eventTime,
          event_id: params.orderCode,  // 주문코드를 event_id로 사용 → 중복 자동 제거
          action_source: "website",
          event_source_url: "https://blog.pluscoach.co.kr",
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${accessToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(`[meta-capi] Purchase 이벤트 전송 실패 (${res.status}):`, JSON.stringify(result));
      return false;
    }

    console.log(`[meta-capi] Purchase 이벤트 전송 성공 (orderCode: ${params.orderCode}, events_received: ${result.events_received})`);
    return true;
  } catch (err) {
    console.error("[meta-capi] Purchase 이벤트 전송 예외:", err);
    return false;
  }
}
