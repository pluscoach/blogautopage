// ===== PLAN LABELS FROM CONFIG =====
document.querySelectorAll('[data-plan-key]').forEach(function(el) {
    var key = el.dataset.planKey;
    var cfg = window.PLAN_CONFIG && window.PLAN_CONFIG[key];
    if (cfg) {
        var labelEl = el.querySelector('.plan-label');
        if (labelEl) labelEl.textContent = cfg.label;
    }
});

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

// ===== PAIN SECTION ANIMATIONS =====
const painObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.15 });
document.querySelectorAll('.pain-card').forEach(el => painObserver.observe(el));

// --- CARD 1: 메시지 버블 순차 등장 ---
let card1Animated = false;
const card1Observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !card1Animated) {
            card1Animated = true;
            const bubbles = document.querySelectorAll('#painMessages .msg-bubble');
            bubbles.forEach((b, i) => {
                setTimeout(() => b.classList.add('show'), i * 700);
            });
        }
    });
}, { threshold: 0.3 });
const card1El = document.getElementById('painCard1');
if (card1El) card1Observer.observe(card1El);

// --- CARD 3: 번아웃 알림 등장 ---
let card3Animated = false;
const card3Observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !card3Animated) {
            card3Animated = true;
            setTimeout(() => {
                document.getElementById('burnoutNotifs').style.opacity = '1';
                const cursor = document.querySelector('#burnoutEditor > .write-cursor');
                if (cursor) cursor.style.display = 'none';
            }, 1500);
        }
    });
}, { threshold: 0.3 });
const card3El = document.getElementById('painCard3');
if (card3El) card3Observer.observe(card3El);

// ===== HERO TYPING ANIMATION =====
const typingComments = [
    '와, 제주도 동쪽 코스 중에 성산일출봉에서 광치기해변으로 이어지는 루트가 정말 인상적이네요! 저도 아이 둘 데리고 갔었는데, 혹시 식당은 어디로 가셨어요? 다음 여행 때 참고하고 싶습니다 😊',
    '육아하면서 블로그까지 꾸준히 하시는 게 정말 대단해요. 이유식 레시피 정리가 깔끔해서 저장해뒀습니다! 혹시 냉동 보관 팁도 공유해주실 수 있을까요? 🙏',
    '인테리어 비포/애프터 사진 보고 깜짝 놀랐어요. 특히 거실 조명 바꾸신 것만으로 분위기가 완전 달라졌네요! 조명 제품명 좀 알 수 있을까요? ✨',
];
let commentIdx = 0;
let charIdx = 0;
const typingEl = document.getElementById('typingText');
const cursorEl = document.getElementById('typingCursor');
const counterEl = document.getElementById('heroCounter');
let heroCount = 0;

function typeNextChar() {
    const current = typingComments[commentIdx];
    if (charIdx < current.length) {
        typingEl.textContent += current[charIdx];
        charIdx++;
        setTimeout(typeNextChar, 30 + Math.random() * 40);
    } else {
        cursorEl.style.display = 'none';
        heroCount = Math.min(heroCount + Math.floor(Math.random() * 5) + 3, 100);
        counterEl.textContent = heroCount;
        setTimeout(() => {
            charIdx = 0;
            commentIdx = (commentIdx + 1) % typingComments.length;
            typingEl.textContent = '';
            cursorEl.style.display = 'inline';
            setTimeout(typeNextChar, 500);
        }, 2500);
    }
}
setTimeout(typeNextChar, 1200);
