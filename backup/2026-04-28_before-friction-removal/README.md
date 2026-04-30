# 백업: 결제 직전 마찰 제거 작업 전

- **백업 시점**: 2026-04-28
- **백업 사유**: 광고 첫날 데이터 분석 후, 가격→결제 폼 사이 이탈 지점 개선 작업 직전 백업
- **Git 태그**: `backup/before-friction-removal-2026-04-28` (커밋 `4f55b04`)
- **Git 백업 브랜치**: `backup/main-2026-04-28-friction`
- **작업 브랜치**: `feat/friction-removal`

## 변경 예정 3가지 항목

1. **빨간 경고 박스 (FAQ 영역 최상단)** — 위치 이동 또는 톤 변경
2. **FAQ 위치** — 가격↔결제 폼 사이에서 이동 검토
3. **Mac 경고 문구** — 결제 버튼 아래 빨간 경고 톤 완화

## 변경 전 광고 데이터 스냅샷 (2026-04-28)

| 지표 | 수치 |
|------|------|
| CTR | 3.7% |
| 도착률 | 67% |
| 결제 | 0건 |

## 백업 파일 목록

- `index.html` — FAQ 영역 (SECTION 10) + ORDER FORM (SECTION 11) 포함
- `assets/css/main.css`
- `assets/js/main.js`
- `assets/js/form.js`
- `assets/js/bank-transfer.js`
- `assets/js/tracking.js`
