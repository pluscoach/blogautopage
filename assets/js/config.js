// ===== 플랜 설정 (가격 단일 출처) =====
// ⚠️ 가격 변경은 이 파일에서만. payment.js와 index.html은 자동 반영됨.
// 실가격 복구: 1month.amount=39000, 1month.label='1개월 플랜 (39,000원)'
//              full.amount=59000, full.label='풀 패키지 (59,000원)'
var PLAN_CONFIG = {
    free: {
        amount: 0,
        label: '무료체험 (0원)',
        name: '무료체험',
        planCode: 'free_trial',
    },
    '1month': {
        amount: 1000,  // Phase 10 테스트 중 (실가격: 39000)
        label: '1개월 플랜 (1,000원)',
        name: '블로그 자동화 1개월',
        planCode: 'monthly',
    },
    full: {
        amount: 1000,  // Phase 10 테스트 중 (실가격: 59000)
        label: '풀 패키지 (1,000원)',
        name: '블로그 자동화 풀패키지',
        planCode: 'full_package',
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
    }
};
