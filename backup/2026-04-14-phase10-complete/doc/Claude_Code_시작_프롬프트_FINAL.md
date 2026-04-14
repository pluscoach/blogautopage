# Claude Code 시작 프롬프트 FINAL
## 이 파일의 내용을 Claude Code 첫 메시지로 붙여넣으세요

---

## 📋 사장님이 Claude Code에 전달할 메시지

**아래 내용을 그대로 복사해서 Claude Code 첫 메시지로 보내세요:**

---

```
BlogAutoFriends 랜딩페이지 백엔드 연동 작업을 시작할게. MVP 버전이야.

## 현재 상황
- 랜딩페이지 프론트엔드 완료 (index.html, 1724줄 단일 파일)
- 프로그램 Supabase 보안 패치 완료 (licenses 테이블 RLS + RPC 3개)
- 기존 Supabase 프로젝트: egwmkpplnzypkbedasrs
- 여기에 orders 테이블과 알림 시스템 추가
- 배포 도메인: https://blog.pluscoach.co.kr (pluscoach.co.kr의 서브도메인, 카페24 소유)
- 발신 이메일: noreply@blog.pluscoach.co.kr (Resend)

## 읽어야 할 문서 (우선순위 순)
1. docs/인수인계_v3_FINAL.md             ← 마스터 문서. 전체 구조와 Phase별 상세 가이드
2. docs/사전준비_체크리스트_FINAL.md     ← 내가 미리 준비한 자격 증명들
3. docs/구현_가이드.md                    ← 기존 index.html 구현 내역 (참고)
4. docs/설계_가이드.md                    ← 디자인 원칙 (참고)

## 작업 방식
- Phase 1부터 순서대로 진행
- 각 Phase 끝날 때마다 멈추고 나한테 검수 받기
- 검수 통과하면 다음 Phase로
- 내가 "다음으로" 또는 "OK"라고 하면 다음 Phase 시작
- 에러나면 멈추고 물어보기. 혼자 우회하지 말 것

## 기술 스택 (확정)
- 프론트: HTML + Tailwind CDN + Vanilla JS (기존 그대로)
- 백엔드: 기존 Supabase 프로젝트 (통합, 새 프로젝트 X)
- Edge Functions: TypeScript (Deno)
- 알림: 카카오톡 "나에게 보내기" + 텔레그램 봇 + Resend 이메일 (3중)
- 이메일 발송: Resend (도메인: blog.pluscoach.co.kr)
- 결제: 페이앱 (심사 대기 중, MVP에서는 제외)
- 배포: GitHub Pages + 커스텀 도메인 (blog.pluscoach.co.kr)
- 도메인 관리: 카페24

## 중요한 원칙
1. licenses 테이블은 절대 건드리지 말 것 (RLS + 기존 RPC 그대로)
2. pluscoach.co.kr 루트 도메인 DNS 레코드 절대 건드리지 말 것 (기존 자동매매 페이지 유지)
3. DNS 레코드는 오직 blog. 서브도메인 관련만 추가
4. 운영 DB에 migration push 전 반드시 나한테 확인
5. service_role key는 Edge Function Secrets에만, 절대 프론트엔드/커밋 X
6. Database Trigger의 net.http_post에 Authorization 헤더 필수
7. Edge Function 배포 시 --no-verify-jwt 플래그 필수
8. Resend 도메인 인증이 Phase 5에 포함됨 — 이메일 발송 전 반드시 완료

## 사전 준비물 (완료 여부 나한테 물어봐줘)
체크리스트 문서의 10개 항목이 있어. 시작 전에 어디까지 됐는지 확인부터.

## 지금 할 것
1. docs/인수인계_v3_FINAL.md와 docs/사전준비_체크리스트_FINAL.md 읽기
2. 현재 리포 상태 파악 (index.html, 기존 파일들)
3. 사전 준비물 어디까지 됐는지 나한테 확인 질문
4. 확인 끝나면 Phase 1 (구조 리팩터링) 시작

자, 시작해줘.
```

---

## 🎯 Claude Code가 보일 예상 반응

Claude Code는 위 메시지를 받으면:

1. `docs/인수인계_v3_FINAL.md`와 `docs/사전준비_체크리스트_FINAL.md` 읽기
2. 리포 파일 구조 확인
3. 현재 `index.html` 상태 파악
4. 사전 준비물 10개 항목 중 어디까지 됐는지 질문
5. 답변 기반으로 Phase 1 착수 결정

---

## 📎 Phase별 사장님 개입 시점

