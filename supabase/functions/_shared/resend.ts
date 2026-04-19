const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@blog.pluscoach.co.kr";
const FROM_NAME_B64 = btoa(String.fromCharCode(...new TextEncoder().encode("블로그 자동화 솔루션")));
const FROM_HEADER = `=?UTF-8?B?${FROM_NAME_B64}?= <${RESEND_FROM_EMAIL}>`;

const EMAIL_STYLE = `
<style>
  @media screen and (max-width: 600px), screen and (max-device-width: 600px) {
    .email-wrapper { padding: 20px 12px !important; }
    .email-card { padding: 24px 20px !important; }
    .email-title { font-size: 17px !important; line-height: 1.3 !important; }
    .email-body { font-size: 12px !important; line-height: 1.65 !important; }
    .email-license-key { font-size: 16px !important; }
    .email-section-title { font-size: 13px !important; }
    .email-cta-btn { padding: 14px !important; font-size: 15px !important; }
    .email-guide-btn { padding: 12px !important; font-size: 13px !important; }
    .email-card-inner { padding: 18px !important; }
  }
</style>
`;

/**
 * Resend로 사용자에게 접수 확인 이메일 발송
 */
export async function sendOrderConfirmationEmail(order: Record<string, unknown>): Promise<void> {
  const planLabel = getPlanLabel(order.plan as string, order.amount as number);

  const html = `
    ${EMAIL_STYLE}
    <div class="email-wrapper" style="background:#faf9f6; padding:32px 16px; font-family:'Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif; word-break:keep-all; overflow-wrap:break-word;">
      <div class="email-card" style="max-width:560px; margin:0 auto; background:#fff; border-radius:20px; padding:36px 28px; border:1px solid #f0ede5; word-break:keep-all; overflow-wrap:break-word;">

        <div style="text-align:center; margin-bottom:24px;">
          <span style="display:inline-block; background:#E8F5E9; color:#02b350; font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px; word-break:keep-all; overflow-wrap:break-word;">네이버 블로그 서이추 자동화</span>
        </div>

        <h1 class="email-title" style="font-size:20px; font-weight:800; line-height:1.35; color:#0A0A0A; margin:0 0 20px 0; text-align:center; word-break:keep-all; overflow-wrap:break-word;">
          ${order.name}님,<br>주문이 접수되었어요
        </h1>

        <p class="email-body" style="font-size:13px; line-height:1.65; color:#555; margin:0 0 8px 0; word-break:keep-all; overflow-wrap:break-word;">
          상위 1% 블로거들이 조용히 사용하는 <strong>비밀 무기</strong>를 신청해주셔서 감사합니다.
        </p>
        <p class="email-body" style="font-size:13px; line-height:1.65; color:#555; margin:0 0 32px 0; word-break:keep-all; overflow-wrap:break-word;">
          ${order.name}님의 블로그 성장을 위한 무기가 되기 바랄게요.
        </p>

        <div class="email-card-inner" style="background:#faf9f6; border-radius:16px; padding:24px; margin-bottom:20px;">
          <p class="email-section-title" style="margin:0 0 14px 0; font-size:11px; font-weight:600; color:#888; letter-spacing:1px; word-break:keep-all; overflow-wrap:break-word;">ORDER INFO</p>
          <table style="width:100%; font-size:13px; color:#555;">
            <tr><td style="padding:4px 0; word-break:keep-all; overflow-wrap:break-word;">플랜</td><td style="text-align:right; font-weight:600; word-break:keep-all; overflow-wrap:break-word;">${planLabel}</td></tr>
            <tr><td style="padding:4px 0; word-break:keep-all; overflow-wrap:break-word;">주문 코드</td><td style="text-align:right; font-weight:600; word-break:keep-all; overflow-wrap:break-word;">${order.order_code}</td></tr>
          </table>
        </div>

        <div class="email-card-inner" style="background:#E8F5E9; border-radius:16px; padding:24px; margin-bottom:36px;">
          <p class="email-section-title" style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#02b350; word-break:keep-all; overflow-wrap:break-word;">✉️ 다음 단계</p>
          <p class="email-body" style="margin:0 0 12px 0; font-size:13px; line-height:1.65; color:#555; word-break:keep-all; overflow-wrap:break-word;">
            잠시 후 같은 이메일로 <strong>인증키와 다운로드 안내</strong>가 도착합니다. 보통 1~2분 안에 받아보실 수 있어요.
          </p>
          <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#02b350; word-break:keep-all; overflow-wrap:break-word;">
            곧 도착할 인증키 메일에 <strong>24시간 카운트다운</strong> 안내가 포함되어 있으니 꼭 확인해주세요!
          </p>
        </div>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <p class="email-section-title" style="margin:0 0 14px 0; font-size:11px; font-weight:700; color:#03C75A; letter-spacing:1px; word-break:keep-all; overflow-wrap:break-word;">MAIL NOT ARRIVING?</p>
          <p class="email-body" style="margin:0 0 6px 0; font-size:13px; line-height:1.65; color:#555; word-break:keep-all; overflow-wrap:break-word;">
            1. 스팸 메일함을 먼저 확인해주세요.
          </p>
          <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#555; word-break:keep-all; overflow-wrap:break-word;">
            2. 그래도 없다면 아래 카카오톡 채널로 문의해주세요.
          </p>
        </div>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; text-align:center;">
          <div style="margin-bottom:16px;">
            <a href="https://open.kakao.com/me/pluscoach" style="display:inline-block; font-size:13px; color:#0A0A0A; text-decoration:none; padding:10px 20px; border:1px solid #e5e5e5; border-radius:999px; font-weight:600; word-break:keep-all; overflow-wrap:break-word;">💬 카카오톡 오픈채팅</a>
          </div>
          <p style="font-size:12px; color:#999; margin:0 0 12px 0; word-break:keep-all; overflow-wrap:break-word;">메일이 늦게 도착하거나 문제가 있다면 스팸함을 먼저 확인해주세요</p>
          <p class="email-body" style="font-size:13px; color:#555; margin:0 0 8px 0; word-break:keep-all; overflow-wrap:break-word;">다시 한 번 신청해주셔서 감사합니다. 좋은 하루 보내세요!</p>
          <p style="font-size:11px; color:#bbb; font-style:italic; margin:0; word-break:keep-all; overflow-wrap:break-word;">블로그 자동화 솔루션 운영팀 드림</p>
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
  plan = "free_trial",
  licenseKey,
  downloadUrl,
  isPaid = false,
}: {
  to: string;
  name: string;
  plan?: string;
  licenseKey: string;
  downloadUrl: string;
  isPaid?: boolean;
}): Promise<void> {
  const isLifetime = plan === "lifetime";
  const planDuration = isLifetime ? "평생 소유권" : plan === "monthly" ? "1개월" : plan === "full_package" ? "풀 패키지 (2개월)" : "24시간";
  const emailSubject = isLifetime
    ? "[블로그 자동화 솔루션] 평생 소유권 인증키가 발급되었어요 🎉"
    : isPaid
      ? "[블로그 자동화 솔루션] 정식판 인증키가 발급되었어요 🎉"
      : "[블로그 자동화 솔루션] 인증키가 발급되었어요 🎉";
  const html = `
    ${EMAIL_STYLE}
    <div class="email-wrapper" style="background:#faf9f6; padding:32px 16px; font-family:'Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif; word-break:keep-all; overflow-wrap:break-word;">
      <div class="email-card" style="max-width:560px; margin:0 auto; background:#fff; border-radius:20px; padding:36px 28px; border:1px solid #f0ede5; word-break:keep-all; overflow-wrap:break-word;">

        <div style="text-align:center; margin-bottom:24px;">
          <span style="display:inline-block; background:#E8F5E9; color:#02b350; font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px; word-break:keep-all; overflow-wrap:break-word;">네이버 블로그 서이추 자동화</span>
        </div>

        <h1 class="email-title" style="font-size:20px; font-weight:800; line-height:1.35; color:#0A0A0A; margin:0 0 20px 0; text-align:center; word-break:keep-all; overflow-wrap:break-word;">
          ${name}님,<br>환영합니다 🎉
        </h1>

        <p class="email-body" style="font-size:13px; line-height:1.65; color:#555; margin:0 0 8px 0; word-break:keep-all; overflow-wrap:break-word;">
          상위 1% 블로거들이 조용히 사용하는 <strong>비밀 무기</strong>를 손에 넣으셨습니다.
        </p>
        <p class="email-body" style="font-size:13px; line-height:1.65; color:#555; margin:0 0 32px 0; word-break:keep-all; overflow-wrap:break-word;">
          아래 사용법을 끝까지 읽어보시고, 궁금한 점은 언제든 편하게 문의해주세요.
        </p>

        <div class="email-card-inner" style="background:#faf9f6; border-radius:16px; padding:24px; margin-bottom:24px; text-align:center;">
          <p class="email-section-title" style="margin:0 0 10px 0; font-size:11px; font-weight:600; color:#888; letter-spacing:1px; word-break:keep-all; overflow-wrap:break-word;">YOUR LICENSE KEY</p>
          <p class="email-license-key" style="margin:0; font-size:18px; font-weight:700; font-family:ui-monospace,'SF Mono',Menlo,monospace; color:#0A0A0A; word-break:break-all; overflow-wrap:break-word;">${licenseKey}</p>
        </div>

        <a class="email-cta-btn" href="${downloadUrl}" style="display:block; background:linear-gradient(90deg,#03C75A,#00D4AA); color:#fff; text-align:center; font-size:16px; font-weight:700; padding:16px; border-radius:14px; text-decoration:none;">프로그램 다운로드 →</a>

        <a class="email-guide-btn" href="https://www.notion.so/phomean/33b1f9e9a5ab8094b653c7b16e9006e5?source=copy_link" style="display:block; background:#0A0A0A; color:#fff; text-align:center; font-size:14px; font-weight:600; padding:14px; border-radius:14px; text-decoration:none; margin-top:10px; margin-bottom:36px;">📖 프로그램 사용 가이드 보기</a>

        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <div class="email-card-inner" style="background:#fef7f0; border-left:3px solid #f59e0b; border-radius:4px; padding:16px 18px; margin-bottom:12px;">
            <p class="email-section-title" style="margin:0 0 8px 0; font-size:14px; font-weight:700; color:#0A0A0A; word-break:keep-all; overflow-wrap:break-word;">⏰ 이용 기간 안내</p>
            <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#666; word-break:keep-all; overflow-wrap:break-word;">
              ${isLifetime
                ? `<strong>평생 소유권</strong>으로 기간 제한 없이 사용 가능합니다. 되도록 <strong>바로 다운로드해서 사용</strong>하시길 권장드려요.`
                : `인증키가 <strong>발급된 시점부터 ${planDuration}</strong> 동안 사용 가능합니다.
              프로그램을 언제 처음 실행하든 관계없이, 이 메일을 받으신 지금부터 타이머가 돌아갑니다.
              되도록 <strong>바로 다운로드해서 사용</strong>하시길 권장드려요.`}
            </p>
          </div>
          <div class="email-card-inner" style="background:#fef7f0; border-left:3px solid #f59e0b; border-radius:4px; padding:16px 18px;">
            <p class="email-section-title" style="margin:0 0 8px 0; font-size:14px; font-weight:700; color:#0A0A0A; word-break:keep-all; overflow-wrap:break-word;">인증키 발급 후에는 환불이 어렵습니다</p>
            <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#666; word-break:keep-all; overflow-wrap:break-word;">
              ${isLifetime
                ? `평생 소유권은 고액 디지털 상품으로, 인증키 발급 후 환불 조건이 엄격합니다. <a href="https://blog.pluscoach.co.kr/refund.html" style="color:#03C75A; text-decoration:underline;">환불 규정 페이지</a>를 반드시 확인해주세요.`
                : `디지털 상품의 특성상, 인증키가 한 번 발급되면 환불 처리가 불가능합니다.
              이 점 양해 부탁드리며, 혹시 궁금한 점이 있으시다면
              <strong>반드시 발급 전에</strong> 카카오톡 채널로 먼저 문의해주세요.`}
            </p>
          </div>
        </div>

        <div style="margin-bottom:36px;">
          <p class="email-section-title" style="margin:0 0 18px 0; font-size:11px; font-weight:700; color:#03C75A; letter-spacing:1px; word-break:keep-all; overflow-wrap:break-word;">사용 방법 · 1분이면 끝</p>

          <div style="display:flex; align-items:flex-start; margin-bottom:14px;">
            <div style="min-width:26px; width:26px; height:26px; background:#0A0A0A; color:#fff; border-radius:50%; text-align:center; line-height:26px; font-size:13px; font-weight:700; margin-right:14px;">1</div>
            <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#555; padding-top:2px; word-break:keep-all; overflow-wrap:break-word;">다운로드한 파일을 <strong>압축 해제</strong>합니다</p>
          </div>
          <div style="display:flex; align-items:flex-start; margin-bottom:14px;">
            <div style="min-width:26px; width:26px; height:26px; background:#0A0A0A; color:#fff; border-radius:50%; text-align:center; line-height:26px; font-size:13px; font-weight:700; margin-right:14px;">2</div>
            <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#555; padding-top:2px; word-break:keep-all; overflow-wrap:break-word;"><strong>run.bat</strong> 파일을 실행합니다</p>
          </div>
          <div style="display:flex; align-items:flex-start; margin-bottom:8px;">
            <div style="min-width:26px; width:26px; height:26px; background:#0A0A0A; color:#fff; border-radius:50%; text-align:center; line-height:26px; font-size:13px; font-weight:700; margin-right:14px;">3</div>
            <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#555; padding-top:2px; word-break:keep-all; overflow-wrap:break-word;">인증키 입력란에 위 인증키를 <strong>붙여넣습니다</strong></p>
          </div>
          <p style="margin:0; font-size:12px; color:#999; padding-left:40px; line-height:1.6; word-break:keep-all; overflow-wrap:break-word;">윈도우 보안 경고가 뜨면 "추가 정보 → 실행"을 눌러주세요. 정상 동작입니다.</p>
        </div>

        <div class="email-card-inner" style="background:#faf9f6; border-radius:16px; padding:24px; margin-bottom:36px;">
          <p class="email-section-title" style="margin:0 0 10px 0; font-size:14px; font-weight:700; color:#0A0A0A; word-break:keep-all; overflow-wrap:break-word;">⚠️ 프로그램 실행 전 꼭 확인</p>
          <p class="email-body" style="margin:0 0 14px 0; font-size:13px; line-height:1.65; color:#666; word-break:keep-all; overflow-wrap:break-word;">아래 두 파일을 먼저 확인해주세요. 건너뛰면 정상 작동하지 않을 수 있습니다.</p>
          <p class="email-body" style="margin:0 0 10px 0; font-size:13px; line-height:1.65; color:#555; word-break:keep-all; overflow-wrap:break-word;">
            • <strong>★프로그램 실행 전 꼭 봐주세요★</strong> (메모장)<br>
            <span style="padding-left:14px; color:#888;">폴더 안에 있습니다. 반드시 먼저 읽어주세요.</span>
          </p>
          <p class="email-body" style="margin:0; font-size:13px; line-height:1.65; color:#555; word-break:keep-all; overflow-wrap:break-word;">
            • <strong>정식 버전 사용법</strong> (파일)<br>
            <span style="padding-left:14px; color:#888;">한도 제한 없이 사용하려면 함께 확인해주세요.</span>
          </p>
        </div>

        ${isLifetime ? `
        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <div class="email-card-inner" style="background:#f0fdf4; border-radius:16px; padding:24px; text-align:center;">
            <p style="margin:0 0 6px 0; font-size:13px; color:#555; word-break:keep-all; overflow-wrap:break-word;">구매하신 플랜</p>
            <p style="margin:0 0 4px 0; font-size:20px; font-weight:800; color:#02b350; word-break:keep-all; overflow-wrap:break-word;">평생 소유권</p>
            <p style="margin:0 0 4px 0; font-size:13px; color:#555; word-break:keep-all; overflow-wrap:break-word;">한 번 구매, 평생 사용</p>
            <p style="margin:0; font-size:12px; color:#888; word-break:keep-all; overflow-wrap:break-word;">결제가 정상 완료되었습니다</p>
          </div>
        </div>
        ` : isPaid ? `
        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <div class="email-card-inner" style="background:#f0fdf4; border-radius:16px; padding:24px; text-align:center;">
            <p style="margin:0 0 6px 0; font-size:13px; color:#555; word-break:keep-all; overflow-wrap:break-word;">구매하신 플랜</p>
            <p style="margin:0 0 4px 0; font-size:20px; font-weight:800; color:#02b350; word-break:keep-all; overflow-wrap:break-word;">${planDuration}</p>
            <p style="margin:0; font-size:12px; color:#888; word-break:keep-all; overflow-wrap:break-word;">결제가 정상 완료되었습니다</p>
          </div>
        </div>
        ` : `
        <div style="border-top:1px solid #f0ede5; padding-top:28px; margin-bottom:36px;">
          <p style="margin:0 0 6px 0; font-size:18px; font-weight:800; color:#0A0A0A; text-align:center; word-break:keep-all; overflow-wrap:break-word;">💎 24시간 안에 정식판을 구매하시면</p>
          <p class="email-body" style="margin:0 0 20px 0; font-size:13px; line-height:1.65; color:#666; text-align:center; word-break:keep-all; overflow-wrap:break-word;">체험 기간을 <strong style="color:#03C75A;">추가로</strong> 드립니다</p>

          <!--[if mso]><table role="presentation" width="100%"><tr><td width="50%" valign="top"><![endif]-->
          <div style="display:inline-block; width:48%; vertical-align:top; margin-right:2%;">
            <div class="email-card-inner" style="background:#faf9f6; border-radius:14px; padding:18px 16px; text-align:center;">
              <p style="margin:0 0 6px 0; font-size:13px; color:#555; word-break:keep-all; overflow-wrap:break-word;">1개월 이용권</p>
              <p style="margin:0 0 4px 0; font-size:20px; font-weight:800; color:#0A0A0A;">+ 7일</p>
              <p style="margin:0; font-size:12px; color:#888; word-break:keep-all; overflow-wrap:break-word;">추가 사용</p>
            </div>
          </div>
          <!--[if mso]></td><td width="50%" valign="top"><![endif]-->
          <div style="display:inline-block; width:48%; vertical-align:top;">
            <div class="email-card-inner" style="background:linear-gradient(135deg,#E8F5E9,#faf9f6); border:2px solid #03C75A; border-radius:14px; padding:18px 16px; text-align:center; position:relative;">
              <div style="position:absolute; top:-9px; left:50%; transform:translateX(-50%); background:#03C75A; color:#fff; font-size:10px; font-weight:700; padding:2px 10px; border-radius:999px;">추천</div>
              <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#02b350; word-break:keep-all; overflow-wrap:break-word;">풀 패키지</p>
              <p style="margin:0 0 4px 0; font-size:20px; font-weight:800; color:#02b350;">+ 14일</p>
              <p style="margin:0; font-size:12px; color:#02b350; word-break:keep-all; overflow-wrap:break-word;">추가 사용</p>
            </div>
          </div>
          <!--[if mso]></td></tr></table><![endif]-->

          <p style="margin:16px 0 0 0; font-size:12px; color:#888; text-align:center; word-break:keep-all; overflow-wrap:break-word;">마음에 드시면 카카오톡 채널로 문의해주세요</p>
        </div>
        `}

        <div style="border-top:1px solid #f0ede5; padding-top:28px; text-align:center;">
          <div style="margin-bottom:16px;">
            <a href="https://open.kakao.com/me/pluscoach" style="display:inline-block; font-size:13px; color:#0A0A0A; text-decoration:none; padding:10px 20px; border:1px solid #e5e5e5; border-radius:999px; font-weight:600; word-break:keep-all; overflow-wrap:break-word;">💬 카카오톡 오픈채팅</a>
          </div>
          <p style="font-size:12px; color:#999; margin:0 0 12px 0; word-break:keep-all; overflow-wrap:break-word;">메일이 늦게 도착하거나 문제가 있다면 스팸함을 먼저 확인해주세요</p>
          <p style="font-size:11px; color:#bbb; font-style:italic; margin:0; word-break:keep-all; overflow-wrap:break-word;">블로그 자동화 솔루션 운영팀 드림</p>
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
      subject: emailSubject,
      html,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`Resend 인증키 이메일 발송 실패 (${res.status}): ${JSON.stringify(result)}`);
  }

  console.log("[resend] 인증키 이메일 발송 성공, id:", result.id);
}

