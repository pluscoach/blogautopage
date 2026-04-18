import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  editTelegramMessage,
  answerCallbackQuery,
} from "../_shared/telegram.ts";
import {
  sendLicenseKeyEmail,
  sendReminderEmail,
  sendEmergencyAlertEmail,
} from "../_shared/resend.ts";
import { getPlanLabel } from "../_shared/labels.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DOWNLOAD_URL_PAID = Deno.env.get("DOWNLOAD_URL_PAID") || "";

// 카카오톡 오픈채팅 URL (리마인더 이메일용)
const KAKAO_CHANNEL_URL = "https://open.kakao.com/me/pluscoach";

// 은행 계좌 정보 (리마인더 이메일용)
const BANK_INFO = {
  bank: "하나은행",
  account: "120-910375-30807",
  holder: "오준석(제이에스코퍼레이션)",
};

/**
 * Telegram callback_query 타입 (필요한 필드만)
 */
interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
  data: string; // "approve:{orderCode}" 또는 "remind:{orderCode}"
}

interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
  message?: unknown; // 일반 메시지는 무시
}

/**
 * 항상 200 SUCCESS 반환 (Telegram 재시도 방지).
 * 에러는 console.error만 하고 내부 처리.
 */
Deno.serve(async (req) => {
  // Telegram은 POST만 보냄
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    console.error("[telegram-callback] JSON 파싱 실패");
    return new Response("OK", { status: 200 });
  }

  // callback_query 없으면 무시 (일반 메시지 등)
  const callbackQuery = update.callback_query;
  if (!callbackQuery) {
    return new Response("OK", { status: 200 });
  }

  const callbackQueryId = callbackQuery.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const callbackData = callbackQuery.data || "";

  console.log(`[telegram-callback] 수신: ${callbackData}`);

  // callback_data 파싱: "approve:오준석-A3X7" 또는 "remind:오준석-A3X7"
  const colonIdx = callbackData.indexOf(":");
  if (colonIdx === -1) {
    console.error(`[telegram-callback] 잘못된 callback_data: ${callbackData}`);
    await answerCallbackQuery({ callbackQueryId, text: "❌ 잘못된 요청" });
    return new Response("OK", { status: 200 });
  }

  const action = callbackData.substring(0, colonIdx);
  const orderCode = callbackData.substring(colonIdx + 1);

  if (!orderCode) {
    console.error("[telegram-callback] orderCode 누락");
    await answerCallbackQuery({ callbackQueryId, text: "❌ 주문코드 없음" });
    return new Response("OK", { status: 200 });
  }

  // Supabase 클라이언트 (service_role)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 분기
  if (action === "approve") {
    await handleApprove({
      supabase,
      orderCode,
      callbackQueryId,
      chatId,
      messageId,
      originalText: callbackQuery.message.text || "",
    });
  } else if (action === "remind") {
    await handleRemind({
      supabase,
      orderCode,
      callbackQueryId,
      chatId,
      messageId,
      originalText: callbackQuery.message.text || "",
    });
  } else {
    console.error(`[telegram-callback] 알 수 없는 action: ${action}`);
    await answerCallbackQuery({ callbackQueryId, text: "❌ 알 수 없는 요청" });
  }

  return new Response("OK", { status: 200 });
});

/**
 * 승인 처리: 라이선스 발급 + 인증키 이메일 + 텔레그램 메시지 편집
 */
