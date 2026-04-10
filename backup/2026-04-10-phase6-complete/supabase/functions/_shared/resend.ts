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

/**
 * Resend로 무료체험 인증키 이메일 발송
 */
export async function sendLicenseKeyEmail({
  to,
  name,
  licenseKey,
  downloadUrl,
}: {
  to: string;
  name: string;
  licenseKey: string;
  downloadUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #03C75A; font-size: 24px; margin: 0;">BlogAutoFriends</h1>
      </div>

      <p style="font-size: 16px; color: #333;">안녕하세요, <strong>${name}</strong>님</p>
      <p style="font-size: 15px; color: #555;">무료 체험 인증키가 발급되었습니다. 아래 인증키를 복사하여 프로그램에 입력해주세요.</p>

      <div style="background: #f0fdf4; border: 2px solid #03C75A; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #555;">인증키</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; font-family: 'Courier New', Courier, monospace; color: #1a1a1a; letter-spacing: 1px; word-break: break-all;">${licenseKey}</p>
      </div>

      <div style="background: #fff3cd; border-radius: 12px; padding: 16px 24px; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #856404;">⏰ <strong>유효 기간:</strong> 발급 시점부터 24시간</p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${downloadUrl}" style="display: inline-block; background: #03C75A; color: #fff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">프로그램 다운로드</a>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="margin: 0 0 16px 0; color: #333;">📖 사용 방법</h3>
        <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #555; line-height: 2;">
          <li>위 버튼을 눌러 프로그램을 다운로드한 뒤 <strong>압축 해제</strong></li>
          <li><strong>run.bat</strong> 파일을 실행</li>
          <li>인증키 입력란에 위 인증키를 <strong>붙여넣기</strong></li>
        </ol>
      </div>

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
      to: [to],
      subject: "[BlogAutoFriends] 무료 체험 인증키 발급 안내",
      html,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`Resend 인증키 이메일 발송 실패 (${res.status}): ${JSON.stringify(result)}`);
  }

  console.log("[resend] 인증키 이메일 발송 성공, id:", result.id);
}

function getPlanLabel(plan: string, amount: number): string {
  const labels: Record<string, string> = {
    free_trial: "무료 체험 (24시간)",
    monthly: `월간 플랜 (${amount.toLocaleString()}원)`,
    full_package: `풀 패키지 (${amount.toLocaleString()}원)`,
  };
  return labels[plan] || plan;
}