// ===== 무통장 입금 임시 결제 구조용 함수들 (기존 함수 수정 없음) =====

/**
 * HTML 이스케이프 유틸
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 무통장 입금 리마인더 이메일
 * 사장님이 텔레그램에서 "📧 리마인더 발송" 버튼 누르면 호출됨.
 * 고객이 아직 입금 안 했거나, 입금자명 달라서 확인 못 한 경우용.
 */
export async function sendReminderEmail(params: {
  to: string;
  name: string;
  planLabel: string;   // '1개월 플랜' 등
  amount: number;
  bankInfo: {
    bank: string;
    account: string;
    holder: string;
  };
  kakaoChannelUrl: string;
}): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[resend] 리마인더 발송 실패: RESEND_API_KEY 미설정");
    return false;
  }

  const amountStr = params.amount.toLocaleString("ko-KR");

  // 기존 sendLicenseKeyEmail의 디자인 토큰 그대로 재사용
  // 베이지 배경(#faf9f6), 흰 카드(20px radius), 초록 CTA(#03C75A → #00D4AA)
  // word-break: keep-all + overflow-wrap: break-word 모든 텍스트에 인라인

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  @media (max-width: 600px) {
    .email-title { font-size: 17px !important; }
    .email-body { font-size: 12px !important; }
  }
