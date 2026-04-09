import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KAKAO_REST_API_KEY = Deno.env.get("KAKAO_REST_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface KakaoTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
}

/**
 * kakao_tokens 테이블에서 토큰을 읽고, 만료 임박(5분 이내)이면 자동 갱신
 */
async function getValidAccessToken(): Promise<string> {
  // 1. 테이블에서 현재 토큰 읽기
  const { data, error } = await supabase
    .from("kakao_tokens")
    .select("access_token, refresh_token, access_token_expires_at")
    .eq("id", 1)
    .single();

  if (error || !data) {
    throw new Error(`kakao_tokens 조회 실패: ${error?.message}`);
  }

  const tokens = data as KakaoTokens;
  const expiresAt = new Date(tokens.access_token_expires_at);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;

  // 2. 만료 5분 전이면 갱신
  if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
    console.log("[kakao] access_token 만료 임박, refresh 진행...");
    return await refreshAccessToken(tokens.refresh_token);
  }

  return tokens.access_token;
}

/**
 * refresh_token으로 새 access_token 발급 + DB 저장
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: KAKAO_REST_API_KEY,
      refresh_token: refreshToken,
    }),
  });

  const result = await res.json();

  if (!res.ok || !result.access_token) {
    throw new Error(`카카오 토큰 갱신 실패: ${JSON.stringify(result)}`);
  }

  // 새 토큰으로 DB 업데이트
  const updateData: Record<string, unknown> = {
    access_token: result.access_token,
    access_token_expires_at: new Date(
      Date.now() + result.expires_in * 1000
    ).toISOString(),
  };

  // refresh_token도 갱신된 경우 (만료 1개월 이내일 때 카카오가 새로 줌)
  if (result.refresh_token) {
    updateData.refresh_token = result.refresh_token;
    console.log("[kakao] refresh_token도 갱신됨");
  }

  const { error } = await supabase
    .from("kakao_tokens")
    .update(updateData)
    .eq("id", 1);

  if (error) {
    console.error("[kakao] 토큰 DB 저장 실패:", error.message);
  }

  console.log("[kakao] access_token 갱신 완료");
  return result.access_token;
}

/**
 * 카카오톡 "나에게 보내기" 발송
 */
export async function sendKakaoNotification(order: Record<string, unknown>): Promise<void> {
  const accessToken = await getValidAccessToken();

  const templateObject = {
    object_type: "text",
    text: `🔔 새 주문이 들어왔습니다\n\n👤 이름: ${order.name}\n📧 이메일: ${order.email}\n📦 플랜: ${order.plan} (${Number(order.amount).toLocaleString()}원)\n🎫 주문 코드: ${order.order_code}\n🌐 IP: ${order.ip || "N/A"}\n⏰ 시간: ${order.created_at}\n\n[주문 ID: ${order.id}]`,
    link: {
      web_url: "https://blog.pluscoach.co.kr",
      mobile_web_url: "https://blog.pluscoach.co.kr",
    },
  };

  const res = await fetch(
    "https://kapi.kakao.com/v2/api/talk/memo/default/send",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(templateObject),
      }),
    }
  );

  const result = await res.json();

  if (!res.ok) {
    throw new Error(`카카오 발송 실패 (${res.status}): ${JSON.stringify(result)}`);
  }

  console.log("[kakao] 발송 성공:", result);
}