async function handleApprove(params: {
  supabase: ReturnType<typeof createClient>;
  orderCode: string;
  callbackQueryId: string;
  chatId: number;
  messageId: number;
  originalText: string;
}) {
  const { supabase, orderCode, callbackQueryId, chatId, messageId, originalText } = params;

  try {
    // 1. orders 조회
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, name, email, phone, plan, amount, status, license_key, order_code")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (fetchError || !order) {
      console.error(`[telegram-callback/approve] 주문 조회 실패: ${orderCode}`, fetchError);
      await answerCallbackQuery({ callbackQueryId, text: "❌ 주문 없음" });
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 처리 실패 — 주문 조회 실패",
        orderCode,
        errorMessage: fetchError?.message || "orders 테이블에 해당 주문 없음",
      });
      return;
    }

    // 2. 중복 승인 방지
    if (order.license_key) {
      console.log(`[telegram-callback/approve] 이미 발급됨: ${orderCode}`);
      await answerCallbackQuery({
        callbackQueryId,
        text: `ℹ️ 이미 발급됨 (${order.license_key})`,
      });
      return;
    }

    // 3. 라이선스 발급
    const { data: licenseKey, error: licenseError } = await supabase.rpc("create_license", {
      p_buyer_name: order.name,
      p_plan: order.plan,
      p_order_code: order.order_code,
    });

    if (licenseError || !licenseKey) {
      console.error(`[telegram-callback/approve] 라이선스 발급 실패: ${orderCode}`, licenseError);
      await supabase.from("orders").update({ status: "발급실패" }).eq("id", order.id);
      await answerCallbackQuery({ callbackQueryId, text: "❌ 라이선스 발급 실패" });
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 처리 실패 — 라이선스 발급",
        orderCode,
        errorMessage: licenseError?.message || "create_license RPC 반환값 없음",
        context: { order_id: order.id, plan: order.plan },
      });
      return;
    }

    // 4. orders UPDATE (license_key + status='결제완료')
    const { error: updateError } = await supabase
      .from("orders")
      .update({ license_key: licenseKey, status: "결제완료" })
      .eq("id", order.id);

    if (updateError) {
      console.error(`[telegram-callback/approve] orders UPDATE 실패: ${orderCode}`, updateError);
      // 라이선스는 이미 발급됐으므로 이메일은 계속 발송 시도
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 처리 중 DB UPDATE 실패 (라이선스는 발급됨)",
        orderCode,
        errorMessage: updateError.message,
        context: { license_key: licenseKey, order_id: order.id },
      });
    }

    // 5. 인증키 이메일 발송 (기존 sendLicenseKeyEmail 재사용, isPaid=true)
    if (!DOWNLOAD_URL_PAID) {
      console.error("[telegram-callback/approve] DOWNLOAD_URL_PAID 미설정");
      await supabase.from("orders").update({ status: "이메일실패" }).eq("id", order.id);
      await answerCallbackQuery({ callbackQueryId, text: "⚠️ 이메일 발송 실패 (DOWNLOAD_URL_PAID 미설정)" });
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 — DOWNLOAD_URL_PAID 미설정",
        orderCode,
        errorMessage: "DOWNLOAD_URL_PAID 환경변수가 설정되지 않아 이메일 발송 불가. 수동 처리 필요.",
        context: { license_key: licenseKey },
      });
      return;
    }

    try {
      await sendLicenseKeyEmail({
        to: order.email,
        name: order.name,
        licenseKey,
        downloadUrl: DOWNLOAD_URL_PAID,
        plan: order.plan,
        isPaid: true,
      });
    } catch (emailError) {
      console.error(`[telegram-callback/approve] 이메일 발송 실패: ${orderCode}`, emailError);
      await supabase.from("orders").update({ status: "이메일실패" }).eq("id", order.id);
      await answerCallbackQuery({ callbackQueryId, text: "⚠️ 이메일 발송 실패" });
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 — 이메일 발송 실패 (라이선스는 발급됨)",
        orderCode,
        errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
        context: { license_key: licenseKey, to: order.email },
      });
      return;
    }

    // 6. 텔레그램 메시지 편집: "✅ 완료됨 ({timestamp})"
    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
    });
    const editedText = `${originalText}\n\n━━━━━━━━━━\n✅ <b>완료됨</b> (${now})\n인증키: <code>${licenseKey}</code>`;

    await editTelegramMessage({ chatId, messageId, text: editedText });

    // 7. 버튼 누른 사람에게 성공 토스트
    await answerCallbackQuery({ callbackQueryId, text: "✅ 인증키 발송 완료" });

    console.log(`[telegram-callback/approve] 완료: ${orderCode} → ${licenseKey}`);
  } catch (err) {
    console.error(`[telegram-callback/approve] 예외: ${orderCode}`, err);
    await answerCallbackQuery({ callbackQueryId, text: "❌ 처리 중 오류" });
    await sendEmergencyAlertEmail({
      subject: "🚨 무통장 승인 — 예외 발생",
      orderCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 리마인더 처리: 리마인더 이메일 + 텔레그램 메시지 편집 (status는 '입금대기' 유지)
 */
async function handleRemind(params: {
  supabase: ReturnType<typeof createClient>;
  orderCode: string;
  callbackQueryId: string;
  chatId: number;
  messageId: number;
  originalText: string;
}) {
  const { supabase, orderCode, callbackQueryId, chatId, messageId, originalText } = params;

  try {
    // 1. orders 조회
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, name, email, phone, plan, amount, status, license_key, order_code")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (fetchError || !order) {
      console.error(`[telegram-callback/remind] 주문 조회 실패: ${orderCode}`, fetchError);
      await answerCallbackQuery({ callbackQueryId, text: "❌ 주문 없음" });
      return;
    }

    // 2. 이미 결제완료된 주문이면 리마인더 발송 안 함
    if (order.license_key) {
      console.log(`[telegram-callback/remind] 이미 발급됨 — 리마인더 스킵: ${orderCode}`);
      await answerCallbackQuery({
        callbackQueryId,
        text: "ℹ️ 이미 승인된 주문",
      });
      return;
    }

    // 3. 리마인더 이메일 발송
    const planLabel = getPlanLabel(order.plan);

    try {
      await sendReminderEmail({
        to: order.email,
        name: order.name,
        planLabel,
        amount: order.amount,
        bankInfo: BANK_INFO,
        kakaoChannelUrl: KAKAO_CHANNEL_URL,
      });
    } catch (emailError) {
      console.error(`[telegram-callback/remind] 이메일 발송 실패: ${orderCode}`, emailError);
      await answerCallbackQuery({ callbackQueryId, text: "❌ 리마인더 발송 실패" });
      await sendEmergencyAlertEmail({
        subject: "🚨 리마인더 발송 실패",
        orderCode,
        errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
        context: { to: order.email },
      });
      return;
    }

    // 4. status는 '입금대기' 유지 (덮어쓰지 않음 — 여러 번 리마인더 가능)

    // 5. 텔레그램 메시지 편집 (리마인더 발송 기록만 추가)
    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
    });
    const editedText = `${originalText}\n\n📧 리마인더 발송됨 (${now})`;

    await editTelegramMessage({ chatId, messageId, text: editedText });

    // 6. 버튼 누른 사람에게 성공 토스트
    await answerCallbackQuery({ callbackQueryId, text: "📧 리마인더 발송 완료" });

    console.log(`[telegram-callback/remind] 완료: ${orderCode}`);
  } catch (err) {
    console.error(`[telegram-callback/remind] 예외: ${orderCode}`, err);
    await answerCallbackQuery({ callbackQueryId, text: "❌ 처리 중 오류" });
    await sendEmergencyAlertEmail({
      subject: "🚨 리마인더 — 예외 발생",
      orderCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}