</style></head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf9f6;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;">
<tr><td style="padding:40px 32px 24px 32px;">
  <div style="display:inline-block;padding:6px 14px;background:#03C75A;color:#ffffff;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.02em;">입금 확인 요청</div>
  <h1 class="email-title" style="margin:16px 0 8px 0;font-size:20px;font-weight:700;color:#0A0A0A;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;">
    ${escapeHtml(params.name)}님, 입금이 아직 확인되지 않았어요 😊
  </h1>
  <p class="email-body" style="margin:0;color:#6b7280;font-size:13px;line-height:1.65;word-break:keep-all;overflow-wrap:break-word;">
    신청해주신 <strong>${escapeHtml(params.planLabel)}</strong>에 대한 입금이 아직 확인되지 않고 있어요.<br>
    아래 계좌로 입금해주시거나, 이미 입금하셨다면 카카오톡으로 알려주세요.
  </p>
</td></tr>

<tr><td style="padding:0 32px 24px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf9f6;border-radius:12px;padding:20px;">
    <tr><td style="padding:4px 0;font-size:12px;color:#6b7280;word-break:keep-all;">은행</td>
        <td style="padding:4px 0;font-size:14px;color:#0A0A0A;font-weight:600;text-align:right;word-break:keep-all;">${escapeHtml(params.bankInfo.bank)}</td></tr>
    <tr><td style="padding:4px 0;font-size:12px;color:#6b7280;word-break:keep-all;">계좌번호</td>
        <td style="padding:4px 0;font-size:14px;color:#0A0A0A;font-weight:600;text-align:right;font-family:ui-monospace,'SF Mono',Menlo,monospace;word-break:break-all;">${escapeHtml(params.bankInfo.account)}</td></tr>
    <tr><td style="padding:4px 0;font-size:12px;color:#6b7280;word-break:keep-all;">예금주</td>
        <td style="padding:4px 0;font-size:14px;color:#0A0A0A;font-weight:600;text-align:right;word-break:keep-all;">${escapeHtml(params.bankInfo.holder)}</td></tr>
    <tr><td style="padding:4px 0;font-size:12px;color:#6b7280;word-break:keep-all;">금액</td>
        <td style="padding:4px 0;font-size:16px;color:#03C75A;font-weight:700;text-align:right;word-break:keep-all;">${amountStr}원</td></tr>
  </table>
