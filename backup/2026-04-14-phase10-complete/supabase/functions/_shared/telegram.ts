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
