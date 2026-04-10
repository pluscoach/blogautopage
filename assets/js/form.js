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
    const { plan, amount } = window.APP_CONFIG.plans[planKey];

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
            p_user_agent: navigator.userAgent
        });

        if (error) throw error;

        if (planKey === 'free') {
            showToast('무료 체험 신청이 완료되었습니다! 이메일로 인증키를 보내드립니다.', 'success');
            document.getElementById('orderForm').reset();
            document.querySelector('input[name="plan"][value="full"]').checked = true;
            updateRadioStyles();
        } else {
            // 유료: PayApp 결제창 호출
            var mappedPlan = planKey === '1month' ? 'monthly' : 'full_package';
            window.requestPayappPayment({
                orderCode: data.order_code,
                plan: mappedPlan,
                name: name,
                email: email,
            });
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
