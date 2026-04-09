# 사전 준비 체크리스트 FINAL
## Claude Code 작업 시작 전 사장님이 직접 해야 할 것들

작업 시작 전에 아래 항목들을 미리 준비해두시면 Claude Code 작업이 막히지 않습니다.

---

## 📋 체크리스트 한눈에 보기

| 항목 | 필요 시점 | 소요 시간 | 비용 |
|---|---|---|---|
| Supabase CLI 설치 | Phase 2 | 5분 | 무료 |
| Supabase DB 비밀번호 확인 | Phase 2 | 2분 | - |
| Kakao Developers 앱 등록 | Phase 5 | 20분 | 무료 |
| Kakao 초기 토큰 발급 | Phase 5 | 10분 | 무료 |
| 텔레그램 봇 생성 | Phase 5 | 5분 | 무료 |
| 텔레그램 chat_id 확인 | Phase 5 | 3분 | - |
| Resend 계정 + API 키 | Phase 5 | 5분 | 무료 |
| **Resend 도메인 인증 (blog.pluscoach.co.kr)** | Phase 5 | 15분 | 무료 |
| 프로그램 다운로드 링크 | Phase 6 | 5분 | - |
| **카페24 CNAME 레코드 추가** | Phase 8 | 5분 | 무료 |

**총 소요 시간:** 약 1시간 15분

---

## 1. Supabase CLI 설치 (Phase 2)

### Windows (PowerShell 관리자 권한)

**옵션 A: Scoop 사용 (추천)**
```powershell
# Scoop 설치 (없으면)
iwr -useb get.scoop.sh | iex

# Supabase CLI 설치
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**옵션 B: npm 사용**
```powershell
npm install -g supabase
```

### 확인
```powershell
supabase --version
```

---

## 2. Supabase DB 비밀번호 확인 (Phase 2)

1. https://supabase.com/dashboard 접속
2. 프로젝트 `egwmkpplnzypkbedasrs` 선택
3. Settings → Database → Connection string
4. **Database password** 확인 (잊어버렸으면 "Reset database password"로 재설정)
5. 안전한 곳에 메모

⚠️ 이 비밀번호는 절대 코드에 하드코딩하거나 Git에 커밋하지 마세요.

---

## 3. Kakao Developers 앱 등록 (Phase 5) ⭐ 가장 복잡

### 3-1. 앱 생성

1. https://developers.kakao.com 접속
2. 우측 상단 "내 애플리케이션" 클릭
3. "애플리케이션 추가하기" 클릭
4. 입력:
   - **앱 이름**: `BlogAutoFriends 알림`
   - **사업자명**: `제이에스코퍼레이션`
   - **카테고리**: 비즈니스
5. 저장

### 3-2. 앱 키 확인

앱 생성 후 "앱 키" 메뉴에서:
- **REST API 키** 복사 → 안전한 곳에 메모

### 3-3. 플랫폼 등록

"플랫폼" 메뉴 → "Web 플랫폼 등록"
- **사이트 도메인**: `https://blog.pluscoach.co.kr`

### 3-4. 카카오 로그인 활성화

"카카오 로그인" 메뉴 → 활성화 ON
- **Redirect URI 등록**: `https://localhost:3000/oauth/callback`
  - 로컬 테스트용. 실제 사용은 안 하지만 필수 입력.

### 3-5. 동의 항목 설정

"카카오 로그인" → "동의 항목":
- **카카오톡 메시지 전송** → 필수 동의로 설정

---

## 4. Kakao 초기 토큰 발급 (Phase 5)

### 4-1. 인증 코드 받기

브라우저 주소창에 아래 URL 입력 (REST API 키만 바꿈):

```
https://kauth.kakao.com/oauth/authorize?client_id=[REST_API_키]&redirect_uri=https://localhost:3000/oauth/callback&response_type=code&scope=talk_message
```

1. 카카오 로그인 (**사장님 본인 계정** — 알림 받을 계정)
2. 동의 후 Redirect → 브라우저가 `https://localhost:3000/oauth/callback?code=XXXXX` 로 이동
3. 페이지는 뜨지 않지만 URL의 **`code=` 뒤 값을 복사** (10분 내 사용)

### 4-2. access_token + refresh_token 받기

**Claude Code에 이 명령어 전달**하면 Claude Code가 토큰 발급:

```bash
curl -X POST "https://kauth.kakao.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=[REST_API_키]" \
  -d "redirect_uri=https://localhost:3000/oauth/callback" \
  -d "code=[4-1에서_복사한_코드]"
```

응답의 `access_token`, `refresh_token` 두 토큰을 안전한 곳에 메모.

### 4-3. 테스트 (선택)

```bash
curl -X POST "https://kapi.kakao.com/v2/api/talk/memo/default/send" \
  -H "Authorization: Bearer [access_token]" \
  -d 'template_object={"object_type":"text","text":"테스트","link":{"web_url":"https://blog.pluscoach.co.kr"}}'
```