</td></tr>

<tr><td style="padding:0 32px 24px 32px;">
  <div style="background:#fef7f0;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:4px;">
    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.65;word-break:keep-all;overflow-wrap:break-word;">
      ⚠️ <strong>입금자명은 "${escapeHtml(params.name)}"으로 해주세요.</strong><br>
      다른 이름으로 입금하신 경우 아래 카카오톡으로 연락 주시면 바로 처리해드릴게요.
    </p>
  </div>
</td></tr>

<tr><td align="center" style="padding:0 32px 40px 32px;">
  <a href="${params.kakaoChannelUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:#FEE500;color:#3A1D1D;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;word-break:keep-all;">
    💬 카카오톡으로 문의하기
  </a>
</td></tr>

<tr><td style="padding:24px 32px;background:#faf9f6;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;word-break:keep-all;overflow-wrap:break-word;">
    본 메일은 발신 전용입니다. 문의는 카카오톡으로 주세요.<br>
    제이에스코퍼레이션 · 사업자등록번호 850-38-01085
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: params.to,
        subject: `[블로그 자동화 솔루션] 입금 확인이 아직 안 되었어요 😊`,
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[resend] 리마인더 발송 실패: ${res.status} ${errorText}`);
      return false;
    }
    console.log(`[resend] 리마인더 발송 성공 (to: ${params.to})`);
    return true;
  } catch (err) {
    console.error("[resend] 리마인더 발송 예외:", err);
    return false;
  }
}

/**
 * 에러 타입 (2종만 사용)
 */
export type EmergencyErrorType =
  | "LICENSE_CREATE_FAILED"    // 🔴 라이선스 발급 실패
  | "EMAIL_SEND_FAILED";       // 🟡 인증키 이메일 발송 실패

/** 주문 정보 (선택) */
interface EmergencyOrderInfo {
  name?: string;
  email?: string;
  phone?: string;
  plan?: string;
  amount?: number;
  order_code?: string;
  created_at?: string;
  license_key?: string;
}

/**
 * 사장님에게 처리 실패 긴급 알림 이메일 (v2 — 타입별 맞춤 가이드)
 */
export async function sendEmergencyAlertEmail(params: {
  orderCode: string;
  errorMessage: string;
  errorType?: EmergencyErrorType;
  order?: EmergencyOrderInfo;
  context?: Record<string, unknown>;
  subject?: string;  // 하위호환용, 무시됨
}): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const ownerEmail = Deno.env.get("OWNER_EMAIL") || "jscorpor88@gmail.com";

  if (!apiKey) {
    console.error("[resend] 긴급 알림 발송 실패: RESEND_API_KEY 미설정");
    return false;
  }

  const errorType = params.errorType || "LICENSE_CREATE_FAILED";
  const order = params.order;

  // 심각도별 배너 설정
  const isHigh = errorType === "LICENSE_CREATE_FAILED";
  const bannerBg = isHigh ? "#fef2f2" : "#fffbeb";
  const bannerColor = isHigh ? "#991b1b" : "#92400e";
  const bannerEmoji = isHigh ? "🔴" : "🟡";
  const bannerLabel = isHigh ? "긴급 · 즉시 조치 필요" : "주의 · 재발송으로 복구 가능";
  const emailSubjectPrefix = isHigh ? "🔴 긴급" : "🟡 주의";

  // 제목 & 설명
  let title: string;
  let whatHappened: string;
  let actionSteps: string[];

  if (errorType === "LICENSE_CREATE_FAILED") {
    title = "라이선스 발급이 실패했어요";
    whatHappened = `승인 버튼을 눌렀는데 <strong>라이선스 키 생성이 실패</strong>했어요.<br>고객은 아직 인증키를 받지 못한 상태입니다.`;
    actionSteps = [
      `<strong>Supabase Dashboard → licenses 테이블</strong>에서 주문코드로 검색<br><span style="color:#6b7280;font-size:12px;">→ 라이선스가 이미 생성돼 있는지 확인</span>`,
      `<strong>라이선스가 있다면</strong> → orders 테이블에서 해당 주문의 <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">license_key</code>를 수동으로 채우고 status를 "결제완료"로 변경`,
      `<strong>라이선스가 없다면</strong> → 수동으로 licenses INSERT 후 위 2번과 동일하게 처리`,
      `<strong>고객 대응</strong> → 카카오톡으로 "처리 지연 중입니다" 안내 발송`,
    ];
  } else {
    title = "인증키 이메일 발송이 실패했어요";
    whatHappened = `라이선스는 정상 발급됐지만 <strong>고객에게 인증키 이메일이 안 갔어요</strong>.<br>(이메일 주소 문제 또는 Resend 일시 오류)`;
    actionSteps = [
      `<strong>텔레그램</strong>에서 이 주문 메시지 확인`,
      `<strong>[🔄 같은 이메일 재발송]</strong> 버튼 먼저 눌러보기 (일시 오류면 이걸로 해결)`,
      `계속 실패하면 → 고객에게 카톡으로 <strong>이메일 주소 재확인</strong> → <strong>[✏️ 다른 이메일로]</strong> 버튼 사용`,
    ];
  }

  // 주문 정보 박스 HTML 생성
  let orderInfoHtml = "";
  if (order) {
    const rows: string[] = [];
    if (order.name) rows.push(`<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;width:90px;">이름</td><td style="padding:6px 0;font-size:14px;color:#0A0A0A;font-weight:600;">${escapeHtml(order.name)}</td></tr>`);
    if (order.email) rows.push(`<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">이메일</td><td style="padding:6px 0;font-size:14px;color:#0A0A0A;font-weight:600;word-break:break-all;">${escapeHtml(order.email)}</td></tr>`);
    if (order.phone) {
      const telNum = order.phone.replace(/[^0-9]/g, "");
      rows.push(`<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">전화</td><td style="padding:6px 0;font-size:14px;font-weight:600;"><a href="tel:${telNum}" style="color:#03C75A;text-decoration:none;">${escapeHtml(order.phone)}</a></td></tr>`);
    }
    if (order.plan) {
      const planStr = order.amount
        ? `${getPlanLabel(order.plan, order.amount)}`
        : order.plan;
      rows.push(`<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">플랜</td><td style="padding:6px 0;font-size:14px;color:#0A0A0A;font-weight:600;">${escapeHtml(planStr)}</td></tr>`);
    }
    rows.push(`<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">주문코드</td><td style="padding:6px 0;font-size:14px;color:#0A0A0A;font-weight:600;font-family:ui-monospace,monospace;">${escapeHtml(order.order_code || params.orderCode)}</td></tr>`);
    if (order.created_at) {
      const dt = new Date(order.created_at);
      const dtStr = dt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      rows.push(`<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">주문시각</td><td style="padding:6px 0;font-size:14px;color:#0A0A0A;font-weight:600;">${escapeHtml(dtStr)}</td></tr>`);
    }
    if (order.license_key) {
      rows.push(`<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">라이선스</td><td style="padding:6px 0;font-size:13px;color:#03C75A;font-weight:700;font-family:ui-monospace,monospace;word-break:break-all;">${escapeHtml(order.license_key)} ✓ 발급됨</td></tr>`);
    }

    orderInfoHtml = `
      <div style="background:#faf9f6;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:1px;">📋 주문 정보</p>
        <table style="width:100%;border-collapse:collapse;">${rows.join("")}</table>
      </div>`;
  } else {
    orderInfoHtml = `
      <div style="background:#faf9f6;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:1px;">주문코드</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#0A0A0A;font-family:ui-monospace,monospace;word-break:break-all;">${escapeHtml(params.orderCode)}</p>
      </div>`;
  }

  // 액션 스텝 HTML
  const actionStepsHtml = actionSteps
    .map((step, i) => `
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:22px;height:22px;background:${isHigh ? "#dc2626" : "#f59e0b"};color:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${i + 1}</div>
        <div style="flex:1;font-size:14px;color:#374151;line-height:1.65;padding-top:1px;">${step}</div>
      </div>`)
    .join("");

  // 디버그 컨텍스트
  const contextStr = params.context ? JSON.stringify(params.context, null, 2) : "(none)";

  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#faf9f6;font-family:'Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">

