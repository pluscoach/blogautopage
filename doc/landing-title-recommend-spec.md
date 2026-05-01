# 인기 카테고리 제목 추천 - 랜딩페이지 구현 스펙

> 원본 앱(AI 블로그 에디터)의 "인기 제목 검색" 기능을 독립 실행 가능한 형태로 추출한 문서입니다.
> 정적 HTML 랜딩페이지에서 4회 제한으로 동일 기능을 구현하기 위한 스펙입니다.

---

## 1. API 호출 로직

### Endpoint / SDK

Gemini API는 REST endpoint가 아닌 **Google GenAI JavaScript SDK**를 사용합니다.

```
npm 패키지: @google/genai
```

### 기본 호출 구조

```javascript
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'YOUR_API_KEY' });

const response = await ai.models.generateContent({
  model: modelId,       // 예: 'gemini-3.1-pro-preview'
  contents: prompt,     // 문자열 프롬프트
  config: config,       // 아래 설정 참조
});
```

### 모델별 Config 분기

```javascript
const is25or3x = modelId.includes('2.5') || modelId.includes('3');
const isPro = /pro/i.test(modelId);

const config = {
  tools: [{ googleSearch: {} }],  // Google Search 그라운딩 (항상 활성)
};

if (is25or3x) {
  // 2.5/3.x 모델: non-pro만 thinking 비활성화
  if (!isPro) config.thinkingConfig = { thinkingBudget: 0 };
} else {
  // 구형 모델: temperature + responseSchema 강제
  config.temperature = 0.9;
  config.responseMimeType = 'application/json';
  config.responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        mainKeyword: { type: Type.STRING },
        subKeywords: { type: Type.STRING },
        rationale: { type: Type.STRING },
      },
      required: ['title', 'mainKeyword', 'subKeywords', 'rationale'],
    },
  };
}
```

### 파라미터 요약

| 항목 | 값 |
|------|-----|
| **모델 (기본값)** | `gemini-3.1-pro-preview` |
| **Temperature** | 2.5/3.x 모델: 미지정(기본값), 구형 모델: `0.9` |
| **Google Search** | 항상 활성 (`tools: [{ googleSearch: {} }]`) |
| **Thinking** | 2.5/3.x non-pro 모델: `{ thinkingBudget: 0 }` |
| **응답 포맷 강제** | 구형 모델만 `responseMimeType: 'application/json'` + `responseSchema` |

### 사용 가능한 텍스트 모델 목록

| 모델 ID | 이름 | 비용 (입력/출력) |
|---------|------|------------------|
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro Preview (추천) | $2.00/M / $12.00/M |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview | $0.50/M / $3.00/M |
| `gemini-3.1-flash-lite-preview` | Gemini 3.1 Flash Lite Preview | $0.25/M / $1.50/M |
| `gemini-2.5-pro` | Gemini 2.5 Pro | $1.25/M / $10.00/M |
| `gemini-2.5-flash` | Gemini 2.5 Flash | $0.30/M / $2.50/M |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash Lite | $0.10/M / $0.40/M |

### 재시도 로직

```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 2000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = (err?.message || String(err)).toLowerCase();
      const isRetryable = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
      if (isRetryable && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // 2초, 4초, 8초
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
```

---

## 2. 메인 카테고리 / 서브 카테고리 목록 (JSON)

