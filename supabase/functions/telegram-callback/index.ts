import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  editTelegramMessage,
  answerCallbackQuery,
  sendTelegramMessage,
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

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  reply_to_message?: {
    message_id: number;
    text?: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
  message?: TelegramMessage;
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

  const callbackQuery = update.callback_query;
  const message = update.message;

  // callback_query는 인라인 버튼 클릭
  if (callbackQuery) {
    const callbackQueryId = callbackQuery.id;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const callbackData = callbackQuery.data || "";

    console.log(`[telegram-callback] 수신: ${callbackData}`);

    // callback_data 파싱: "approve:오준석-A3X7" 등
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
    } else if (action === "resend_same") {
      await handleResendSame({
        supabase,
        orderCode,
        callbackQueryId,
        chatId,
        messageId,
        originalText: callbackQuery.message.text || "",
      });
    } else if (action === "resend_new") {
      await handleResendNewPrompt({
        callbackQueryId,
        chatId,
        orderCode,
      });
    } else {
      console.error(`[telegram-callback] 알 수 없는 action: ${action}`);
      await answerCallbackQuery({ callbackQueryId, text: "❌ 알 수 없는 요청" });
    }

    return new Response("OK", { status: 200 });
  }

  // message는 일반 텍스트 (force_reply 응답 포함)
  if (message) {
    await handleIncomingMessage({
      message,
      supabase: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
    });
    return new Response("OK", { status: 200 });
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
      // [v2 정리] 주문 조회 실패 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 처리 실패 — 주문 조회 실패",
        orderCode,
        errorMessage: fetchError?.message || "orders 테이블에 해당 주문 없음",
      });
      */
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
        orderCode,
        errorType: "LICENSE_CREATE_FAILED",
        errorMessage: licenseError?.message || "create_license RPC 반환값 없음",
        order: {
          name: order.name as string,
          email: order.email as string,
          phone: order.phone as string | undefined,
          plan: order.plan as string,
          amount: order.amount as number,
          order_code: order.order_code as string,
        },
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
      // [v2 정리] DB UPDATE 실패 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 처리 중 DB UPDATE 실패 (라이선스는 발급됨)",
        orderCode,
        errorMessage: updateError.message,
        context: { license_key: licenseKey, order_id: order.id },
      });
      */
    }

    // 5. 인증키 이메일 발송 (기존 sendLicenseKeyEmail 재사용, isPaid=true)
    if (!DOWNLOAD_URL_PAID) {
      console.error("[telegram-callback/approve] DOWNLOAD_URL_PAID 미설정");
      await supabase.from("orders").update({ status: "이메일실패" }).eq("id", order.id);
      await answerCallbackQuery({ callbackQueryId, text: "⚠️ 이메일 발송 실패 (DOWNLOAD_URL_PAID 미설정)" });
      // [v2 정리] 환경변수 미설정 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 무통장 승인 — DOWNLOAD_URL_PAID 미설정",
        orderCode,
        errorMessage: "DOWNLOAD_URL_PAID 환경변수가 설정되지 않아 이메일 발송 불가. 수동 처리 필요.",
        context: { license_key: licenseKey },
      });
      */
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
        orderCode,
        errorType: "EMAIL_SEND_FAILED",
        errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
        order: {
          name: order.name as string,
          email: order.email as string,
          phone: order.phone as string | undefined,
          plan: order.plan as string,
          amount: order.amount as number,
          order_code: order.order_code as string,
          license_key: licenseKey as string,
        },
        context: { license_key: licenseKey, to: order.email },
      });
      return;
    }

    // 6. 텔레그램 메시지 편집: "✅ 완료됨" + 재발송 버튼
    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
    });
    const editedText =
      `${originalText}\n\n` +
      `━━━━━━━━━━\n` +
      `✅ <b>완료됨</b> (${now})\n` +
      `인증키: <code>${licenseKey}</code>\n` +
      `📧 ${order.email}`;

    // 재발송 버튼 2개 포함하여 편집
    const resendButtons = buildResendButtons(orderCode);
    await editTelegramMessage({ chatId, messageId, text: editedText, replyMarkup: resendButtons });

    // 7. 버튼 누른 사람에게 성공 토스트
    await answerCallbackQuery({ callbackQueryId, text: "✅ 인증키 발송 완료" });

    console.log(`[telegram-callback/approve] 완료: ${orderCode} → ${licenseKey}`);
  } catch (err) {
    console.error(`[telegram-callback/approve] 예외: ${orderCode}`, err);
    await answerCallbackQuery({ callbackQueryId, text: "❌ 처리 중 오류" });
    // [v2 정리] handleApprove 전체 예외 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
    /*
    await sendEmergencyAlertEmail({
      subject: "🚨 무통장 승인 — 예외 발생",
      orderCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    */
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
      // [v2 정리] 리마인더 이메일 실패 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 리마인더 발송 실패",
        orderCode,
        errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
        context: { to: order.email },
      });
      */
      return;
    }

    // 4. status는 '입금대기' 유지 (덮어쓰지 않음 — 여러 번 리마인더 가능)

    // 5. 텔레그램 메시지 편집 (리마인더 기록 추가 + 원본 버튼 그대로 유지)
    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
    });
    const editedText = `${originalText}\n\n📧 리마인더 발송됨 (${now})`;

    // 원본 인라인 버튼 동일하게 재전송 — sendDepositNoticeWithButtons와 100% 일치
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "✅ 승인 → 인증키 발송",
            callback_data: `approve:${orderCode}`,
          },
          {
            text: "📧 리마인더 발송",
            callback_data: `remind:${orderCode}`,
          },
        ],
      ],
    };

    await editTelegramMessage({ chatId, messageId, text: editedText, replyMarkup });

    // 6. 버튼 누른 사람에게 성공 토스트
    await answerCallbackQuery({ callbackQueryId, text: "📧 리마인더 발송 완료" });

    console.log(`[telegram-callback/remind] 완료: ${orderCode}`);
  } catch (err) {
    console.error(`[telegram-callback/remind] 예외: ${orderCode}`, err);
    await answerCallbackQuery({ callbackQueryId, text: "❌ 처리 중 오류" });
    // [v2 정리] handleRemind 예외 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
    /*
    await sendEmergencyAlertEmail({
      subject: "🚨 리마인더 — 예외 발생",
      orderCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    */
  }
}

