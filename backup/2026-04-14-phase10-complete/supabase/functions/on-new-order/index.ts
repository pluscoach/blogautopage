import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendKakaoNotification } from "../_shared/kakao.ts";
import { sendTelegramNotification } from "../_shared/telegram.ts";
import { sendOrderConfirmationEmail, sendLicenseKeyEmail } from "../_shared/resend.ts";

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

    // ===== 유료 플랜은 payapp-webhook이 결제 완료 후 처리 =====
    if (record.plan !== "free_trial") {
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

    // ===== 무료체험: 3중 알림 병렬 발송 =====
    const results = await Promise.allSettled([
      sendKakaoNotification(record),
      sendTelegramNotification(record),
      sendOrderConfirmationEmail(record),
    ]);

    // 각 결과 로그
    const labels = ["kakao", "telegram", "resend"];
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        console.log(`[on-new-order] ${labels[i]}: ✅ 성공`);
      } else {
        console.error(`[on-new-order] ${labels[i]}: ❌ 실패 —`, result.reason?.message);
      }
    });

    // ===== 무료체험 라이선스 발급 =====
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 방어 가드: 필수 필드 누락 체크
    if (!record.email || !record.name || !record.order_code) {
      console.error("[on-new-order] free_trial 필수 필드 누락:", record);
      await supabase.from("orders").update({ status: "데이터오류" }).eq("id", record.id);
      return new Response(
        JSON.stringify({ success: false, error: "missing fields" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 1. create_license RPC 호출
    const { data: licenseKey, error: licenseError } = await supabase.rpc("create_license", {
      p_buyer_name: record.name,
      p_plan: record.plan,
      p_order_code: record.order_code,
    });

    if (licenseError || !licenseKey) {
      console.error("[on-new-order] 라이선스 발급 실패:", licenseError?.message);
      await supabase.from("orders").update({ status: "발급실패" }).eq("id", record.id);
      return new Response(
        JSON.stringify({ success: false, error: "license creation failed" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log("[on-new-order] 라이선스 발급 성공:", licenseKey);

    // 2. orders 테이블 UPDATE (license_key + status)
    const { error: updateError } = await supabase
      .from("orders")
      .update({ license_key: licenseKey, status: "발송완료" })
      .eq("id", record.id);

    if (updateError) {
      console.error("[on-new-order] orders UPDATE 실패:", updateError.message);
      try {
        await sendTelegramNotification({
          name: `⚠️ 긴급: orders UPDATE 실패 (id=${record.id})`,
          email: record.email,
          plan: "free_trial",
          order_code: record.order_code,
          amount: 0,
          status: `발급된 키: ${licenseKey} / DB 반영 실패 → 수동 확인 필요`,
        });
      } catch (e) {
        console.error("[on-new-order] 긴급 텔레그램 알림도 실패:", e);
      }
    }

    // 3. 인증키 이메일 발송
    const downloadUrl = Deno.env.get("DOWNLOAD_URL_FREE");
    if (!downloadUrl) {
      console.error("[on-new-order] DOWNLOAD_URL_FREE 환경변수 미설정");
      await supabase.from("orders").update({ status: "이메일실패" }).eq("id", record.id);
    } else {
      try {
        await sendLicenseKeyEmail({
          to: record.email,
          name: record.name,
          plan: record.plan,
          licenseKey,
          downloadUrl,
          isPaid: false,
        });
        console.log("[on-new-order] 인증키 이메일 발송 완료");
      } catch (emailError) {
        console.error("[on-new-order] 인증키 이메일 발송 실패:", emailError);
        await supabase.from("orders").update({ status: "이메일실패" }).eq("id", record.id);
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
