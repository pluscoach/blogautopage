// ===== 플랜 설정 (가격 단일 출처) =====
// ⚠️ 가격 변경은 이 파일에서만. payment.js와 index.html은 자동 반영됨.
// 현재 운영 가격: 1month=59000, full=89000, lifetime=740000
// 가격 정책 이력:
//   - Phase 10 테스트: 1month=1000, full=1000
//   - 2026-04-10 Phase 10 완료: 1month=39000, full=69000
//   - 2026-04-14 Phase 10.5: 1month=39000, full=59000, lifetime=255000
//     (full 69000→59000 인하, 평생 소유권 신규 추가, 무료체험 UI 숨김)
//   - 2026-04-23 가격 개편+이름 변경: 1month=59000(초심자), full=89000(전문), lifetime=740000(프리미엄)
var PLAN_CONFIG = {
    free: {
        amount: 0,
        label: '1일 무료 체험',
        name: '1일 무료 체험',
        planCode: 'free_trial',
        visible: true,
    },
    '1month': {
        amount: 59000,
        label: '1개월 고용 (59,000원)',
        name: '1개월 고용',
        planCode: 'monthly',
        visible: true,
    },
    full: {
        amount: 99000,
        label: '2개월 고용 (99,000원)',
        name: '2개월 고용',
        planCode: 'full_package',
        visible: true,
    },
    lifetime: {
        amount: 740000,
        label: '평생 채용 (740,000원)',
        name: '평생 채용',
        planCode: 'lifetime',
        visible: true,
    },
};
window.PLAN_CONFIG = PLAN_CONFIG;

// ===== 앱 설정 =====
window.APP_CONFIG = {
    supabase: {
        url: 'https://egwmkpplnzypkbedasrs.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd21rcHBsbnp5cGtiZWRhc3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzIxODcsImV4cCI6MjA5MTIwODE4N30.u_ZOHeNMXg0QCpc23I54rcrPNMj80rPaMlpvzidG1bw'
    },
    kakao: {
        channelUrl: 'https://open.kakao.com/me/pluscoach'
    },
    site: {
        url: ''
    },

    // 🆕 결제 방식 스위치 ('bank_transfer' | 'payapp')
    // 'bank_transfer': 무통장 입금 임시 결제 (현재 활성)
    // 'payapp': 페이앱 PG 결제 (페이앱 재승인 시 복귀)
    paymentMode: 'bank_transfer',

    // 🆕 무통장 입금 계좌 정보
    bankInfo: {
        bank: '하나은행',
        account: '120-910375-30807',
        holder: '오준석(제이에스코퍼레이션)'
    },

    // ===== 트래킹 ID (Phase 12A) =====
    // 각 값은 사장님이 각 플랫폼에서 발급받은 ID
    // 빈 문자열이면 해당 트래킹 비활성화 (안전 fallback)
    tracking: {
        ga4MeasurementId: 'G-YK4F3496T2',
        clarityProjectId: 'wdxl8sd38s',
        metaPixelId: '1652318165952879',
        googleAdsConversionId: 'AW-17816310398',
        googleAdsConversionLabel: 'GpYgCOzAwZ4cEP6kva9C'
    }
};
