const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@blog.pluscoach.co.kr";

/**
 * Resend로 사용자에게 접수 확인 이메일 발송
 */
export async function sendOrderConfirmationEmail(order: Record<string, unknown>): Promise<void> {
  const planLabel = getPlanLabel(order.plan as string, order.amount as number);

  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #03C75A; font-size: 24px; margin: 0;">BlogAutoFriends</h1>
      </div>

      <p style="font-size: 16px; color: #333;">안녕하세요, <strong>${order.name}</strong>님</p>
      <p style="font-size: 15px; color: #555;">BlogAutoFriends에 관심 가져주셔서 감사합니다.</p>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px 0; color: #333;">📦 주문 정보</h3>
        <table style="width: 100%; font-size: 14px; color: #555;">
          <tr><td style="padding: 4px 0;">플랜</td><td style="text-align: right; font-weight: 600;">${planLabel}</td></tr>
          <tr><td style="padding: 4px 0;">주문 코드</td><td style="text-align: right; font-weight: 600;">${order.order_code}</td></tr>
        </table>
      </div>

      ${order.plan === "free_trial" ? "" : `
      <div style="background: #fff3cd; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: #856404;">💳 결제 안내</h3>
        <p style="margin: 0; font-size: 14px; color: #856404;">
          곧 담당자가 연락드려 결제 안내를 도와드리겠습니다.<br>
          (영업일 기준 1시간 이내)
        </p>
      </div>
      `}

      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
        <p style="font-size: 13px; color: #999;">
          문의: <a href="https://open.kakao.com/me/pluscoach" style="color: #03C75A;">카카오톡 오픈채팅</a>
        </p>
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `BlogAutoFriends <${RESEND_FROM_EMAIL}>`,
      to: [order.email as string],
      subject: "[BlogAutoFriends] 주문이 접수되었습니다",
      html,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`Resend 발송 실패 (${res.status}): ${JSON.stringify(result)}`);
  }

  console.log("[resend] 접수 확인 이메일 발송 성공, id:", result.id);
}

function getPlanLabel(plan: string, amount: number): string {
  const labels: Record<string, string> = {
    free_trial: "무료 체험 (24시간)",
    monthly: `월간 플랜 (${amount.toLocaleString()}원)`,
    full_package: `풀 패키지 (${amount.toLocaleString()}원)`,
  };
  return labels[plan] || plan;
}
