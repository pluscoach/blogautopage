# 복원 가이드

## 시나리오 1: 작업 도중 망가졌을 때

```bash
# 작업 브랜치 버리고 main으로 복귀
git checkout main
git branch -D feat/copy-rework-employee-frame

# 다시 시작하려면
git checkout -b feat/copy-rework-employee-frame
```

## 시나리오 2: 이미 main에 머지됐는데 되돌려야 할 때

```bash
# 방법 A: revert (이력 보존, 추천)
git revert <머지 커밋 해시>

# 방법 B: hard reset (이력 삭제, 위험 - 최후의 수단)
git reset --hard backup/before-copy-rework-2026-04-27
git push origin main --force
```

## 시나리오 3: 특정 파일만 되돌리고 싶을 때

```bash
# Git 태그에서 특정 파일 복원
git checkout backup/before-copy-rework-2026-04-27 -- index.html
git checkout backup/before-copy-rework-2026-04-27 -- assets/js/main.js
git checkout backup/before-copy-rework-2026-04-27 -- assets/css/main.css

# 또는 파일 시스템 백업에서 복사
cp backup/2026-04-27_before-copy-rework/index.html ./
cp backup/2026-04-27_before-copy-rework/main.js assets/js/
cp backup/2026-04-27_before-copy-rework/main.css assets/css/
```

## 참고
- 태그: `backup/before-copy-rework-2026-04-27` (불변 스냅샷)
- 브랜치: `backup/main-2026-04-27` (동일 시점)
- 두 개 모두 원격(origin)에 push 완료