사장님 카톡 "나와의 채팅"에 메시지 오면 성공.

---

## 5. 텔레그램 봇 생성 (Phase 5)

### 5-1. 봇 생성

1. 텔레그램에서 `@BotFather` 검색 → 대화 시작
2. `/newbot` 입력
3. 봇 이름: `BlogAutoFriends 알림`
4. 봇 username: `blogautofriends_notify_bot` (이미 사용 중이면 다른 이름)
5. BotFather가 토큰 발송 → 안전한 곳에 메모

### 5-2. chat_id 확인

1. 방금 만든 봇과 대화 시작 (검색 → `/start`)
2. 텔레그램에서 `@userinfobot` 검색 → `/start`
3. 사장님의 Telegram User ID 확인 → 이게 `TELEGRAM_CHAT_ID`

---

## 6. Resend 계정 + API 키 (Phase 5)

### 6-1. 회원가입

1. https://resend.com 접속
2. "Sign up"
3. 이메일 인증

### 6-2. API 키 발급

1. 좌측 메뉴 "API Keys"
2. "Create API Key"
3. 이름: `BlogAutoFriends`
4. Permission: **Full access**
5. `re_xxxxx...` 키 복사 → 안전한 곳에 메모

---

## 7. Resend 도메인 인증 ⭐ (Phase 5) — `blog.pluscoach.co.kr`

### 7-1. Resend에 도메인 추가

1. Resend Dashboard → 좌측 "Domains" → "Add Domain"
2. 도메인 입력: **`blog.pluscoach.co.kr`**
3. Region 선택: 가장 가까운 곳 (US East 기본 OK)
4. Add

### 7-2. Resend가 보여주는 DNS 레코드 확인

화면에 3~4개 레코드가 표시됩니다:

| Type | Name | Value |
|---|---|---|
| MX | `send.blog.pluscoach.co.kr` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
| TXT | `send.blog.pluscoach.co.kr` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey.blog.pluscoach.co.kr` | `p=MIGfMA0G...` (긴 문자열) |
| TXT (선택) | `_dmarc.blog.pluscoach.co.kr` | `v=DMARC1; p=none;` |

**이 레코드들을 그대로 복사해둡니다.** 다음 단계에서 카페24에 입력.

### 7-3. 카페24 DNS 관리에 레코드 추가

1. 카페24 로그인 (https://hosting.cafe24.com)
2. 상단 "마이페이지" → "도메인"
3. `pluscoach.co.kr` → **DNS 관리** 또는 **네임서버/DNS 설정**
4. "레코드 추가" 또는 "A/CNAME/MX/TXT 관리"

**⚠️ 중요: 호스트 입력 시 주의**

카페24는 보통 도메인 이름을 자동으로 붙여줘서, 호스트 부분만 입력합니다:

| Resend 전체 이름 | 카페24에 입력할 호스트 부분 |
|---|---|
| `send.blog.pluscoach.co.kr` | `send.blog` |
| `resend._domainkey.blog.pluscoach.co.kr` | `resend._domainkey.blog` |
| `_dmarc.blog.pluscoach.co.kr` | `_dmarc.blog` |

(카페24 UI가 다르면 "Full name 입력" 옵션을 찾아서 전체 도메인 붙여서 입력)

**각 레코드 추가:**

**① MX 레코드**
- 타입: `MX`
- 호스트: `send.blog`
- 값: `feedback-smtp.us-east-1.amazonses.com`
- 우선순위: `10`

**② TXT (SPF)**
- 타입: `TXT`
- 호스트: `send.blog`
- 값: `v=spf1 include:amazonses.com ~all`

**③ TXT (DKIM)**
- 타입: `TXT`
- 호스트: `resend._domainkey.blog`
- 값: (Resend가 준 긴 문자열 그대로)

**④ TXT (DMARC, 선택)**
- 타입: `TXT`
- 호스트: `_dmarc.blog`
- 값: `v=DMARC1; p=none;`

저장.

### 7-4. 인증 확인

1. 5~15분 대기 (DNS 전파)
2. Resend Dashboard → Domains → 방금 추가한 도메인 클릭
3. "Verify" 버튼 클릭
4. 모든 레코드가 ✅ 초록색이면 완료
5. 하나라도 빨간색이면 카페24 DNS 설정 다시 확인 + 조금 더 대기

### ⚠️ 주의

- **기존 `pluscoach.co.kr` 루트 도메인의 MX, A, TXT 레코드는 절대 건드리지 말 것**
- 자동매매 페이지와 기존 이메일(있다면) 전혀 영향 안 받음
- 호스트 이름에 `.blog`가 포함되어 있는지 반드시 확인 (서브도메인 격리)

---

## 8. 프로그램 다운로드 링크 (Phase 6)

무료체험 이메일에 포함될 프로그램 다운로드 URL.

### 옵션 A: 구글 드라이브 (권장)
1. 프로그램 zip을 구글 드라이브에 업로드
2. 우클릭 → "공유" → "링크가 있는 모든 사용자"
3. 링크 복사

### 옵션 B: GitHub Releases
- 리포에 Release 생성 후 zip 업로드

이 URL을 메모. Phase 6에서 환경변수 `DOWNLOAD_URL`에 입력.

---

## 9. 카페24 CNAME 레코드 추가 (Phase 8) ⭐

**이건 Phase 8에서 Claude Code가 "이제 도메인 연결할 차례" 라고 할 때 진행.**

### 9-1. GitHub Pages 배포 확인

Claude Code가 Phase 8에서 먼저 GitHub Pages 배포를 진행하고, 임시 URL (`https://jsrb0.github.io/blogautopage/`)이 작동하는지 확인한 뒤에 도메인 연결로 넘어감.

