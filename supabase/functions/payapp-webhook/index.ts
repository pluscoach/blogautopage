import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parsePayappForm, verifyPayappLinkval } from "../_shared/payapp.ts";
import { sendLicenseKeyEmail } from "../_shared/resend.ts";
import { sendPaidOrderKakao } from "../_shared/kakao.ts";
import { sendPaidOrderTelegram } from "../_shared/telegram.ts";

const OK = () => new Response("SUCCESS", { status: 200 });

Deno.serve(async (req) => {
  // 모든 경로에서 SUCCESS 200 반환 (페이앱이 재시도 10회까지 때림)
  try {
    const body = await parsePayappForm(req);

    // 1. linkval 검증
    if (!verifyPayappLinkval(body.linkval ?? "")) {
      console.error("[payapp-webhook] linkval 불일치", {
        linkval: body.linkval,
      });
      return OK();
    }

    // 2. pay_state=4(결제완료)만 처리
    const payState = parseInt(body.pay_state ?? "0");
    if (payState !== 4) {
      console.log("[payapp-webhook] pay_state 무시:", payState);
      return OK();
    }

    // 3. var1에서 order_code 추출
    const orderCode = body.var1 ?? "";
    if (!orderCode) {
      console.error("[payapp-webhook] order_code 없음");
      return OK();
    }

    console.log("[payapp-webhook] 결제 완료 수신:", {
      orderCode,
      price: body.price,
      goodname: body.goodname,
      mul_no: body.mul_no,
    });

    // 4. Supabase 클라이언트
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 5. orders 조회
    const { data: order, error: selectErr } = await supabase
      .from("orders")
      .select(
        "id, name, email, plan, amount, status, license_key, order_code",
      )
      .eq("order_code", orderCode)
      .single();

    if (selectErr || !order) {
      console.error("[payapp-webhook] 주문 없음:", orderCode, selectErr);
      return OK();
    }

    // 6. 중복 처리 방지 (이미 라이선스 발급됨)
    if (order.license_key) {
      console.log("[payapp-webhook] 이미 처리됨:", orderCode);
      return OK();
    }

    // 7. 금액 검증
    const paidPrice = parseInt(body.price ?? "0");
    if (paidPrice !== order.amount) {
      console.error("[payapp-webhook] 금액 불일치", {
        expected: order.amount,
        paid: paidPrice,
      });
      await supabase
        .from("orders")
        .update({ status: "금액불일치" })
        .eq("id", order.id);
      return OK();
    }

    // 8. 라이선스 발급
    const { data: licenseKey, error: licenseErr } = await supabase.rpc(
      "create_license",
      {
        p_buyer_name: order.name,
        p_plan: order.plan,
        p_order_code: order.order_code,
      },
    );

    if (licenseErr || !licenseKey) {
      console.error(
        "[payapp-webhook] 라이선스 발급 실패:",
        licenseErr?.message,
      );
      await supabase
        .from("orders")
        .update({ status: "발급실패" })
        .eq("id", order.id);
      return OK();
    }

    console.log("[payapp-webhook] 라이선스 발급 성공:", licenseKey);

    // 9. orders UPDATE
    await supabase
      .from("orders")
      .update({ license_key: licenseKey, status: "결제완료" })
      .eq("id", order.id);

    // 10. 인증키 이메일 (DOWNLOAD_URL_PAID 사용)
    const downloadUrl = Deno.env.get("DOWNLOAD_URL_PAID");
    if (downloadUrl) {
      try {
        await sendLicenseKeyEmail({
          to: order.email,
          name: order.name,
          plan: order.plan,
          licenseKey,
          downloadUrl,
          isPaid: true,
        });
        console.log("[payapp-webhook] 인증키 이메일 발송 완료");
      } catch (e) {
        console.error("[payapp-webhook] 이메일 실패:", e);
        await supabase
          .from("orders")
          .update({ status: "이메일실패" })
          .eq("id", order.id);
      }
    } else {
      console.error("[payapp-webhook] DOWNLOAD_URL_PAID 환경변수 미설정");
      await supabase
        .from("orders")
        .update({ status: "이메일실패" })
        .eq("id", order.id);
    }

    // 11. 사장님 카톡/텔레그램 결제 완료 알림
    const notifParams = {
      name: order.name,
      email: order.email,
      plan: order.plan,
      price: paidPrice,
      orderCode: order.order_code,
      orderId: order.id,
      payType: parseInt(body.pay_type ?? "0"),
      payDate: body.pay_date ?? "",
    };

    const notifResults = await Promise.allSettled([
      sendPaidOrderKakao(notifParams),
      sendPaidOrderTelegram(notifParams),
    ]);

    notifResults.forEach((r, i) => {
      const label = i === 0 ? "kakao" : "telegram";
      if (r.status === "fulfilled") {
        console.log(`[payapp-webhook] ${label} 결제 알림: ✅ 성공`);
      } else {
        console.error(`[payapp-webhook] ${label} 결제 알림: ❌ 실패 —`, r.reason?.message);
      }
    });

    return OK();
  } catch (e) {
    console.error("[payapp-webhook] 예외:", e);
    return OK();
  }
});
