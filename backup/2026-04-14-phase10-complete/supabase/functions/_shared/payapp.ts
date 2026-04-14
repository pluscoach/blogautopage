/**
 * PayApp 웹훅 요청 파싱 + 검증 유틸
 */

export interface PayappFeedback {
  userid: string;
  linkkey: string;
  linkval: string;
  goodname: string;
  price: number;
  pay_state: number; // 1=요청, 4=결제완료, 8/32=요청취소, 9/64=승인취소, 10=결제대기
  pay_type: number;
  mul_no: number; // 결제요청번호 (취소 시 사용)
  var1: string; // order_code 담음
  var2: string; // 'blogauto' 고정 (식별자)
  pay_date: string;
  reqdate: string;
}

/**
 * PayApp은 application/x-www-form-urlencoded 로 POST 전송.
 * formData()로 파싱하여 Record<string, string> 반환.
 */
export async function parsePayappForm(
  req: Request,
): Promise<Record<string, string>> {
  const formData = await req.formData();
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    result[key] = String(value);
  }
  return result;
}

/**
 * linkval 검증 — 상수시간 비교로 타이밍 공격 방지
 */
export function verifyPayappLinkval(linkval: string): boolean {
  const expected = Deno.env.get("PAYAPP_VALUE") ?? "";
  if (!expected || !linkval) return false;
  if (expected.length !== linkval.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ linkval.charCodeAt(i);
  }
  return mismatch === 0;
}
