# 파비콘 + OG 이미지 설치 가이드

## 📦 생성된 파일 (9개)

### 🎨 파비콘 계열 (브라우저 탭 / 홈 화면)
| 파일 | 용도 | 배경 |
|---|---|---|
| `favicon.ico` | 레거시 브라우저 (16+32+48 멀티) | 순백 |
| `favicon-16x16.png` | 기본 탭 아이콘 | 순백 |
| `favicon-32x32.png` | 고해상도 탭 아이콘 | 순백 |
| `favicon-48x48.png` | Windows 작업표시줄 | 순백 |
| `apple-touch-icon.png` | iOS 홈화면 (180×180) | 순백 |
| `android-chrome-192x192.png` | Android 홈화면 | 순백 |
| `android-chrome-512x512.png` | Android PWA 대형 | 순백 |

### 📱 OG 이미지 (SNS 공유용)
| 파일 | 용도 | 배경 |
|---|---|---|
| `og-image.png` | 1200×630, 카톡/페북/인스타 공유 미리보기 | 아이보리 #F7F3EE |

### 🔧 기타
| 파일 | 용도 |
|---|---|
| `logo_clean.png` | 투명 배경 원본 로고 (수정/재활용용) |

---

## 🗂️ 1단계: 리포에 파일 업로드

리포 루트에 `assets/images/` 폴더 생성 후 업로드:

```
blogautopage/
├── assets/
│   └── images/
│       ├── favicon.ico
│       ├── favicon-16x16.png
│       ├── favicon-32x32.png
│       ├── favicon-48x48.png
│       ├── apple-touch-icon.png
│       ├── android-chrome-192x192.png
│       ├── android-chrome-512x512.png
│       └── og-image.png
```

---

## 🏷️ 2단계: HTML 4개 파일에 메타 태그 삽입

각 HTML (`index.html`, `privacy.html`, `terms.html`, `refund.html`)의 `<head>` 안, **기존 `<title>` 태그 아래**에 추가합니다.

### index.html (랜딩페이지)

```html
<!-- ====== 파비콘 ====== -->
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
<link rel="shortcut icon" href="/assets/images/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png">
<meta name="theme-color" content="#03C75A">

<!-- ====== Open Graph (카톡/페북/인스타 공유) ====== -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="BlogAutoFriends">
<meta property="og:title" content="상위 1% 블로거들의 비밀 무기">
<meta property="og:description" content="AI가 사람처럼 천천히, 하루 100명을 소통합니다. 네이버 블로그 서이추·댓글 자동화 솔루션.">
<meta property="og:url" content="https://blog.pluscoach.co.kr">
<meta property="og:image" content="https://blog.pluscoach.co.kr/assets/images/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="BlogAutoFriends - 상위 1% 블로거들의 비밀 무기">
<meta property="og:locale" content="ko_KR">

<!-- ====== Twitter Card ====== -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="상위 1% 블로거들의 비밀 무기">
<meta name="twitter:description" content="AI가 사람처럼 천천히, 하루 100명을 소통합니다.">
<meta name="twitter:image" content="https://blog.pluscoach.co.kr/assets/images/og-image.png">
```

### privacy.html / terms.html / refund.html (법적 페이지)

파비콘만 필수. OG는 페이지별 제목만 다르게:

```html
<!-- ====== 파비콘 (4개 페이지 공통) ====== -->
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
<link rel="shortcut icon" href="/assets/images/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png">
<meta name="theme-color" content="#03C75A">

<!-- ====== Open Graph (페이지별 제목만 수정) ====== -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="BlogAutoFriends">
<meta property="og:title" content="개인정보처리방침 | BlogAutoFriends">   <!-- privacy -->
<!-- <meta property="og:title" content="이용약관 | BlogAutoFriends"> -->    <!-- terms -->
<!-- <meta property="og:title" content="환불규정 | BlogAutoFriends"> -->    <!-- refund -->
<meta property="og:url" content="https://blog.pluscoach.co.kr/privacy.html">
<meta property="og:image" content="https://blog.pluscoach.co.kr/assets/images/og-image.png">
<meta property="og:locale" content="ko_KR">
```

---

## ✅ 3단계: 배포 후 검증

### 파비콘 확인
1. `https://blog.pluscoach.co.kr` 접속
2. 브라우저 탭에 B 로고 표시 확인
3. **안 보이면**: `Ctrl+Shift+R` (하드 새로고침) — 브라우저가 옛날 파비콘 캐시 보유 중
4. 휴대폰에서 "홈 화면에 추가" → 앱 아이콘 확인

### OG 이미지 확인
1. **카카오톡**: 본인에게 `https://blog.pluscoach.co.kr` 보내기 → 썸네일 확인
2. **페이스북**: [Sharing Debugger](https://developers.facebook.com/tools/debug/) → "다시 스크랩"
3. **트위터/X**: [Card Validator](https://cards-dev.twitter.com/validator)

**⚠️ 카톡 캐시 주의**: 이미 공유됐던 URL은 **최대 24시간** 옛날 이미지 표시.
- 처음 테스트 시에는 URL에 `?v=1` 같은 파라미터 붙이면 새로 스크랩됨
- 예: `https://blog.pluscoach.co.kr?v=1`

---

## 📝 커밋 메시지 추천

```
feat: 파비콘 + OG 이미지 추가

- 제미나이 AI 기반 B 로고 (4색 리본 스타일)
- 파비콘 6종 (16/32/48/180/192/512) + favicon.ico
- OG 이미지 1200x630 (아이보리 배경 + 카피)
- 4개 HTML에 메타 태그 삽입
```

---

## 🎨 디자인 사양

- **로고**: 제미나이 AI 생성 B 로고 (4색 리본 스타일)
  - 초록 #4CAF50 / 노랑 #FFC107 / 빨강 #F44336 / 파랑 #2196F3
- **파비콘 배경**: 순백 #FFFFFF
- **OG 배경**: 아이보리 #F7F3EE
- **OG 카피 구조**:
  - 브랜드: "블로그 자동화 솔루션" (초록 #03C75A, 30px Bold)
  - 헤드라인 1: "상위 1% 블로거들의" — 1%만 초록 강조 (차콜 #111827, 70px Black)
  - 헤드라인 2: "비밀 무기" — 네이버 초록 블록 배경 + 흰 글씨 (#03C75A 배경 / #FFFFFF 글자)
  - 골드 라벨: "◆ AI AUTO SOLUTION" 자간 여유 (골드 #B8860B, 18px Bold)
  - 메인 서브: "AI 자동화 서이추 · 댓글 소통 솔루션" (차콜 #1F2937, 28px Medium)
- **타이포**: Noto Sans CJK KR

---

## 🔁 나중에 디자인 바꾸고 싶다면

`logo_clean.png` (투명 배경 원본 로고)를 활용하면 됩니다:
- 다른 배경색에 올려서 OG 이미지 재생성
- 다른 사이즈로 리사이즈
- 카피 문구 변경

Python(Pillow) 코드로 쉽게 재가공 가능해요. 필요하시면 말씀.

---

**작성일**: 2026-04-18
**로고 출처**: 제미나이 AI 생성 이미지 (체커보드 배경 자동 제거)
**파일 생성 도구**: Claude Opus 4.7 + Python(Pillow, scipy)