/**
 * 재발송 버튼 2개 inline_keyboard 빌더 (DRY)
 */
function buildResendButtons(orderCode: string) {
  return {
    inline_keyboard: [
      [
        { text: "🔄 같은 이메일 재발송", callback_data: `resend_same:${orderCode}` },
        { text: "✏️ 다른 이메일로", callback_data: `resend_new:${orderCode}` },
      ],
    ],
  };
}

/**
 * [🔄 같은 이메일 재발송] 처리
 * 원본 email로 같은 인증키 재발송.
 */
async function handleResendSame(params: {
  supabase: ReturnType<typeof createClient>;
  orderCode: string;
  callbackQueryId: string;
  chatId: number;
  messageId: number;
  originalText: string;
}) {
  const { supabase, orderCode, callbackQueryId, chatId, messageId, originalText } = params;

  try {
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, name, email, plan, license_key, order_code")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (fetchError || !order) {
      await answerCallbackQuery({ callbackQueryId, text: "❌ 주문 없음" });
      return;
    }

    if (!order.license_key) {
      await answerCallbackQuery({
        callbackQueryId,
        text: "⚠️ 아직 인증키 미발급 — 먼저 승인하세요",
      });
      return;
    }

    if (!DOWNLOAD_URL_PAID) {
      await answerCallbackQuery({ callbackQueryId, text: "❌ DOWNLOAD_URL_PAID 미설정" });
      // [v2 정리] 환경변수 미설정 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 재발송 실패 — DOWNLOAD_URL_PAID 미설정",
        orderCode,
        errorMessage: "환경변수 DOWNLOAD_URL_PAID가 설정되지 않음",
      });
      */
      return;
    }

    try {
      await sendLicenseKeyEmail({
        to: order.email,
        name: order.name,
        licenseKey: order.license_key,
        downloadUrl: DOWNLOAD_URL_PAID,
        plan: order.plan,
        isPaid: true,
      });
    } catch (emailError) {
      await answerCallbackQuery({ callbackQueryId, text: "❌ 재발송 실패" });
      // [v2 정리] 재발송 실패 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 재발송 실패 (같은 이메일)",
        orderCode,
        errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
        context: { to: order.email, license_key: order.license_key },
      });
      */
      return;
    }

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
    });
    const editedText = `${originalText}\n🔄 재발송됨 (${now}) → ${order.email}`;

    const resendButtons = buildResendButtons(orderCode);
    await editTelegramMessage({
      chatId, messageId, text: editedText, replyMarkup: resendButtons,
    });

    await answerCallbackQuery({ callbackQueryId, text: "✅ 재발송 완료" });
    console.log(`[telegram-callback/resend_same] 완료: ${orderCode} → ${order.email}`);
  } catch (err) {
    console.error(`[telegram-callback/resend_same] 예외: ${orderCode}`, err);
    await answerCallbackQuery({ callbackQueryId, text: "❌ 처리 중 오류" });
    // [v2 정리] 재발송 예외 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
    /*
    await sendEmergencyAlertEmail({
      subject: "🚨 재발송 (같은 이메일) — 예외",
      orderCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    */
  }
}