```json
{
  "레시피/맛집/식품": {
    "description": "압도적 1위 카테고리입니다. 요리 중 검색 수요가 발생하고, 레시피를 따라하며 자연스럽게 체류시간이 길어져 지속적으로 인기가 높습니다.",
    "subCategories": ["요리","레시피","맛집","식품 리뷰","AI 푸드/레시피 추천","카페/디저트","전통시장/로컬푸드","다이어트 식단","간편식/밀키트","베이킹/디저트"]
  },
  "여행/숙박": {
    "description": "해외여행 재개와 함께 검색량이 급부상한 카테고리입니다. 국내외 여행 모두에서 높은 검색 수요를 보이며, 특히 시의성 있는 정보가 중요합니다.",
    "subCategories": ["국내여행","해외여행","세계여행","숙소","AI 여행 코스 계획","캠핑/차박","제주도 여행","일본 여행","동남아 여행","유럽 여행","여행 준비물 체크리스트"]
  },
  "IT 기기 리뷰": {
    "description": "신제품 출시, 스펙 비교, 언박싱 등 하드웨어 중심의 리뷰 카테고리입니다. 구체적인 모델명 검색 유입이 가장 활발합니다.",
    "subCategories": ["스마트폰/태블릿","PC/노트북","가전제품","카메라/음향기기","주변기기/액세서리","웨어러블 기기","게이밍 기어","스마트홈 기기","드론/액션캠"]
  },
  "IT/인터넷": {
    "description": "소프트웨어, 앱 추천, IT 트렌드 등 비하드웨어 중심의 정보를 다룹니다. 실용적인 팁과 정보성 콘텐츠가 인기가 많습니다.",
    "subCategories": ["소프트웨어/팁","최신 IT 트렌드","인터넷 꿀팁","앱/어플리케이션 추천","보안/해킹","웹디자인/개발","클라우드 서비스","SNS 활용법","블로그 운영 팁"]
  },
  "AI/인공지능": {
    "description": "ChatGPT, 생성형 AI 등 전 세계적으로 가장 핫한 키워드입니다. 변화가 빠르고 검색 수요가 폭발적이며, 전문적인 정보성 글이 선호됩니다.",
    "subCategories": ["ChatGPT/LLM 활용법","AI 이미지/영상 생성","AI 업무 생산성 도구","최신 AI 뉴스/트렌드","AI 툴/서비스 리뷰","프롬프트 엔지니어링","AI 코딩/개발","AI 비즈니스 모델","AI 윤리/미래"]
  },
  "패션/의류/뷰티": {
    "description": "시즌별 트렌드에 매우 민감한 카테고리입니다. 계절에 맞는 코디나 화장품 리뷰, 세일 정보 등이 높은 조회수를 기록합니다.",
    "subCategories": ["패션 코디","뷰티 제품 리뷰","패션 트렌드","AI 퍼스널 컬러/스타일링","스킨케어/메이크업","헤어스타일","향수 리뷰","명품/브랜드 소식","데일리룩/OOTD"]
  },
  "건강/웰빙/운동": {
    "description": "꾸준한 수요를 보이는 안정적인 카테고리입니다. 특히 새해 결심 시즌과 여름 다이어트 시즌에 운동법, 식단 관련 검색량이 급증합니다.",
    "subCategories": ["운동/헬스","다이어트/식단","건강 정보","AI 헬스케어/식단 관리","요가/필라테스","멘탈 헬스/명상","영양제 리뷰","홈트레이닝","등산/러닝"]
  },
  "재테크/금융/경제": {
    "description": "정부 정책이나 금리 변동 시 검색량이 폭증합니다. 청년층과 직장인 사이에서 높은 관심을 받으며, 실질적인 정보 제공이 핵심입니다.",
    "subCategories": ["주식/투자","부동산","경제/정책","사회","정치","AI 투자/자산관리","가상화폐/NFT","절세/세무","보험/연금","부업/N잡","창업/스타트업"]
  },
  "육아/출산/교육": {
    "description": "타겟층이 명확하고 충성도가 높은 분야입니다. 정보 수요가 지속적이며, 체험단이나 제품 리뷰를 통한 수익화 가능성도 높습니다.",
    "subCategories": ["육아 일상","교육/입시 정보","학문","육아용품 리뷰","AI 교육/육아 도우미","임신/출산 정보","어린이집/유치원","초등 교육","영어 교육","놀이 학습"]
  },
  "취업/자기계발": {
    "description": "상/하반기 채용 시즌에 검색량이 최고조에 달합니다. 자소서 작성법, 면접 후기 등 실전 경험담과 합격 사례가 높은 클릭률을 보입니다.",
    "subCategories": ["취업 준비","자기계발","도서 리뷰","AI 자소서/면접 코칭","공인 자격증","어학 공부","직장 생활 팁","시간 관리","온라인 강의 추천"]
  },
  "일상/생활/취미": {
    "description": "친근감과 공감을 기반으로 넓은 독자층을 확보할 수 있습니다. MBTI, 자취생 꿀팁, 반려동물 등 트렌디한 주제가 꾸준히 인기가 많습니다.",
    "subCategories": ["일상 이야기","생각","결혼","좋은글","이미지","사진","생활 꿀팁","취미","반려동물","AI 활용 취미/생활","인테리어/DIY","원예/식물","자동차/드라이브","캠핑/아웃도어"]
  },
  "엔터테인먼트/문화": {
    "description": "최신 이슈에 따라 검색량이 순간적으로 폭증하는 특징이 있습니다. 드라마, 영화 리뷰 등 신속한 정보 업로드와 독자적인 해석이 중요합니다.",
    "subCategories": ["문학","미술","디자인","스타","연예인","만화","애니","방송","드라마/영화 리뷰","음악/K-POP","공연/전시","AI 콘텐츠 제작/합성","웹툰/애니메이션","게임 리뷰/공략","스포츠 뉴스","유튜브/크리에이터"]
  },
  "수익형 블로그/유튜브": {
    "description": "블로그와 유튜브를 통한 수익 창출은 가장 관심이 뜨거운 분야입니다. SEO 전략, 애드센스 수익 최적화, 채널 성장 노하우 등 실질적인 수익화 팁이 높은 조회수를 보장합니다.",
    "subCategories": ["블로그 수익화","유튜브 성장 전략","애드센스/광고 수익","제휴 마케팅","전자책/강의 판매","퍼스널 브랜딩","AI 활용 콘텐츠 제작","숏폼(쇼츠/릴스) 공략","뉴스레터/커뮤니티 운영"]
  }
}
```

