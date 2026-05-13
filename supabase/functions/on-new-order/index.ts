import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendKakaoNotification } from "../_shared/kakao.ts";
import { sendTelegramNotification, sendDepositNoticeWithButtons, sendTelegramMessage } from "../_shared/telegram.ts";
import { sendOrderConfirmationEmail, sendLicenseKeyEmail } from "../_shared/resend.ts";
import { getPlanLabel } from "../_shared/labels.ts";

serve(async (req) => {
  try {
    const { record } = await req.json();

    if (!record) {
      console.error("[on-new-order] record 없음");
      return new Response(JSON.stringify({ error: "no record" }), { status: 200 });
    }

    console.log("[on-new-order] 새 주문 수신:", {
      id: record.id,
      name: record.name,
      plan: record.plan,
      order_code: record.order_code,
    });

    // ===== 유료 플랜: PAYMENT_MODE에 따라 분기 =====
    if (record.plan !== "free_trial") {
      const PAYMENT_MODE = Deno.env.get("PAYMENT_MODE") || "payapp";

      if (PAYMENT_MODE === "bank_transfer") {
        // 무통장 경로: 버튼 포함 알림 발송 + message_id 저장
        console.log(`[on-new-order] 무통장 모드: 버튼 포함 알림 발송 (${record.order_code})`);

        try {
          // 1. 버튼 포함 알림 발송 + message_id 회수
          const noticeResult = await sendDepositNoticeWithButtons({
            name: record.name as string,
            email: record.email as string,
            phone: (record.phone as string) || "(미입력)",
            plan: record.plan as string,
            planLabel: getPlanLabel(record.plan as string),
            amount: record.amount as number,
            orderCode: record.order_code as string,
          });

          // 2. telegram_notice_message_id 저장 (발송 성공 시만)
          //    status는 '결제대기' 유지 (입금대기는 notify-deposit-confirmed 담당)
          if (noticeResult.ok && noticeResult.messageId) {
            const supabase = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            );

            const { error: updateError } = await supabase
              .from("orders")
              .update({ telegram_notice_message_id: noticeResult.messageId })
              .eq("id", record.id);

            if (updateError) {
              console.error(`[on-new-order] telegram_notice_message_id UPDATE 실패: ${record.order_code}`, updateError);
            }
          } else {
            console.error(`[on-new-order] 알림 발송 실패 또는 messageId 없음: ${record.order_code}`);
          }
        } catch (err) {
          console.error(`[on-new-order] 무통장 처리 중 예외: ${record.order_code}`, err);
        }

        return new Response(
          JSON.stringify({ ok: true, mode: "bank_transfer" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // PAYMENT_MODE === 'payapp' (기본값): 기존 동작 그대로 — payapp-webhook이 처리
      console.log("[on-new-order] 유료 플랜은 payapp-webhook이 처리함. 스킵.", {
        order_id: record.id,
        plan: record.plan,
        order_code: record.order_code,
      });
      return new Response(
        JSON.stringify({ ok: true, skipped: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ===== 무료체험: 알림 없이 처리 (IP 3회 이상만 텔레그램 경고) =====
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // IP 차단 체크
    if (record.ip) {
      const { data: blocked } = await supabase
        .from("blocked_ips")
        .select("ip")
        .eq("ip", record.ip)
        .maybeSingle();

      if (blocked) {
        console.log(`[on-new-order] 차단된 IP: ${record.ip} — 무료체험 거부`);
        await supabase.from("orders").update({ status: "IP차단" }).eq("id", record.id);
        return new Response(
          JSON.stringify({ ok: true, blocked: true }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // 같은 IP로 free_trial 주문 횟수 체크
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("ip", record.ip)
        .eq("plan", "free_trial");

      if (count && count >= 3) {
        console.log(`[on-new-order] 동일 IP ${record.ip} 무료체험 ${count}회 — 텔레그램 경고`);
        const TELEGRAM_CHAT_ID = Number(Deno.env.get("TELEGRAM_CHAT_ID"));
        if (TELEGRAM_CHAT_ID) {
          await sendTelegramMessage({
            chatId: TELEGRAM_CHAT_ID,
            text: `⚠️ 동일 IP 무료체험 ${count}회 감지\n\n🌐 IP: ${record.ip}\n👤 이름: ${record.name}\n📧 이메일: ${record.email}\n🔑 주문코드: ${record.order_code}`,
            replyMarkup: {
              inline_keyboard: [[
                { text: "🚫 이 IP 차단", callback_data: `block_ip:${record.ip}` },
              ]],
            },
          });
        }
      }
    }

    // 방어 가드: 필수 필드 누락 체크
    if (!record.email || !record.name || !record.order_code) {
      console.error("[on-new-order] free_trial 필수 필드 누락:", record);
      await supabase.from("orders").update({ status: "데이터오류" }).eq("id", record.id);
      return new Response(
        JSON.stringify({ success: false, error: "missing fields" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 무료체험: 자동 발급 안 함 — 텔레그램 승인 버튼만 발송, 사장님 승인 후 발급
    await supabase.from("orders").update({ status: "무료체험대기" }).eq("id", record.id);

    const TELEGRAM_CHAT_ID = Number(Deno.env.get("TELEGRAM_CHAT_ID"));
    if (TELEGRAM_CHAT_ID) {
      const planLabel = getPlanLabel(record.plan);
      const msgResult = await sendTelegramMessage({
        chatId: TELEGRAM_CHAT_ID,
        text: `🆓 무료체험 신청\n\n👤 이름: ${record.name}\n📧 이메일: ${record.email}\n📋 플랜: ${planLabel}\n🔑 주문코드: ${record.order_code}\n🌐 IP: ${record.ip || "없음"}`,
        replyMarkup: {
          inline_keyboard: [[
            { text: "✅ 무료체험 승인 (인증키 발급)", callback_data: `approve_free:${record.order_code}` },
          ]],
        },
      });
      // message_id 저장 (나중에 버튼 업데이트용)
      if (msgResult?.message_id) {
        await supabase.from("orders").update({ telegram_msg_id: msgResult.message_id }).eq("id", record.id);
      }
    }

    // 항상 200 반환 — Trigger 재시도 방지
    return new Response(
      JSON.stringify({
        success: true,
        notifications: {
          kakao: results[0].status,
          telegram: results[1].status,
          resend: results[2].status,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[on-new-order] 전체 에러:", err);
    // 에러여도 200 반환 — Trigger 재시도 방지
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