<!-- 배너 -->
<tr><td style="background:${bannerBg};padding:20px 32px;border-left:4px solid ${bannerColor};">
  <p style="margin:0;font-size:12px;font-weight:700;color:${bannerColor};letter-spacing:0.5px;">${bannerEmoji} ${escapeHtml(bannerLabel)}</p>
  <h1 style="margin:6px 0 0 0;font-size:20px;font-weight:800;color:#0A0A0A;line-height:1.35;word-break:keep-all;">
    ${escapeHtml(title)}
  </h1>
</td></tr>

<!-- 본문 -->
<tr><td style="padding:28px 32px 24px 32px;">

  <!-- 무슨 일이? -->
  <div style="margin-bottom:24px;">
    <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#0A0A0A;">🔍 무슨 일이 일어났나요?</p>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;word-break:keep-all;">
      ${whatHappened}
    </p>
  </div>

  <!-- 주문 정보 -->
  ${orderInfoHtml}

  <!-- 해야 할 일 -->
  <div style="margin-bottom:24px;">
    <p style="margin:0 0 14px 0;font-size:13px;font-weight:700;color:#0A0A0A;">✅ 지금 해야 할 일</p>
    ${actionStepsHtml}
  </div>

  <!-- 기술 정보 (접힘) -->
  <details style="background:#f3f4f6;border-radius:8px;padding:10px 14px;margin-top:20px;">
    <summary style="cursor:pointer;font-size:12px;color:#6b7280;font-weight:600;">🔧 기술 정보 (개발자용)</summary>
    <div style="margin-top:10px;">
      <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280;font-weight:600;">에러 메시지</p>
      <pre style="margin:0 0 10px 0;padding:8px 10px;background:#fff;border-radius:4px;font-size:11px;color:#991b1b;font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-all;">${escapeHtml(params.errorMessage)}</pre>
      <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280;font-weight:600;">컨텍스트</p>
      <pre style="margin:0;padding:8px 10px;background:#fff;border-radius:4px;font-size:11px;color:#374151;font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-all;">${escapeHtml(contextStr)}</pre>
    </div>
  </details>

</td></tr>

<tr><td style="padding:16px 32px 20px 32px;background:#faf9f6;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;word-break:keep-all;">
    이 메일은 자동 발송되는 긴급 알림입니다.<br>
    블로그 자동화 솔루션 · 제이에스코퍼레이션
  </p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_HEADER,
        to: ownerEmail,
        subject: `${emailSubjectPrefix} ${title} (${params.orderCode})`,
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[resend] 긴급 알림 발송 실패: ${res.status} ${errorText}`);
      return false;
    }
    console.log(`[resend] 긴급 알림 발송 성공 (orderCode: ${params.orderCode}, type: ${errorType})`);
    return true;
  } catch (err) {
    console.error("[resend] 긴급 알림 발송 예외:", err);
    return false;
  }
}

function getPlanLabel(plan: string, amount: number): string {
  const labels: Record<string, string> = {
    free_trial: "무료 체험 (24시간)",
    monthly: `월간 플랜 (${amount.toLocaleString()}원)`,
    full_package: `풀 패키지 (${amount.toLocaleString()}원)`,
    lifetime: `평생 소유권 (${amount.toLocaleString()}원)`,
  };
  return labels[plan] || plan;
}
