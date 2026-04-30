// ===== PLAN LABELS FROM CONFIG =====
document.querySelectorAll('[data-plan-key]').forEach(function(el) {
    var key = el.dataset.planKey;
    var cfg = window.PLAN_CONFIG && window.PLAN_CONFIG[key];
    if (!cfg) return;

    // visible=false면 숨김 처리
    if (cfg.visible === false) {
        el.style.display = 'none';
        var radio = el.querySelector('input[type="radio"]');
        if (radio) radio.disabled = true;
        return;
    }

    var labelEl = el.querySelector('.plan-label');
    if (labelEl) labelEl.textContent = cfg.label;
});

// 🆕 결제 방식(paymentMode)에 따라 phone 필드 표시/숨김 (Step 5A)
try {
    var cfg = (typeof window !== 'undefined' && window.APP_CONFIG) ? window.APP_CONFIG : null;
    var phoneField = document.getElementById('phone-field');
    var phoneInput = document.getElementById('phone');

    if (cfg && cfg.paymentMode === 'bank_transfer' && phoneField) {
        phoneField.style.display = '';  // 인라인 display:none 제거 → 기본 block
        if (phoneInput) phoneInput.required = true;
    }
    // paymentMode === 'payapp' 또는 미설정 시 phone-field는 기본 display:none 유지
} catch (e) {
    console.warn('[main.js] phone field toggle 실패:', e);
}

// ===== SCROLL TO FORM + SELECT PLAN =====
function scrollToForm(planValue) {
    if (planValue) {
        const radios = document.getElementsByName('plan');
        for (let r of radios) {
            if (r.value === planValue) { r.checked = true; break; }
        }
        updateRadioStyles();
    }
    document.getElementById('purchase-form').scrollIntoView({ behavior: 'smooth' });
}

// ===== RADIO STYLE SYNC =====
function updateRadioStyles() {
    document.querySelectorAll('#planRadios label').forEach(label => {
        const radio = label.querySelector('input');
        if (radio.checked) {
            label.className = 'flex items-center p-3 border border-naver bg-green-50 rounded-lg cursor-pointer';
            label.querySelector('span').className = 'ml-3 font-bold text-naver';
        } else {
            label.className = 'flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors';
            label.querySelector('span').className = 'ml-3 font-medium';
        }
    });
}
document.querySelectorAll('#planRadios input').forEach(r => r.addEventListener('change', updateRadioStyles));

// ===== TOAST =====
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== STICKY CTA =====
window.addEventListener('scroll', () => {
    const cta = document.getElementById('stickyCTA');
    const formSection = document.getElementById('purchase-form');
    const formTop = formSection.getBoundingClientRect().top;
    if (window.scrollY > 600 && formTop > window.innerHeight) {
        cta.classList.remove('translate-y-full');
    } else {
        cta.classList.add('translate-y-full');
    }
}, { passive: true });

// ===== COUNT-UP ANIMATION =====
function animateCountUp(el) {
    const raw = el.dataset.countup;
    if (!raw) return;
    const target = parseFloat(raw);
    const isFloat = target % 1 !== 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();
    const span = el.querySelector('span');
    const spanHTML = span ? span.outerHTML : '';

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * target;
        const display = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
        el.innerHTML = display + spanHTML;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('[data-countup]').forEach(animateCountUp);
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('.grid[class*="grid-cols-2"][class*="md\\:grid-cols-4"]').forEach(el => {
    statsObserver.observe(el);
});

// ===== HERO STORY SCROLL REVEAL =====
const storyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.15 });
document.querySelectorAll('.hero-story-fade').forEach(el => storyObserver.observe(el));
document.querySelectorAll('.hero-label-fade').forEach(el => storyObserver.observe(el));

// ===== HERO COMMENT FADE ANIMATION =====
const heroComments = [
    '제주도 동쪽 코스 중에 성산일출봉에서 광치기해변 루트가 정말 인상적이네요! 😊',
    '이유식 레시피 정리가 깔끔해서 저장해뒀습니다! 냉동 보관 팁도 공유해주실 수 있을까요? 🙏',
    '거실 조명 바꾸신 것만으로 분위기가 완전 달라졌네요! 조명 제품명 좀 알 수 있을까요? ✨',
];
let heroCommentIdx = 0;
const typingEl = document.getElementById('typingText');
const counterEl = document.getElementById('heroCounter');
const cursorEl = document.getElementById('typingCursor');
let heroCount = 0;

if (typingEl && counterEl) {
    if (cursorEl) cursorEl.style.display = 'none';
    function showNextComment() {
        typingEl.style.opacity = '0';
        setTimeout(() => {
            typingEl.textContent = heroComments[heroCommentIdx];
            typingEl.style.opacity = '1';
            heroCount = Math.min(heroCount + Math.floor(Math.random() * 5) + 3, 100);
            counterEl.textContent = heroCount;
            heroCommentIdx = (heroCommentIdx + 1) % heroComments.length;
        }, 300);
    }
    typingEl.style.transition = 'opacity 0.3s ease';
    setTimeout(showNextComment, 800);
    setInterval(showNextComment, 4000);
}

// ===== 트래킹: 사용자 상호작용 이벤트 =====
(function initInteractionTracking() {
    if (typeof window.track !== 'function') return;

    var formStarted = false;

    document.addEventListener('DOMContentLoaded', function() {
        // plan_select - 플랜 라디오 변경 시
        var planRadios = document.querySelectorAll('input[name="plan"]');
        planRadios.forEach(function(radio) {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    var planCfg = (window.PLAN_CONFIG || {})[this.value] || {};
                    window.track('plan_select', {
                        plan: this.value,
                        plan_code: planCfg.planCode || '',
                        value: planCfg.amount || 0
                    });
                }
            });
        });

        // form_start - 이름 또는 이메일 첫 입력 시 1회만
        var nameInput = document.getElementById('userName');
        var emailInput = document.getElementById('userEmail');
        var onFirstInput = function() {
            if (formStarted) return;
            formStarted = true;
            window.track('form_start', {});
        };
        if (nameInput) nameInput.addEventListener('focus', onFirstInput, { once: true });
        if (emailInput) emailInput.addEventListener('focus', onFirstInput, { once: true });

        // kakao_channel_click - 카카오톡 플로팅 버튼 클릭
        // 클래스명이 프로젝트마다 다를 수 있어 href로 매칭
        document.body.addEventListener('click', function(e) {
            var target = e.target.closest('a[href*="kakao.com"]');
            if (target) {
                window.track('kakao_channel_click', {
                    url: target.href
                });
            }
        });
    });
})();