### 모드별 추천 카테고리

```json
{
  "rcon": ["IT 기기 리뷰","IT/인터넷","AI/인공지능","건강/웰빙/운동","엔터테인먼트/문화","수익형 블로그/유튜브"],
  "ai-briefing": ["IT 기기 리뷰","IT/인터넷","AI/인공지능","건강/웰빙/운동","재테크/금융/경제","육아/출산/교육","취업/자기계발","레시피/맛집/식품","수익형 블로그/유튜브"],
  "home-plate": ["레시피/맛집/식품","여행/숙박","패션/의류/뷰티","건강/웰빙/운동","일상/생활/취미","엔터테인먼트/문화"]
}
```

---

## 3. AI 글쓰기 모드 5가지

### 모드 목록

| ID | 이름 | 짧은 이름 | 색상 | 설명 |
|----|------|-----------|------|------|
| `default` | 네이버 검색 최적화 모드 | 검색최적화 | emerald | 네이버 검색 상위 노출에 최적화된 글을 만듭니다. "직접 써보니" 경험담 + 통계/표 기반 정보 구성으로 네이버 품질 지수를 높입니다. 맛집 리뷰, 제품 후기, 여행 코스 추천 등 대부분의 블로그 주제에 적합합니다. |
| `rcon` | 최신 트렌드 모드 | 트렌드 | emerald | 하나의 키워드로 검색하는 사람들의 다양한 의도를 분석해서 각각 답해주는 글을 만듭니다. "요즘", "최신" 같은 트렌드 키워드와 질문형 소제목으로 여러 검색 결과를 동시에 노립니다. |
| `ai-briefing` | AI 요약 모드 | AI요약 | emerald | 네이버 검색 맨 위 AI 요약 영역(Cue:)에 내 글이 인용되도록 만듭니다. 비교표, 리스트, FAQ 등 AI가 읽기 쉬운 구조로 작성합니다. |
| `insight-edge` | 틈새 키워드 차별화 모드 | 차별화 | emerald | 같은 키워드로 검색해도 남들과 완전히 다른 글을 만듭니다. 독자의 진짜 고민(Pain Point)을 짚고, 아무도 안 다룬 새로운 시각으로 승부합니다. |
| `home-plate` | 감성 + 스토리텔링 모드 | 스토리텔링 | orange | 검색이 아니라 네이버 앱 홈 피드에 추천되는 걸 노립니다. 클릭하고 싶은 감성 제목 + 1인칭 스토리텔링으로 구성해서 공감과 댓글을 유도합니다. |

