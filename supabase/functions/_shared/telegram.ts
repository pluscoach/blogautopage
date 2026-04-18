import { getPlanLabel, getPayTypeLabel } from "./labels.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

/**
 * 텔레그램 봇으로 사장님에게 알림 발송
 */
export async function sendTelegramNotification(order: Record<string, unknown>): Promise<void> {
  const text = [
    "🔔 새 주문이 들어왔습니다",
    "",
    `👤 이름: ${order.name}`,
    `📧 이메일: ${order.email}`,
    `📦 플랜: ${order.plan} (${Number(order.amount).toLocaleString()}원)`,
    `🎫 주문 코드: ${order.order_code}`,
    `🌐 IP: ${order.ip || "N/A"}`,
    `⏰ 시간: ${order.created_at}`,
    "",
    `[주문 ID: ${order.id}]`,
  ].join("\n");

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`텔레그램 발송 실패 (${res.status}): ${JSON.stringify(result)}`);
  }

  console.log("[telegram] 발송 성공, message_id:", result.result?.message_id);
}

/**
 * 유료 결제 완료 알림 — 텔레그램 봇
 */
export async function sendPaidOrderTelegram(params: {
  name: string;
  email: string;
  plan: string;
  price: number;
  orderCode: string;
  orderId: number;
  payType: number;
  payDate: string;
}): Promise<void> {
  const planLabel = getPlanLabel(params.plan);
  const payTypeLabel = getPayTypeLabel(params.payType);

  const text = [
    "💰 결제 완료",
    "",
    `👤 이름: ${params.name}`,
    `📧 이메일: ${params.email}`,
    `📦 플랜: ${planLabel} (${params.price.toLocaleString()}원)`,
    `🎫 주문 코드: ${params.orderCode}`,
    `💳 결제수단: ${payTypeLabel}`,
    `⏰ 결제일시: ${params.payDate}`,
    `✅ 상태: 인증키 발송 완료`,
    "",
    `[주문 ID: ${params.orderId}]`,
  ].join("\n");

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    },
  );

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`텔레그램 결제 알림 실패 (${res.status}): ${JSON.stringify(result)}`);
  }

  console.log("[telegram] 결제 완료 알림 성공, message_id:", result.result?.message_id);
}

// ===== 무통장 입금 임시 결제 구조용 함수들 (기존 함수 수정 없음) =====

/**
 * Telegram HTML parse_mode용 이스케이프
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 무통장 입금 대기 알림 (사장님 텔레그램)
 * 인라인 버튼 2개: 승인(인증키 발송) / 리마인더
 */
export async function sendDepositNoticeWithButtons(params: {
  name: string;
  email: string;
  phone: string;
  plan: string;        // 'monthly' | 'full_package' | 'lifetime'
  planLabel: string;   // '1개월 플랜' 등
  amount: number;
  orderCode: string;
}): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.error("[telegram] 무통장 알림 발송 실패: TELEGRAM_BOT_TOKEN/CHAT_ID 미설정");
    return false;
  }

  const amountStr = params.amount.toLocaleString("ko-KR");

  // HTML parse_mode 사용 (기존 sendPaidOrderTelegram 패턴과 동일)
  const text = [
    "💳 <b>무통장 입금 확인 요청</b>",
    "",
    `<b>이름:</b> ${escapeHtml(params.name)}`,
    `<b>전화:</b> ${escapeHtml(params.phone)}`,
    `<b>이메일:</b> ${escapeHtml(params.email)}`,
    `<b>플랜:</b> ${escapeHtml(params.planLabel)} (${amountStr}원)`,
    `<b>주문코드:</b> <code>${escapeHtml(params.orderCode)}</code>`,
    "",
    "입금 확인 후 아래 버튼으로 처리해주세요.",
  ].join("\n");

  // 인라인 키보드: 승인 / 리마인더 2개 버튼
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "✅ 승인 → 인증키 발송",
          callback_data: `approve:${params.orderCode}`,
        },
        {
          text: "📧 리마인더 발송",
          callback_data: `remind:${params.orderCode}`,
        },
      ],
    ],
  };

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[telegram] 무통장 알림 발송 실패: ${res.status} ${errorText}`);
      return false;
    }
    console.log(`[telegram] 무통장 알림 발송 성공 (orderCode: ${params.orderCode})`);
    return true;
  } catch (err) {
    console.error("[telegram] 무통장 알림 발송 예외:", err);
    return false;
  }
}

/**
 * 텔레그램 메시지 편집 (승인 처리 후 원본 메시지를 "✅ 완료됨"으로 변경)
 */
export async function editTelegramMessage(params: {
  chatId: number;
  messageId: number;
  text: string;
  replyMarkup?: {
    inline_keyboard: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
  };
}): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("[telegram] 메시지 편집 실패: TELEGRAM_BOT_TOKEN 미설정");
    return false;
  }

  try {
    // body 조립 — replyMarkup 있으면 포함, 없으면 생략 (버튼 제거됨)
    const body: Record<string, unknown> = {
      chat_id: params.chatId,
      message_id: params.messageId,
      text: params.text,
      parse_mode: "HTML",
    };

    if (params.replyMarkup) {
      body.reply_markup = params.replyMarkup;
    }

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[telegram] 메시지 편집 실패: ${res.status} ${errorText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] 메시지 편집 예외:", err);
    return false;
  }
}

/**
 * answerCallbackQuery — 버튼 누른 사용자에게 토스트/로딩 스피너 종료
 */
export async function answerCallbackQuery(params: {
  callbackQueryId: string;
  text?: string;
}): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: params.callbackQueryId,
          text: params.text || "",
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 일반 메시지 전송 (텍스트 + 옵션)
 * force_reply, HTML parse_mode 등 지원.
 */
export async function sendTelegramMessage(params: {
  chatId: number;
  text: string;
  replyMarkup?: unknown;
  parseMode?: "HTML" | "Markdown" | null;
  replyToMessageId?: number;
}): Promise<{ ok: boolean; messageId?: number }> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("[telegram] sendTelegramMessage 실패: TELEGRAM_BOT_TOKEN 미설정");
    return { ok: false };
  }

  const body: Record<string, unknown> = {
    chat_id: params.chatId,
    text: params.text,
  };
  if (params.parseMode) body.parse_mode = params.parseMode;
  if (params.replyMarkup) body.reply_markup = params.replyMarkup;
  if (params.replyToMessageId) body.reply_to_message_id = params.replyToMessageId;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[telegram] sendMessage 실패: ${res.status} ${errorText}`);
      return { ok: false };
    }

    const json = await res.json();
    return {
      ok: json.ok === true,
      messageId: json.result?.message_id,
    };
  } catch (err) {
    console.error("[telegram] sendMessage 예외:", err);
    return { ok: false };
  }
}

/**
 * 메시지 삭제 (봇이 보낸 메시지만 가능)
 */
export async function deleteTelegramMessage(params: {
  chatId: number;
  messageId: number;
}): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: params.chatId, message_id: params.messageId }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
