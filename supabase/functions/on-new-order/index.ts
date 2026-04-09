import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendKakaoNotification } from "../_shared/kakao.ts";
import { sendTelegramNotification } from "../_shared/telegram.ts";
import { sendOrderConfirmationEmail } from "../_shared/resend.ts";

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

    // ===== 3중 알림 병렬 발송 =====
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

    // ===== 무료체험 자동 분기 (Phase 6에서 구현) =====
    // if (record.plan === 'free_trial') {
    //   1. create_license RPC 호출 (service_role)
    //   2. 라이선스 키 받아서 orders.license_key 업데이트
    //   3. Resend로 "인증키 발급" 이메일 발송
    //   4. orders.status → '발송완료'
    // }

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
      }
    );
  } catch (err) {
    console.error("[on-new-order] 전체 에러:", err);
    // 에러여도 200 반환 — Trigger 재시도 방지
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