### 제목 추천 프롬프트에서의 모드별 분기

제목 추천 시 모드에 따라 프롬프트의 최적화 대상이 달라집니다:

```javascript
// 프롬프트 내 모드별 최적화 대상 텍스트
const optimizeTarget =
  mode === 'home-plate'    ? '홈판(피드) 추천 알고리즘' :
  mode === 'rcon'          ? 'RCON 알고리즘' :
  mode === 'insight-edge'  ? '인사이트 엣지 전략' :
                             'SEO';
// → "네이버 블로그 {optimizeTarget}에 최적화된 블로그 제목 10개를 추천해주세요."
```

### 모드별 추가 전략 프롬프트

#### home-plate 모드 추가 전략
```
**[홈판(피드) 노출 최적화 전략]:**
- **클릭 유도(CTR):** 사람들의 호기심을 자극하는 훅킹 문구를 사용하세요. (예: "~했었는데 아니더라", "나만 모르고 있었나", "이거 뭔데요?")
- **스토리텔링:** 1인칭 시점의 경험을 느끼게 하는 제목을 만드세요. (예: "제가 직접 써봤는데..", "솔직히 말씀드릴게요..")
- **공감과 반전:** 독자가 공감할 수 있는 상황이나 예외적인 사실을 제시하세요.
- **비주얼 상상:** 제목만 봐도 그림이 그려지는 구체적인 묘사를 포함하세요.
```

#### insight-edge 모드 추가 전략
```
**[인사이트 엣지(Insight Edge) 전략]:**
- **결핍(Pain Point) 분석:** 단순히 유행하는 주제가 아닌, 사람들이 해당 분야에서 겪는 '불편함', '미충족 욕구', '숨겨진 문제'를 정확히 짚어내는 주제를 설정하세요.
- **마이크로 니치(Micro-Niche):** 타겟을 매우 좁게 설정하세요. (예: '서울 여행' → '혼자 카페 작업하는 직장인 주말 루틴')
- **반골 기질(Contrarian):** 대중적 상식을 뒤집거나 다른 시각을 제시하는 제목을 포함하세요.
- **커뮤니티 분석:** 사람들이 포럼이나 커뮤니티에서 진짜로 궁금해하거나 불만으로 토로하는 실질적인 고민을 해결해주는 느낌이어야 합니다.
```

#### IT 기기 리뷰 카테고리 특별 규칙 (모드 무관)
```
**[특별 요청사항 - IT 기기 리뷰]:**
추천하는 10개의 제목 중 **최소 7개(70%) 이상**은 현재 시장에서 출시 예정이거나 이미 출시된 **구체적인 제품 모델명**(예: 아이폰 16 Pro, 갤럭시S24, 맥북 에어 M3, 소니 XM5 등)을 반드시 직접적으로 포함시켜요. 뭉뚱그려 '스마트폰', '이어폰' 등으로만 표현하지 마세요.
```

---

## 4. 전체 프롬프트 원문

제목 추천 API 호출 시 사용하는 프롬프트 전문입니다. `${변수}` 부분은 실행 시 동적으로 채워집니다.

