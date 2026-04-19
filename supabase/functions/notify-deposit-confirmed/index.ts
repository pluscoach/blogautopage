import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendDepositReceivedNotice } from "../_shared/telegram.ts";
import { sendEmergencyAlertEmail } from "../_shared/resend.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * 고객이 무통장 모달에서 "입금 완료 후 눌러주세요" 버튼 클릭 시 호출되는 Edge Function.
 * 1. orderCode로 주문 조회
 * 2. 이미 처리된 주문이면 스킵 (멱등성)
 * 3. orders.status = '입금대기'로 UPDATE
 * 4. sendDepositReceivedNotice 호출 — reply_to_message_id로 원본 알림에 답장 연결
 */

interface RequestBody {
  orderCode?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "POST only" }),
      { status: 200, headers: corsHeaders },
    );
  }

  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid JSON" }),
      { status: 200, headers: corsHeaders },
    );
  }

  const orderCode = (body.orderCode || "").trim();
  if (!orderCode) {
    return new Response(
      JSON.stringify({ ok: false, error: "orderCode required" }),
      { status: 200, headers: corsHeaders },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. 주문 조회
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, name, email, phone, plan, amount, status, order_code, license_key, telegram_notice_message_id")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (fetchError || !order) {
      console.error(`[notify-deposit-confirmed] 주문 조회 실패: ${orderCode}`, fetchError);
      // [v2 정리] 주문 조회 실패 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 입금 완료 신고 처리 실패 — 주문 조회 실패",
        orderCode,
        errorMessage: fetchError?.message || "orders 테이블에 해당 주문 없음",
      });
      */
      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: corsHeaders },
      );
    }

    // 2. 이미 결제완료된 주문이면 스킵
    if (order.license_key) {
      console.log(`[notify-deposit-confirmed] 이미 발급됨 — 스킵: ${orderCode}`);
      return new Response(
        JSON.stringify({ ok: true, skipped: "already_issued" }),
        { status: 200, headers: corsHeaders },
      );
    }

    // 3. 이미 입금대기 상태이면 알림 중복 발송하지 않음
    if (order.status === "입금대기") {
      console.log(`[notify-deposit-confirmed] 이미 입금대기 — 중복 알림 스킵: ${orderCode}`);
      return new Response(
        JSON.stringify({ ok: true, skipped: "already_notified" }),
        { status: 200, headers: corsHeaders },
      );
    }

    // 4. status = '입금대기'로 UPDATE
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "입금대기" })
      .eq("id", order.id);

    if (updateError) {
      console.error(`[notify-deposit-confirmed] status UPDATE 실패: ${orderCode}`, updateError);
      // [v2 정리] DB UPDATE 실패 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 입금 완료 신고 처리 중 DB UPDATE 실패",
        orderCode,
        errorMessage: updateError.message,
      });
      */
    }

    // 5. 답장 연결 알림 발송 — telegram_notice_message_id 필수
    const replyToId = order.telegram_notice_message_id as number | null;
    if (!replyToId) {
      console.error(`[notify-deposit-confirmed] telegram_notice_message_id 없음: ${orderCode}`);
      // [v2 정리] message_id 누락 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 입금 완료 신고 — message_id 누락",
        orderCode,
        errorMessage: "orders.telegram_notice_message_id가 NULL. 첫 번째 알림 발송 실패했을 가능성.",
      });
      */
      return new Response(
        JSON.stringify({ ok: true, warning: "reply_linkage_missing" }),
        { status: 200, headers: corsHeaders },
      );
    }

    const ok = await sendDepositReceivedNotice({
      orderCode: order.order_code as string,
      replyToMessageId: replyToId,
    });

    if (!ok) {
      console.error(`[notify-deposit-confirmed] sendDepositReceivedNotice 실패: ${orderCode}`);
      // [v2 정리] 텔레그램 답장 알림 실패는 불필요로 판단되어 비활성화됨 (2026-04-19)
      /*
      await sendEmergencyAlertEmail({
        subject: "🚨 입금 완료 신고 알림 발송 실패",
        orderCode,
        errorMessage: "sendDepositReceivedNotice 반환 false",
      });
      */
    }

    console.log(`[notify-deposit-confirmed] 완료: ${orderCode}`);
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error(`[notify-deposit-confirmed] 예외: ${orderCode}`, err);
    // [v2 정리] 전체 예외 알림은 불필요로 판단되어 비활성화됨 (2026-04-19)
    /*
    await sendEmergencyAlertEmail({
      subject: "🚨 입금 완료 신고 처리 예외",
      orderCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    */
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: corsHeaders },
    );
  }
});
