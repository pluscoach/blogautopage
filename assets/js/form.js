// ===== SUPABASE CLIENT =====
let supabaseClient = null;

try {
    const { url, anonKey } = window.APP_CONFIG.supabase;
    if (typeof supabase !== 'undefined' && url && anonKey && anonKey !== 'YOUR_ANON_KEY_HERE') {
        supabaseClient = supabase.createClient(url, anonKey);
    }
} catch(e) { console.warn('Supabase 초기화 대기:', e); }

// ===== GET USER IP =====
async function getUserIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch {
        return null;
    }
}

// ===== FORM SUBMIT =====
async function submitForm(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const planRadio = document.querySelector('input[name="plan"]:checked');

    if (!name || !email || !planRadio) {
        showToast('모든 항목을 입력해 주세요.', 'error');
        return;
    }

    const planKey = planRadio.value;
    const planCfg = window.PLAN_CONFIG[planKey];
    const plan = planCfg.planCode;
    const amount = planCfg.amount;

    // 🆕 phone 수집 + 무통장 모드 검증
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const paymentMode = (window.APP_CONFIG && window.APP_CONFIG.paymentMode) || 'payapp';

    if (paymentMode === 'bank_transfer' && planKey !== 'free') {
        if (!phone) {
            showToast('전화번호를 입력해주세요.', 'error');
            if (phoneInput) phoneInput.focus();
            return;
        }
        var phoneDigits = phone.replace(/[^0-9]/g, '');
        if (phoneDigits.length < 9) {
            showToast('전화번호 형식을 확인해주세요. (예: 010-0000-0000)', 'error');
            if (phoneInput) phoneInput.focus();
            return;
        }
    }

    btn.disabled = true;
    btn.innerText = '처리 중입니다...';
    btn.classList.add('opacity-70');

    try {
        if (!supabaseClient) {
            throw new Error('서버 연결이 준비되지 않았습니다.');
        }

        const ip = await getUserIP();

        const { data, error } = await supabaseClient.rpc('create_order', {
            p_name: name,
            p_email: email,
            p_plan: plan,
            p_amount: amount,
            p_ip: ip,
            p_user_agent: navigator.userAgent,
            p_phone: phone || ''   // 🆕 추가 (빈 문자열 fallback)
        });

        if (error) throw error;

        if (planKey === 'free') {
            if (typeof window.track === 'function') {
                window.track('form_submit', { plan: 'free_trial', value: 0 });
            }
            // 무료 체험 완료 모달 표시
            var freeModal = document.getElementById('free-trial-modal');
            if (freeModal) {
                var emailDisplay = document.getElementById('free-trial-email');
                if (emailDisplay) emailDisplay.textContent = email;
                freeModal.style.display = 'flex';
            }
            document.getElementById('orderForm').reset();
            document.querySelector('input[name="plan"][value="full"]').checked = true;
            updateRadioStyles();
        } else {
            // 유료: paymentMode에 따라 분기
            var mappedPlan = planKey === '1month' ? 'monthly' : planKey === 'lifetime' ? 'lifetime' : 'full_package';

            if (paymentMode === 'bank_transfer') {
                // 🆕 무통장 경로: 무통장 모달 표시
                // orders INSERT는 이미 완료됨 (create_order RPC 성공).
                // Trigger → on-new-order → sendDepositNoticeWithButtons (사장님 텔레그램)
                // 여기선 사용자에게 모달로 계좌 정보 안내만.
                if (typeof window.showBankTransferModal === 'function') {
                    window.showBankTransferModal({
                        orderCode: data.order_code,
                        planKey: planKey,
                        amount: amount,
                        name: name,
                        email: email,
                        phone: phone
                    });
                } else {
                    console.error('[form.js] showBankTransferModal 미정의 - bank-transfer.js 로드 확인');
                    showToast('처리 중 오류가 발생했어요. 새로고침 후 다시 시도해주세요.', 'error');
                }
            } else {
                // 페이앱 경로 (기존 로직 100% 보존 — PG 복귀 시 자동 활성화)
                if (typeof window.requestPayappPayment === 'function') {
                    window.requestPayappPayment({
                        orderCode: data.order_code,
                        plan: mappedPlan,
                        name: name,
                        email: email,
                    });
                } else {
                    console.error('[form.js] requestPayappPayment 미정의');
                    showToast('결제 시스템 로드 중 오류. 새로고침 후 다시 시도해주세요.', 'error');
                }
            }
        }
    } catch (err) {
        console.error(err);
        // RAISE EXCEPTION 한글 메시지를 그대로 표시
        const msg = err.message || '신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        showToast(msg, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = '지금 바로 신청하고 시간 벌기';
        btn.classList.remove('opacity-70');
    }
}