```
[Random Seed: ${seed}]
현재 연도(${year})를 기준으로 최신 트렌드와 이슈를 반영하여 아래 카테고리에 맞는 최신 인기 주제를 파악하세요.
카테고리: ${category} > ${subCategory}
${userTopic ? `사용자 요청 주제: ${userTopic}` : '사용자 요청 주제: (미공개 - 카테고리 내 최신 트렌드와 홈판 인기 주제를 분석하여 제안하세요)'}

파악된 트렌드와 사용자 주제를 바탕으로 네이버 블로그 ${optimizeTarget}에 최적화된 블로그 제목 10개를 추천해주세요.

**중요 요청사항 (다양성 확보):**
1. 매번 요청할 때마다 **기존과 겹치지 않는 새로운** 주제를 선정하세요.
2. 10개의 제목끼리 비슷한 키워드가 반복되지 않도록 **주제의 스펙트럼을 넓게** 잡아요.
3. 뻔한 주제보다는 현재 시점에서 사람들이 관심을 갖거나 트렌드에서 클릭을 만드는 **구체적이고 매력적인** 주제를 발굴하세요.
${itSpecial}
${homePlateStrategy}
${insightStrategy}

**[홈판 전략 적용 방법]:**
사용자가 입력한 주제("${userTopic || '없음'}")를 홈판 노출에 최적화된 스토리텔링형 제목으로 변환해요. 만약 주제가 없다면 해당 카테고리에서 홈판(추천 피드) 노출 확률이 높고, '라이프스타일·경험/감성 중심' 주제를 AI가 직접 선정하여 제안하세요.

**주의사항:** 제목에 '${year}년'과 같이 연도 표기를 기계적으로 붙이지 마세요. 최신성 강조가 필수적인 주제(예: 2025 트렌드, 신제품 출시)가 아니면 연도는 제외하고 자연스러운 제목을 만들어요.

반드시 아래와 같이 JSON 형식으로만 답해주세요. 추가적인 설명이나 마크다운 코드 블록(```)은 사용하지 마세요.
[
    {
        "title": "제목 문자열",
        "mainKeyword": "메인 키워드",
        "subKeywords": "서브 키워드(콤마로 구분)",
        "rationale": "추천 이유(최신 트렌드 반영 내용 포함)"
    }
]
```

---

## 5. 응답 파싱 로직

### 응답 구조 (TitleRecommendation)

```typescript
interface TitleRecommendation {
  title: string        // 추천 제목
  mainKeyword: string  // 메인 키워드
  subKeywords: string  // 서브 키워드 (콤마 구분)
  rationale: string    // 추천 이유
}
// 반환: TitleRecommendation[] (10개 배열)
```

### 파싱 코드 (순수 JavaScript)

```javascript
function parseTitleResponse(responseText) {
  const raw = (responseText || '').trim() || '[]';
  
  try {
    // 1차: 직접 JSON 파싱 시도
    return JSON.parse(raw);
  } catch {
    // 2차: 마크다운 코드 블록 내부 추출 또는 배열 구조 추출
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    // 모든 파싱 실패 시 빈 배열
    return [];
  }
}
```

### 파싱 흐름 요약

1. `response.text` 에서 텍스트 추출 후 `.trim()`
2. 빈 응답이면 `'[]'`로 대체
3. `JSON.parse()` 직접 시도
4. 실패 시 ```` ```json ... ``` ```` 마크다운 코드 블록 내부 추출
5. 그것도 실패 시 `[ ... ]` 배열 패턴 추출
6. 모두 실패하면 빈 배열 `[]` 반환 (UI 크래시 방지)

---

## 6. 독립 실행 가능한 구현 코드

### 방법 A: 프론트엔드 직접 호출 (API 키 노출 주의)

> **주의:** 이 방식은 API 키가 클라이언트에 노출됩니다. 체험판/데모용으로만 사용하고, API 키에 반드시 사용량 제한을 걸어두세요.

```javascript
// ============================================================
// 랜딩페이지 제목 추천 - 프론트엔드 직접 호출 버전
// ============================================================

const GEMINI_API_KEY = 'YOUR_API_KEY';
const MODEL_ID = 'gemini-2.5-flash'; // 비용 절약용 (변경 가능)
const MAX_FREE_USES = 4;

// 사용 횟수 관리
function getUsageCount() {
  return parseInt(localStorage.getItem('titleRecommendCount') || '0', 10);
}
function incrementUsage() {
  const count = getUsageCount() + 1;
  localStorage.setItem('titleRecommendCount', String(count));
  return count;
}

