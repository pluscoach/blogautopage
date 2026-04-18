import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendDepositNoticeWithButtons } from "../_shared/telegram.ts";
import { sendEmergencyAlertEmail } from "../_shared/resend.ts";
import { getPlanLabel } from "../_shared/labels.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * 고객이 무통장 모달에서 "입금 완료 후 눌러주세요" 버튼 클릭 시 호출되는 Edge Function.
 * 1. orderCode로 주문 조회
 * 2. 이미 처리된 주문이면 스킵 (멱등성)
 * 3. orders.status = '입금대기'로 UPDATE
 * 4. sendDepositNoticeWithButtons 호출 — reply_to_message_id로 원본 알림에 답장 연결
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
      await sendEmergencyAlertEmail({
        subject: "🚨 입금 완료 신고 처리 실패 — 주문 조회 실패",
        orderCode,
        errorMessage: fetchError?.message || "orders 테이블에 해당 주문 없음",
      });
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
      await sendEmergencyAlertEmail({
        subject: "🚨 입금 완료 신고 처리 중 DB UPDATE 실패",
        orderCode,
        errorMessage: updateError.message,
      });
    }

    // 5. sendDepositNoticeWithButtons 호출 — 답장 연결
    const ok = await sendDepositNoticeWithButtons({
      name: order.name as string,
      email: order.email as string,
      phone: (order.phone as string) || "(미입력)",
      plan: order.plan as string,
      planLabel: getPlanLabel(order.plan as string),
      amount: order.amount as number,
      orderCode: order.order_code as string,
      replyToMessageId: (order.telegram_notice_message_id as number) || undefined,
    });

    if (!ok) {
      console.error(`[notify-deposit-confirmed] sendDepositNoticeWithButtons 실패: ${orderCode}`);
      await sendEmergencyAlertEmail({
        subject: "🚨 입금 완료 신고 알림 발송 실패",
        orderCode,
        errorMessage: "sendDepositNoticeWithButtons 반환 false",
        context: { has_reply_to: !!order.telegram_notice_message_id },
      });
    }

    console.log(`[notify-deposit-confirmed] 완료: ${orderCode}`);
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error(`[notify-deposit-confirmed] 예외: ${orderCode}`, err);
    await sendEmergencyAlertEmail({
      subject: "🚨 입금 완료 신고 처리 예외",
      orderCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: corsHeaders },
    );
  }
});
