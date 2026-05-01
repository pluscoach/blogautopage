import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL_ID = "gemini-2.5-flash";
const MAX_FREE_USES = 2;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// ===== 프롬프트 빌드 =====
function buildPrompt(category: string, subCategory: string, mode: string, userTopic: string) {
  const year = new Date().getFullYear();
  const seed = Math.random().toString(36).substring(7);

  let itSpecial = "";
  if (category === "IT 기기 리뷰") {
    itSpecial = `
**[특별 요청사항 - IT 기기 리뷰]:**
추천하는 10개의 제목 중 **최소 7개(70%) 이상**은 현재 시장에서 출시 예정이거나 이미 출시된 **구체적인 제품 모델명**(예: 아이폰 16 Pro, 갤럭시S24, 맥북 에어 M3, 소니 XM5 등)을 반드시 직접적으로 포함시켜요.`;
  }

  let homePlateStrategy = "";
  if (mode === "home-plate") {
    homePlateStrategy = `
**[홈판(피드) 노출 최적화 전략]:**
- **클릭 유도(CTR):** 사람들의 호기심을 자극하는 훅킹 문구를 사용하세요.
- **스토리텔링:** 1인칭 시점의 경험을 느끼게 하는 제목을 만드세요.
- **공감과 반전:** 독자가 공감할 수 있는 상황이나 예외적인 사실을 제시하세요.
- **비주얼 상상:** 제목만 봐도 그림이 그려지는 구체적인 묘사를 포함하세요.`;
  }

  let insightStrategy = "";
  if (mode === "insight-edge") {
    insightStrategy = `
**[인사이트 엣지(Insight Edge) 전략]:**
- **결핍(Pain Point) 분석:** 사람들이 해당 분야에서 겪는 '불편함', '미충족 욕구', '숨겨진 문제'를 짚어내세요.
- **마이크로 니치(Micro-Niche):** 타겟을 매우 좁게 설정하세요.
- **반골 기질(Contrarian):** 대중적 상식을 뒤집거나 다른 시각을 제시하세요.
- **커뮤니티 분석:** 사람들이 진짜로 궁금해하거나 불만으로 토로하는 실질적인 고민을 해결해주는 느낌이어야 합니다.`;
  }

  const optimizeTarget =
    mode === "home-plate" ? "홈판(피드) 추천 알고리즘" :
    mode === "rcon" ? "RCON 알고리즘" :
    mode === "insight-edge" ? "인사이트 엣지 전략" :
    "SEO";

  return `[Random Seed: ${seed}]
현재 연도(${year})를 기준으로 최신 트렌드와 이슈를 반영하여 아래 카테고리에 맞는 최신 인기 주제를 파악하세요.
카테고리: ${category} > ${subCategory}
${userTopic ? `사용자 요청 주제: ${userTopic}` : "사용자 요청 주제: (미공개 - 카테고리 내 최신 트렌드와 홈판 인기 주제를 분석하여 제안하세요)"}

파악된 트렌드와 사용자 주제를 바탕으로 네이버 블로그 ${optimizeTarget}에 최적화된 블로그 제목 10개를 추천해주세요.

**중요 요청사항 (다양성 확보):**
1. 매번 요청할 때마다 **기존과 겹치지 않는 새로운** 주제를 선정하세요.
2. 10개의 제목끼리 비슷한 키워드가 반복되지 않도록 **주제의 스펙트럼을 넓게** 잡아요.
3. 뻔한 주제보다는 현재 시점에서 사람들이 관심을 갖거나 트렌드에서 클릭을 만드는 **구체적이고 매력적인** 주제를 발굴하세요.
${itSpecial}
${homePlateStrategy}
${insightStrategy}

**[홈판 전략 적용 방법]:**
사용자가 입력한 주제("${userTopic || "없음"}")를 홈판 노출에 최적화된 스토리텔링형 제목으로 변환해요. 만약 주제가 없다면 해당 카테고리에서 홈판(추천 피드) 노출 확률이 높고, '라이프스타일·경험/감성 중심' 주제를 AI가 직접 선정하여 제안하세요.

**주의사항:** 제목에 '${year}년'과 같이 연도 표기를 기계적으로 붙이지 마세요. 최신성 강조가 필수적인 주제가 아니면 연도는 제외하고 자연스러운 제목을 만들어요.

반드시 아래와 같이 JSON 형식으로만 답해주세요. 추가적인 설명이나 마크다운 코드 블록(\`\`\`)은 사용하지 마세요.
[
    {
        "title": "제목 문자열",
        "mainKeyword": "메인 키워드",
        "subKeywords": "서브 키워드(콤마로 구분)",
        "rationale": "추천 이유(최신 트렌드 반영 내용 포함)"
    }
]`;
}

// ===== 응답 파싱 =====
function parseTitleResponse(responseText: string) {
  const raw = (responseText || "").trim() || "[]";
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
    return match ? JSON.parse(match[1].trim()) : [];
  }
}

// ===== 재시도 래퍼 =====
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 2000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = ((err as Error)?.message || String(err)).toLowerCase();
      const isRetryable = msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted");
      if (isRetryable && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ===== 메인 핸들러 =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { category, subCategory, mode, userTopic } = await req.json();

    if (!category || !subCategory) {
      return new Response(
        JSON.stringify({ error: "카테고리와 서브 카테고리를 선택해주세요." }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // IP 추출
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";

    // Supabase 클라이언트
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 사용 횟수 체크
    const { data: usage } = await supabase
      .from("title_recommend_usage")
      .select("count")
      .eq("ip", ip)
      .single();

    // 차단 IP 체크
    const { data: blocked } = await supabase
      .from("blocked_ips")
      .select("id")
      .eq("ip", ip)
      .single();

    if (blocked) {
      return new Response(
        JSON.stringify({ error: "이 IP에서는 더 이상 무료 체험을 이용할 수 없습니다. 정식 버전을 이용해주세요." }),
        { status: 429, headers: CORS_HEADERS }
      );
    }

    if (usage && usage.count >= MAX_FREE_USES) {
      // 횟수 초과 시 차단 IP에 등록
      await supabase
        .from("blocked_ips")
        .upsert({ ip, reason: "제목추천 무료체험 횟수 초과", created_at: new Date().toISOString() }, { onConflict: "ip" });

      return new Response(
        JSON.stringify({ error: "무료 체험 횟수(2회)를 모두 사용했습니다. 정식 버전에서 무제한으로 이용하세요!" }),
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // Gemini API 호출
    const prompt = buildPrompt(category, subCategory, mode || "default", userTopic || "");
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const config: Record<string, unknown> = {
      tools: [{ googleSearch: {} }],
    };
    const is25or3x = MODEL_ID.includes("2.5") || MODEL_ID.includes("3");
    const isPro = /pro/i.test(MODEL_ID);
    if (is25or3x && !isPro) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config,
      })
    );

    const titles = parseTitleResponse(response.text || "");

    // 사용 횟수 증가 (upsert)
    if (usage) {
      await supabase
        .from("title_recommend_usage")
        .update({ count: usage.count + 1, last_used: new Date().toISOString() })
        .eq("ip", ip);
    } else {
      await supabase
        .from("title_recommend_usage")
        .insert({ ip, count: 1, last_used: new Date().toISOString() });
    }

    console.log(`[recommend-titles] IP=${ip}, 사용횟수=${(usage?.count || 0) + 1}, 결과=${titles.length}개`);

    return new Response(
      JSON.stringify({ titles, remaining: MAX_FREE_USES - ((usage?.count || 0) + 1) }),
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[recommend-titles] 에러:", err);
    return new Response(
      JSON.stringify({ error: "제목 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