// 재시도 래퍼
async function withRetry(fn, maxRetries = 3, baseDelay = 2000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = (err?.message || String(err)).toLowerCase();
      const isRetryable = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
      if (isRetryable && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// 프롬프트 빌드
function buildPrompt(category, subCategory, mode, userTopic) {
  const year = new Date().getFullYear();
  const seed = Math.random().toString(36).substring(7);

  let itSpecial = '';
  if (category === 'IT 기기 리뷰') {
    itSpecial = `
**[특별 요청사항 - IT 기기 리뷰]:**
추천하는 10개의 제목 중 **최소 7개(70%) 이상**은 현재 시장에서 출시 예정이거나 이미 출시된 **구체적인 제품 모델명**(예: 아이폰 16 Pro, 갤럭시S24, 맥북 에어 M3, 소니 XM5 등)을 반드시 직접적으로 포함시켜요. 뭉뚱그려 '스마트폰', '이어폰' 등으로만 표현하지 마세요.`;
  }

  let homePlateStrategy = '';
  if (mode === 'home-plate') {
    homePlateStrategy = `
**[홈판(피드) 노출 최적화 전략]:**
- **클릭 유도(CTR):** 사람들의 호기심을 자극하는 훅킹 문구를 사용하세요. (예: "~했었는데 아니더라", "나만 모르고 있었나", "이거 뭔데요?")
- **스토리텔링:** 1인칭 시점의 경험을 느끼게 하는 제목을 만드세요. (예: "제가 직접 써봤는데..", "솔직히 말씀드릴게요..")
- **공감과 반전:** 독자가 공감할 수 있는 상황이나 예외적인 사실을 제시하세요.
- **비주얼 상상:** 제목만 봐도 그림이 그려지는 구체적인 묘사를 포함하세요.`;
  }

  let insightStrategy = '';
  if (mode === 'insight-edge') {
    insightStrategy = `
**[인사이트 엣지(Insight Edge) 전략]:**
- **결핍(Pain Point) 분석:** 단순히 유행하는 주제가 아닌, 사람들이 해당 분야에서 겪는 '불편함', '미충족 욕구', '숨겨진 문제'를 정확히 짚어내는 주제를 설정하세요.
- **마이크로 니치(Micro-Niche):** 타겟을 매우 좁게 설정하세요. (예: '서울 여행' → '혼자 카페 작업하는 직장인 주말 루틴')
- **반골 기질(Contrarian):** 대중적 상식을 뒤집거나 다른 시각을 제시하는 제목을 포함하세요.
- **커뮤니티 분석:** 사람들이 포럼이나 커뮤니티에서 진짜로 궁금해하거나 불만으로 토로하는 실질적인 고민을 해결해주는 느낌이어야 합니다.`;
  }

  const optimizeTarget =
    mode === 'home-plate'   ? '홈판(피드) 추천 알고리즘' :
    mode === 'rcon'         ? 'RCON 알고리즘' :
    mode === 'insight-edge' ? '인사이트 엣지 전략' :
                              'SEO';

  return `[Random Seed: ${seed}]
현재 연도(${year})를 기준으로 최신 트렌드와 이슈를 반영하여 아래 카테고리에 맞는 최신 인기 주제를 파악하세요.
카테고리: ${category} > ${subCategory}
${userTopic ? `사용자 요청 주제: ${userTopic}` : '사용자 요청 주제: (미공개 - 카테고리 내 최신 트렌드와 홈판 인기 주제를 분석하여 제안하세요)'}

파악된 트렌드와 사용자 주제를 바탕으로 네이버 블로그 ${optimizeTarget}에 최적화된 블로그 제목 10개를 추천해주세요.

**중요 요청사항 (다양성 확보):**
1. 매번 요청할 때마다 **기존과 겹치지 않는 새로운** 주제를 선정하세요.
2. 10개의 제목끼리 비슷한 키워드가 반복되지 않도록 **주제의 스펙트럼을 넓게** 잡아요.
3. 뻔한 주제보다는 현재 시점에서 사람들이 관심을 갖거나 트렌드에서 클릭을 만드는 **구체적이고 매력적인** 주제를 발굴하세요.
${itSpecial}
${homePlateStrategy}
${insightStrategy}

**[홈판 전략 적용 방법]:**
사용자가 입력한 주제("${userTopic || '없음'}")를 홈판 노출에 최적화된 스토리텔링형 제목으로 변환해요. 만약 주제가 없다면 해당 카테고리에서 홈판(추천 피드) 노출 확률이 높고, '라이프스타일·경험/감성 중심' 주제를 AI가 직접 선정하여 제안하세요.

**주의사항:** 제목에 '${year}년'과 같이 연도 표기를 기계적으로 붙이지 마세요. 최신성 강조가 필수적인 주제(예: 2025 트렌드, 신제품 출시)가 아니면 연도는 제외하고 자연스러운 제목을 만들어요.

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

// 응답 파싱
function parseTitleResponse(responseText) {
  const raw = (responseText || '').trim() || '[]';
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
    return match ? JSON.parse(match[1].trim()) : [];
  }
}

// 메인 함수: 제목 추천
async function recommendTitles(category, subCategory, mode, userTopic) {
  // 사용 횟수 체크
  if (getUsageCount() >= MAX_FREE_USES) {
    throw new Error('무료 체험 횟수(4회)를 모두 사용했습니다. 정식 버전을 이용해주세요.');
  }

  const prompt = buildPrompt(category, subCategory, mode, userTopic);
  const modelId = MODEL_ID;
  const is25or3x = modelId.includes('2.5') || modelId.includes('3');
  const isPro = /pro/i.test(modelId);

  // Google GenAI SDK 사용 (CDN 또는 번들)
  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const config = {
    tools: [{ googleSearch: {} }],
  };
  if (is25or3x) {
    if (!isPro) config.thinkingConfig = { thinkingBudget: 0 };
  } else {
    config.temperature = 0.9;
  }

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config,
    })
  );

  const titles = parseTitleResponse(response.text);
  incrementUsage(); // 성공 시에만 카운트 증가
  return titles;
}
```

### 방법 B: Supabase Edge Function으로 감싸기

> **권장 방식:** API 키가 서버에만 존재하므로 안전합니다.

#### Edge Function 코드 (`supabase/functions/recommend-titles/index.ts`)

```javascript
// Supabase Edge Function (Deno runtime)
import { GoogleGenAI } from 'npm:@google/genai';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MAX_FREE_USES = 4;

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { category, subCategory, mode, userTopic, sessionId } = await req.json();

    // 사용 횟수 체크 (KV, Redis, 또는 Supabase DB 사용)
    // 여기서는 간단히 클라이언트 sessionId 기반으로 처리
    // 실제 구현 시 서버 사이드 카운트 저장 필요

    const prompt = buildPrompt(category, subCategory, mode, userTopic);

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const config = { tools: [{ googleSearch: {} }] };

    const modelId = 'gemini-2.5-flash';
    const is25or3x = modelId.includes('2.5') || modelId.includes('3');
    const isPro = /pro/i.test(modelId);

    if (is25or3x && !isPro) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config,
    });

    const titles = parseTitleResponse(response.text);

    return new Response(JSON.stringify({ titles }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

// buildPrompt, parseTitleResponse 함수는 방법 A와 동일
```

#### 프론트엔드에서 Edge Function 호출

```javascript
const EDGE_FUNCTION_URL = 'https://YOUR_PROJECT.supabase.co/functions/v1/recommend-titles';

async function recommendTitlesViaEdge(category, subCategory, mode, userTopic) {
  if (getUsageCount() >= 4) {
    throw new Error('무료 체험 횟수(4회)를 모두 사용했습니다.');
  }

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category,
      subCategory,
      mode,
      userTopic,
      sessionId: getOrCreateSessionId(),
    }),
  });

  if (!res.ok) throw new Error('API 요청 실패');

  const { titles } = await res.json();
  incrementUsage();
  return titles;
}

function getOrCreateSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sessionId', id);
  }
  return id;
}
```

---

## 7. 참고 사항

### 원본 소스 파일 위치

| 파일 | 내용 |
|------|------|
| `src/services/gemini.ts` | API 호출, 재시도, 파싱 로직 |
| `src/data/categories.ts` | 카테고리/서브카테고리 전체 데이터 |
| `src/data/modes.ts` | 5가지 글쓰기 모드 정의 |
| `src/data/models.ts` | 사용 가능한 모델 목록 |
| `src/components/tabs/TitleTab.tsx` | 제목 추천 UI 컴포넌트 |

### 4회 제한 구현 팁

- **프론트엔드만:** `localStorage` 기반 (우회 가능하지만 체험판 수준에서 충분)
- **서버 사이드:** IP 기반 또는 fingerprint 기반으로 Supabase DB에 카운트 저장
- **하이브리드:** 프론트에서 1차 체크 + Edge Function에서 2차 체크