### 9-2. 카페24에 CNAME 추가

1. 카페24 로그인 → 도메인 관리 → `pluscoach.co.kr` → **DNS 관리**
2. 레코드 추가:
   - 타입: `CNAME`
   - 호스트: `blog`
   - 값: `jsrb0.github.io`
   - TTL: 기본값 (3600)
3. 저장

### 9-3. GitHub Pages에 커스텀 도메인 설정

1. GitHub 리포 → Settings → Pages
2. "Custom domain" 입력: `blog.pluscoach.co.kr`
3. Save
4. "Enforce HTTPS" 체크 (DNS 확인 후 가능)

### 9-4. 확인

10~30분 대기 후 `https://blog.pluscoach.co.kr` 접속 → 랜딩페이지 정상 표시되면 완료.

---

## 📝 모아둘 정보 (작업 시작 전 메모)

Claude Code 작업 시작 전에 아래 정보를 **안전한 곳**(로컬 메모장, 1Password 등)에 정리:

```
# BlogAutoFriends 자격 증명
# ⚠️ 이 파일은 절대 Git에 커밋하지 말 것

## 도메인
- 메인: https://blog.pluscoach.co.kr
- 발신 이메일: noreply@blog.pluscoach.co.kr

## Supabase
- URL: https://egwmkpplnzypkbedasrs.supabase.co
- Project Ref: egwmkpplnzypkbedasrs
- anon key: eyJxxx... (Dashboard → Settings → API)
- service_role key: eyJyyy... (Dashboard → Settings → API)
- DB password: ...

## Kakao Developers
- 앱 ID: 숫자
- REST API 키: ...
- access_token: ... (Phase 5에서 DB에 저장)
- refresh_token: ...

## Telegram
- Bot Token: 123456789:ABC-DEF...
- Chat ID: 123456789

## Resend
- API Key: re_xxx...
- From Email: noreply@blog.pluscoach.co.kr
- 도메인 인증 상태: ✅ verified

## 기타
- 프로그램 다운로드 URL: https://drive.google.com/...
- 카카오톡 오픈채팅: https://open.kakao.com/me/pluscoach
```

---

## ✅ 준비 완료 후 다음 단계

모든 항목이 체크되면 Claude Code를 실행하고 `Claude_Code_시작_프롬프트.md`의 내용을 첫 메시지로 붙여넣으세요.

---

## ❓ FAQ

**Q. Resend 도메인 인증 실패해요. 어떻게 하나요?**
A. 5~15분 더 기다려보세요. DNS 전파는 최대 1시간까지 걸릴 수 있습니다. 1시간 후에도 안 되면 카페24에서 호스트 이름 다시 확인 (특히 `.blog` 포함 여부).

**Q. 카페24 DNS 관리에서 "Full name으로 입력" 옵션이 안 보여요.**
A. 카페24는 보통 서브 호스트만 입력하게 되어 있어요. `blog.pluscoach.co.kr`의 `blog` 부분만 입력하면 자동으로 `blog.pluscoach.co.kr`이 됩니다. Resend가 `send.blog.pluscoach.co.kr` 요구하면 호스트에 `send.blog` 입력.

**Q. 기존 pluscoach.co.kr 자동매매 페이지가 영향 받지 않을까요?**
A. 절대 영향 없습니다. 이번에 추가하는 레코드는 모두 **`blog.` 서브도메인에 관련된 것**이고, 루트 도메인(`pluscoach.co.kr`)의 A/CNAME/MX 레코드는 전혀 건드리지 않습니다.

**Q. 사전 준비를 Phase 5 시작 전까지만 하면 되나요?**
A. 네. Phase 1, 2는 사전 준비 거의 없이 진행 가능. Phase 5 시작 전까지 Kakao/Telegram/Resend 준비 완료하면 됩니다. 카페24 CNAME 추가는 Phase 8 시작 시 진행.

**Q. Kakao Developers 가입이 복잡한데 없이 진행할 수 있나요?**
A. 네, 카카오 알림을 빼고 텔레그램 + Resend 2중 알림으로만 진행 가능. 나중에 추가할 수 있어요. 다만 카톡 알림이 제일 편하니까 가능하면 진행 권장.