/**
 * [✏️ 다른 이메일로 재발송] 처리 — force_reply 프롬프트 발송
 */
async function handleResendNewPrompt(params: {
  callbackQueryId: string;
  chatId: number;
  orderCode: string;
}) {
  const { callbackQueryId, chatId, orderCode } = params;

  const promptText =
    `📧 주문 <code>${orderCode}</code>\n` +
    `새 이메일 주소를 이 메시지에 회신해주세요.\n\n` +
    `예: new@naver.com\n\n` +
    `(잘못 눌렀다면 이 메시지 무시하셔도 됩니다)`;

  const result = await sendTelegramMessage({
    chatId,
    text: promptText,
    parseMode: "HTML",
    replyMarkup: {
      force_reply: true,
      input_field_placeholder: "새 이메일 주소 입력",
      selective: false,
    },
  });

  if (result.ok) {
    await answerCallbackQuery({ callbackQueryId, text: "📧 새 이메일 입력 대기 중" });
  } else {
    await answerCallbackQuery({ callbackQueryId, text: "❌ 프롬프트 발송 실패" });
  }
}

/**
 * 일반 text 메시지 수신 처리
 * force_reply 응답인지 판별 → 재발송 처리
 */
async function handleIncomingMessage(params: {
  message: TelegramMessage;
  supabase: ReturnType<typeof createClient>;
}) {
  const { message, supabase } = params;
  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  // 회신 대상 메시지가 없으면 일반 대화 — 무시
  const replyTo = message.reply_to_message;
  if (!replyTo || !replyTo.text) {
    console.log("[telegram-callback/message] reply_to_message 없음, 무시");
    return;
  }

  // 회신 대상 메시지가 "주문 {orderCode}" 형식인지 확인
  const orderCodeMatch = replyTo.text.match(/주문\s+([가-힣a-zA-Z0-9\-]+)/);
  if (!orderCodeMatch) {
    console.log("[telegram-callback/message] 주문코드 없는 reply, 무시");
    return;
  }
  const orderCode = orderCodeMatch[1];

  // 이메일 형식 검증
  const emailMatch = text.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if (!emailMatch) {
    await sendTelegramMessage({
      chatId,
      text:
        `❌ 올바른 이메일 형식이 아니에요.\n` +
        `(예: name@example.com)\n\n` +
        `주문 ${orderCode} 다른 이메일 재발송을 원하시면 원본 메시지의 [✏️ 다른 이메일로] 버튼을 다시 눌러주세요.`,
    });
    return;
  }
  const newEmail = text;

  // 주문 조회
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, name, email, plan, license_key, order_code")
    .eq("order_code", orderCode)
    .maybeSingle();

  if (fetchError || !order) {
    await sendTelegramMessage({
      chatId,
      text: `❌ 주문 ${orderCode}을(를) 찾을 수 없어요.`,
    });
    return;
  }

  if (!order.license_key) {
    await sendTelegramMessage({
      chatId,
      text: `⚠️ 주문 ${orderCode}은 아직 인증키 미발급 상태입니다. 먼저 [✅ 승인]을 눌러주세요.`,
    });
    return;
  }

  if (!DOWNLOAD_URL_PAID) {
    await sendTelegramMessage({
      chatId,
      text: `❌ 재발송 실패 — DOWNLOAD_URL_PAID 환경변수 미설정. 관리자에게 문의.`,
    });
    // [v2 정리] 환경변수 미설정 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
    /*
    await sendEmergencyAlertEmail({
      subject: "🚨 재발송 (다른 이메일) 실패 — 환경변수",
      orderCode,
      errorMessage: "DOWNLOAD_URL_PAID 미설정",
    });
    */
    return;
  }

  // 새 이메일로 재발송
  try {
    await sendLicenseKeyEmail({
      to: newEmail,
      name: order.name,
      licenseKey: order.license_key,
      downloadUrl: DOWNLOAD_URL_PAID,
      plan: order.plan,
      isPaid: true,
    });
  } catch (emailError) {
    await sendTelegramMessage({
      chatId,
      text: `❌ 재발송 실패: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
    });
    // [v2 정리] 다른 이메일 재발송 실패 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
    /*
    await sendEmergencyAlertEmail({
      subject: "🚨 재발송 (다른 이메일) 실패",
      orderCode,
      errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
      context: { to: newEmail, license_key: order.license_key },
    });
    */
    return;
  }

  // 성공 피드백
  const now = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  });
  await sendTelegramMessage({
    chatId,
    text: `✅ 재발송 완료\n주문: ${orderCode}\n→ ${newEmail}\n(${now})`,
  });

  console.log(`[telegram-callback/message] 다른 이메일 재발송 완료: ${orderCode} → ${newEmail}`);
}
