# BlogAutoFriends 리포 가드레일

이 리포에서 작업할 때 반드시 지킬 것:
1. licenses 테이블은 절대 건드리지 말 것 (기존 프로그램 라이선스 시스템)
2. pluscoach.co.kr 루트 도메인 DNS는 건드리지 말 것 (기존 자동매매 페이지)
3. service_role_key는 Edge Function Secrets + Supabase Vault에만 저장
4. Database Trigger의 net.http_post는 Authorization 헤더 필수
5. Edge Function 배포 시 --no-verify-jwt 플래그 필수
6. 운영 DB(egwmkpplnzypkbedasrs)에 migration push 전 반드시 사장님 확인
7. 설계 대화창(Claude.ai)에서 각 Phase별 검수 후 진행

현재 진행 상황은 docs/진행상황.md 참조.
