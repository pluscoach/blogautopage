# 복원 가이드

## 시나리오 1: 작업 도중 망가졌을 때

```bash
git checkout main
git branch -D feat/friction-removal
# 다시 시작하려면:
git checkout -b feat/friction-removal
```

## 시나리오 2: 머지 후 되돌릴 때

### 방법 A — 이력 보존 (권장)
```bash
git revert <머지 커밋 해시>
```

### 방법 B — 강제 리셋 (위험, 최후 수단)
```bash
git reset --hard backup/before-friction-removal-2026-04-28
git push --force origin main
```

## 시나리오 3: 특정 파일만 되돌릴 때

### 방법 A — 파일 시스템 백업에서 복사
```bash
cp backup/2026-04-28_before-friction-removal/index.html ./
cp backup/2026-04-28_before-friction-removal/assets/css/main.css ./assets/css/
cp backup/2026-04-28_before-friction-removal/assets/js/form.js ./assets/js/
# 등등...
```

### 방법 B — Git 태그에서 특정 파일 복원
```bash
git checkout backup/before-friction-removal-2026-04-28 -- index.html
git checkout backup/before-friction-removal-2026-04-28 -- assets/js/form.js
# 등등...
```