| Phase | 사장님 역할 |
|---|---|
| **Phase 1** (리팩터링) | 검수 — 디자인이 안 깨졌는지 브라우저로 확인 |
| **Phase 2** (CLI 설정) | DB 비밀번호 입력 (터미널에서 직접) |
| **Phase 3** (DB 스키마) | `supabase db push` 전 migration SQL 검토 후 승인 |
| **Phase 4** (폼 연결) | 실제 폼 제출 테스트 — Supabase 대시보드 데이터 확인 |
| **Phase 5** (알림) | 카카오/텔레그램/Resend 자격 증명 전달 + **Resend 도메인 인증(카페24 DNS)** + 실제 알림 수신 테스트 |
| **Phase 6** (무료체험) | 본인 이메일로 무료체험 신청 → 인증키 수신 확인 |
| **Phase 7** (푸터/법적) | 이메일 주소 결정 확인 |
| **Phase 8** (배포) | **카페24에서 CNAME 레코드 추가** + `blog.pluscoach.co.kr` 접속 확인 |
| **Phase 9** (테스트) | 본인 디바이스에서 전체 플로우 실전 테스트 |

---

## 🚨 에러 발생 시 대응

Claude Code가 에러를 만나면 멈추고 사장님에게 보고합니다:

1. **간단한 에러**: Claude Code가 자체 해결 가능
2. **설정 문제**: 사장님이 직접 확인 (예: API 키, Secrets, DNS 레코드)
3. **설계 문제**: 이 대화창(설계 대화창)으로 와서 상담

### "멈춰" / "다음으로" 명령어

- `멈춰` / `stop` — Claude Code 즉시 중지
- `다음으로` / `OK` / `continue` — 다음 Phase 시작
- `되돌려` / `revert` — 마지막 변경 취소

---

## 🚨 설계 대화창(여기)으로 돌아올 상황

다음 경우에는 Claude Code에서 멈추고 **여기로 와서** 상담하세요:

1. **Claude Code가 계속 에러를 뱉을 때** (3번 시도 후에도 해결 안 됨)
2. **설계 자체에 의문이 생길 때**
3. **Claude Code가 원본 인수인계 문서와 다른 방향으로 가려고 할 때**
4. **기대한 결과와 다르게 동작할 때**
5. **새로운 요구사항이 생겼을 때**
6. **카페24 DNS 설정이 복잡해서 잘 안 될 때**
7. **Resend 도메인 인증이 실패할 때**

돌아오실 때는 이렇게 말씀해주세요:
> "Claude Code에서 Phase X 작업 중 [문제]가 발생했어. 이 로그 보고 조언해줘: [에러 내용]"

---

## 📌 각 Phase 예상 소요 시간

| Phase | 예상 시간 | 누적 시간 |
|---|---|---|
| 1. 리팩터링 | 1~2h | 1~2h |
| 2. CLI 설정 | 30m | 1.5~2.5h |
| 3. DB 스키마 | 1h | 2.5~3.5h |
| 4. 폼 연결 | 1h | 3.5~4.5h |
| 5. 알림 Edge Function | 2~3h | 5.5~7.5h |
| 6. 무료체험 자동화 | 1h | 6.5~8.5h |
| 7. 푸터/법적 페이지 | 1~2h | 7.5~10.5h |
| 8. 배포 + 도메인 연결 | 1h | 8.5~11.5h |
| 9. 실전 테스트 | 30m | 9~12h |

하루에 다 할 필요 없어요. Phase 단위로 며칠에 걸쳐 진행 가능.

---

## ✅ 최종 결과물 (MVP 완성 시)

- ✅ `https://blog.pluscoach.co.kr` 실제 작동하는 랜딩페이지
- ✅ 기존 `pluscoach.co.kr` 자동매매 페이지 0% 영향
- ✅ 폼 제출 → Supabase orders 저장
- ✅ 사장님 카카오톡에 주문 알림
- ✅ 사장님 텔레그램에 주문 알림 (백업)
- ✅ 사용자에게 접수 확인 이메일 (`noreply@blog.pluscoach.co.kr`)
- ✅ 무료체험 신청 시 자동 인증키 발급 + 이메일
- ✅ 전자상거래법 준수 푸터 + 법적 페이지 3개
- ⏸️ 유료 결제는 수동 (페이앱 승인 후 자동화)

**사장님이 할 일**: 카톡 확인하고 무료체험 신청자 프로그램 쓰는지 보기. 페이앱 심사 기다리기.
