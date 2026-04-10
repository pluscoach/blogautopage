const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@blog.pluscoach.co.kr";
const FROM_NAME_B64 = btoa(String.fromCharCode(...new TextEncoder().encode("블로그 자동화 솔루션")));
const FROM_HEADER = `=?UTF-8?B?${FROM_NAME_B64}?= <${RESEND_FROM_EMAIL}>`;

/**
 * Resend로 사용자에게 접수 확인 이메일 발송
 */
export async function sendOrderConfirmationEmail(order: Record<string, unknown>): Promise<void> {
  const planLabel = getPlanLabel(order.plan as string, order.amount as number);

  const html = `
    <div style="background:#faf9f6; padding:40px 20px; font-family:'Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif;">
      <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:20px; padding:48px 40px; border:1px solid #f0ede5;">

        <div style="text-align:center; margin-bottom:24px;">
          <span style="display:inline-block; background:#E8F5E9; color:#02b350; font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px;">네이버 블로그 서이추 자동화</span>
        </div>

        <h1 style="font-size:28px; font-weight:800; line-height:1.35; color:#0A0A0A; margin:0 0 20px 0; text-align:center;">
          ${order.name}님,<br>주문이 접수되었어요
        </h1>

        <p style="font-size:15px; line-height:1.75; color:#555; margin:0 0 8px 0;">
          상위 1% 블로거들이 조용히 사용하는 <strong>비밀 무기</strong>를 신청해주셔서 감사합니다.
        </p>
        <p style="font-size:15px; line-height:1.75; color:#555; margin:0 0 32px 0;">
          ${order.name}님의 블로그 성장을 위한 무기가 되기 바랄게요.
        </p>

        <div style="background:#faf9f6; border-radius:16px; padding:24px; margin-bottom:20px;">
          <p style="margin:0 0 14px 0; font-size:11px; font-weight:600; color:#888; letter-spacing:1px;">ORDER INFO</p>
          <table style="width:100%; font-size:14px; color:#555;">
            <tr><td style="padding:4px 0;">플랜</td><td style="text-align:right; font-weight:600;">${planLabel}</td></tr>
            <tr><td style="padding:4px 0;">주문 코드</td><td style="text-align:right; font-weight:600;">${order.order_code}</td></tr>
          </table>
        </div>

        <div style="background:#E8F5E9; border-radius:16px; padding:24px; margin-bottom:36px;">
          <p style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#02b350;">✉️ 다음 단계</p>
          <p style="margin:0 0 12px 0; font-size:14px; line-height:1.75; color:#555;">
            잠시 후 같은 이메일로 <strong>인증키와 다운로드 안내</strong>가 도착합니다. 보통 1~2분 안에 받아보실 수 있어요.
          </p>
          <p style="margin:0; font-size:14px; line-height:1.75; color:#02b350;">
            곧 도착할 인증키 메일에 <strong>24시간 카운트다운</strong> 안내가 포함되어 있으니 꼭 확인해주세요!
          </p>
        </div>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <p style="margin:0 0 14px 0; font-size:11px; font-weight:700; color:#03C75A; letter-spacing:1px;">MAIL NOT ARRIVING?</p>
          <p style="margin:0 0 6px 0; font-size:14px; line-height:1.75; color:#555;">
            1. 스팸 메일함을 먼저 확인해주세요.
          </p>
          <p style="margin:0; font-size:14px; line-height:1.75; color:#555;">
            2. 그래도 없다면 아래 카카오톡 채널로 문의해주세요.
          </p>
        </div>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; text-align:center;">
          <div style="margin-bottom:16px;">
            <a href="https://open.kakao.com/me/pluscoach" style="display:inline-block; font-size:13px; color:#0A0A0A; text-decoration:none; padding:10px 20px; border:1px solid #e5e5e5; border-radius:999px; font-weight:600;">💬 카카오톡 오픈채팅</a>
          </div>
          <p style="font-size:12px; color:#999; margin:0 0 12px 0;">메일이 늦게 도착하거나 문제가 있다면 스팸함을 먼저 확인해주세요</p>
          <p style="font-size:14px; color:#555; margin:0 0 8px 0;">다시 한 번 신청해주셔서 감사합니다. 좋은 하루 보내세요!</p>
          <p style="font-size:11px; color:#bbb; font-style:italic; margin:0;">블로그 자동화 솔루션 운영팀 드림</p>
        </div>

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
      from: FROM_HEADER,
      to: [order.email as string],
      subject: "[블로그 자동화 솔루션] 주문이 접수되었어요",
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
    <div style="background:#faf9f6; padding:40px 20px; font-family:'Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif;">
      <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:20px; padding:48px 40px; border:1px solid #f0ede5;">

        <div style="text-align:center; margin-bottom:24px;">
          <span style="display:inline-block; background:#E8F5E9; color:#02b350; font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px;">네이버 블로그 서이추 자동화</span>
        </div>

        <h1 style="font-size:28px; font-weight:800; line-height:1.35; color:#0A0A0A; margin:0 0 20px 0; text-align:center;">
          ${name}님,<br>환영합니다 🎉
        </h1>

        <p style="font-size:15px; line-height:1.75; color:#555; margin:0 0 8px 0;">
          상위 1% 블로거들이 조용히 사용하는 <strong>비밀 무기</strong>를 손에 넣으셨습니다.
        </p>
        <p style="font-size:15px; line-height:1.75; color:#555; margin:0 0 32px 0;">
          아래 사용법을 끝까지 읽어보시고, 궁금한 점은 언제든 편하게 문의해주세요.
        </p>

        <div style="background:#faf9f6; border-radius:16px; padding:24px; margin-bottom:24px; text-align:center;">
          <p style="margin:0 0 10px 0; font-size:11px; font-weight:600; color:#888; letter-spacing:1px;">YOUR LICENSE KEY</p>
          <p style="margin:0; font-size:20px; font-weight:700; font-family:ui-monospace,'SF Mono',Menlo,monospace; color:#0A0A0A; word-break:break-all;">${licenseKey}</p>
        </div>

        <a href="${downloadUrl}" style="display:block; background:linear-gradient(90deg,#03C75A,#00D4AA); color:#fff; text-align:center; font-size:16px; font-weight:700; padding:18px; border-radius:14px; text-decoration:none;">프로그램 다운로드 →</a>

        <a href="https://www.notion.so/phomean/33b1f9e9a5ab8094b653c7b16e9006e5?source=copy_link" style="display:block; background:#0A0A0A; color:#fff; text-align:center; font-size:14px; font-weight:600; padding:14px; border-radius:14px; text-decoration:none; margin-top:10px; margin-bottom:36px;">📖 프로그램 사용 가이드 보기</a>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <div style="background:#fef7f0; border-left:3px solid #f59e0b; border-radius:4px; padding:16px 18px; margin-bottom:12px;">
            <p style="margin:0 0 8px 0; font-size:14px; font-weight:700; color:#0A0A0A;">⏰ 카운트다운은 지금부터 시작됩니다</p>
            <p style="margin:0; font-size:13px; line-height:1.7; color:#666;">
              인증키가 <strong>발급된 시점부터 24시간</strong>이 자동으로 차감됩니다.
              프로그램을 언제 처음 실행하든 관계없이, 이 메일을 받으신 지금부터 타이머가 돌아갑니다.
              되도록 <strong>바로 다운로드해서 사용</strong>하시길 권장드려요.
            </p>
          </div>
          <div style="background:#fef7f0; border-left:3px solid #f59e0b; border-radius:4px; padding:16px 18px;">
            <p style="margin:0 0 8px 0; font-size:14px; font-weight:700; color:#0A0A0A;">인증키 발급 후에는 환불이 어렵습니다</p>
            <p style="margin:0; font-size:13px; line-height:1.7; color:#666;">
              디지털 상품의 특성상, 인증키가 한 번 발급되면 환불 처리가 불가능합니다.
              이 점 양해 부탁드리며, 혹시 궁금한 점이 있으시다면
              <strong>반드시 발급 전에</strong> 카카오톡 채널로 먼저 문의해주세요.
            </p>
          </div>
        </div>

        <div style="margin-bottom:36px;">
          <p style="margin:0 0 18px 0; font-size:11px; font-weight:700; color:#03C75A; letter-spacing:1px;">사용 방법 · 1분이면 끝</p>

          <div style="display:flex; align-items:flex-start; margin-bottom:14px;">
            <div style="min-width:26px; width:26px; height:26px; background:#0A0A0A; color:#fff; border-radius:50%; text-align:center; line-height:26px; font-size:13px; font-weight:700; margin-right:14px;">1</div>
            <p style="margin:0; font-size:14px; line-height:1.75; color:#555; padding-top:2px;">다운로드한 파일을 <strong>압축 해제</strong>합니다</p>
          </div>
          <div style="display:flex; align-items:flex-start; margin-bottom:14px;">
            <div style="min-width:26px; width:26px; height:26px; background:#0A0A0A; color:#fff; border-radius:50%; text-align:center; line-height:26px; font-size:13px; font-weight:700; margin-right:14px;">2</div>
            <p style="margin:0; font-size:14px; line-height:1.75; color:#555; padding-top:2px;"><strong>run.bat</strong> 파일을 실행합니다</p>
          </div>
          <div style="display:flex; align-items:flex-start; margin-bottom:8px;">
            <div style="min-width:26px; width:26px; height:26px; background:#0A0A0A; color:#fff; border-radius:50%; text-align:center; line-height:26px; font-size:13px; font-weight:700; margin-right:14px;">3</div>
            <p style="margin:0; font-size:14px; line-height:1.75; color:#555; padding-top:2px;">인증키 입력란에 위 인증키를 <strong>붙여넣습니다</strong></p>
          </div>
          <p style="margin:0; font-size:12px; color:#999; padding-left:40px; line-height:1.6;">윈도우 보안 경고가 뜨면 "추가 정보 → 실행"을 눌러주세요. 정상 동작입니다.</p>
        </div>

        <div style="background:#faf9f6; border-radius:16px; padding:24px; margin-bottom:36px;">
          <p style="margin:0 0 10px 0; font-size:14px; font-weight:700; color:#0A0A0A;">⚠️ 프로그램 실행 전 꼭 확인</p>
          <p style="margin:0 0 14px 0; font-size:13px; line-height:1.7; color:#666;">아래 두 파일을 먼저 확인해주세요. 건너뛰면 정상 작동하지 않을 수 있습니다.</p>
          <p style="margin:0 0 10px 0; font-size:13px; line-height:1.7; color:#555;">
            • <strong>★프로그램 실행 전 꼭 봐주세요★</strong> (메모장)<br>
            <span style="padding-left:14px; color:#888;">폴더 안에 있습니다. 반드시 먼저 읽어주세요.</span>
          </p>
          <p style="margin:0; font-size:13px; line-height:1.7; color:#555;">
            • <strong>정식 버전 사용법</strong> (파일)<br>
            <span style="padding-left:14px; color:#888;">한도 제한 없이 사용하려면 함께 확인해주세요.</span>
          </p>
        </div>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <p style="margin:0 0 6px 0; font-size:18px; font-weight:800; color:#0A0A0A; text-align:center;">💎 24시간 안에 정식판을 구매하시면</p>
          <p style="margin:0 0 20px 0; font-size:14px; color:#666; text-align:center;">체험 기간을 <strong style="color:#03C75A;">추가로</strong> 드립니다</p>

          <!--[if mso]><table role="presentation" width="100%"><tr><td width="50%" valign="top"><![endif]-->
          <div style="display:inline-block; width:48%; vertical-align:top; margin-right:2%;">
            <div style="background:#faf9f6; border-radius:14px; padding:18px 16px; text-align:center;">
              <p style="margin:0 0 6px 0; font-size:13px; color:#555;">1개월 이용권</p>
              <p style="margin:0 0 4px 0; font-size:20px; font-weight:800; color:#0A0A0A;">+ 7일</p>
              <p style="margin:0; font-size:12px; color:#888;">추가 사용</p>
            </div>
          </div>
          <!--[if mso]></td><td width="50%" valign="top"><![endif]-->
          <div style="display:inline-block; width:48%; vertical-align:top;">
            <div style="background:linear-gradient(135deg,#E8F5E9,#faf9f6); border:2px solid #03C75A; border-radius:14px; padding:18px 16px; text-align:center; position:relative;">
              <div style="position:absolute; top:-9px; left:50%; transform:translateX(-50%); background:#03C75A; color:#fff; font-size:10px; font-weight:700; padding:2px 10px; border-radius:999px;">추천</div>
              <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#02b350;">풀 패키지</p>
              <p style="margin:0 0 4px 0; font-size:20px; font-weight:800; color:#02b350;">+ 14일</p>
              <p style="margin:0; font-size:12px; color:#02b350;">추가 사용</p>
            </div>
          </div>
          <!--[if mso]></td></tr></table><![endif]-->

          <p style="margin:16px 0 0 0; font-size:12px; color:#888; text-align:center;">마음에 드시면 카카오톡 채널로 문의해주세요</p>
        </div>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; text-align:center;">
          <div style="margin-bottom:16px;">
            <a href="https://open.kakao.com/me/pluscoach" style="display:inline-block; font-size:13px; color:#0A0A0A; text-decoration:none; padding:10px 20px; border:1px solid #e5e5e5; border-radius:999px; font-weight:600;">💬 카카오톡 오픈채팅</a>
          </div>
          <p style="font-size:12px; color:#999; margin:0 0 12px 0;">메일이 늦게 도착하거나 문제가 있다면 스팸함을 먼저 확인해주세요</p>
          <p style="font-size:11px; color:#bbb; font-style:italic; margin:0;">블로그 자동화 솔루션 운영팀 드림</p>
        </div>

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
      from: FROM_HEADER,
      to: [to],
      subject: "[블로그 자동화 솔루션] 인증키가 발급되었어요 🎉",
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
