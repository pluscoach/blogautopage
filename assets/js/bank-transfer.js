(function() {
    'use strict';

    /**
     * 무통장 입금 안내 모달 제어
     * paymentMode === 'bank_transfer'에서만 사용
     * form.js가 유료 플랜 제출 시 window.showBankTransferModal 호출
     */

    var modalEl = null;
    var currentOrderContext = null;  // { orderCode, planKey, amount, name, email, phone }
    var isSubmitting = false;

    // DOMContentLoaded로 모달 요소 초기 바인딩
    document.addEventListener('DOMContentLoaded', function() {
        modalEl = document.getElementById('bank-transfer-modal');
        if (!modalEl) {
            console.warn('[bank-transfer] #bank-transfer-modal 요소 없음');
            return;
        }

        // X 버튼 닫기
        var closeBtn = document.getElementById('bank-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideBankTransferModal);
        }

        // 오버레이 클릭 닫기 (모달 컨텐츠 바깥 클릭)
        modalEl.addEventListener('click', function(e) {
            if (e.target === modalEl) {
                hideBankTransferModal();
            }
        });

        // ESC 키 닫기
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalEl && modalEl.style.display !== 'none') {
                hideBankTransferModal();
            }
        });

        // 입금 완료 버튼
        var confirmBtn = document.getElementById('bank-confirm-deposit');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleDepositConfirm);
        }
    });

    /**
     * 모달 표시 (form.js에서 호출)
     * @param {Object} ctx - { orderCode, planKey, amount, name, email, phone }
     */
    window.showBankTransferModal = function(ctx) {
        if (!modalEl) {
            console.error('[bank-transfer] 모달 초기화 전. 다시 시도하세요.');
            return;
        }

        if (!ctx || !ctx.orderCode || !ctx.planKey || typeof ctx.amount !== 'number') {
            console.error('[bank-transfer] ctx 필수 필드 누락:', ctx);
            return;
        }

        currentOrderContext = ctx;

        // 계좌 정보 주입
        var cfg = window.APP_CONFIG || {};
        var bank = cfg.bankInfo || { bank: '', account: '', holder: '' };

        // 플랜 라벨은 PLAN_CONFIG에서 조회
        var planConfig = (window.PLAN_CONFIG || {})[ctx.planKey] || {};
        var planName = planConfig.name || ctx.planKey;

        setText('bank-summary-plan', planName);
        setText('bank-summary-amount', ctx.amount.toLocaleString('ko-KR') + '원');
        setText('bank-account-bank', bank.bank);
        setText('bank-account-number', bank.account);
        setText('bank-account-holder', bank.holder);
        setText('bank-order-code', ctx.orderCode);

        // 버튼 상태 초기화
        var confirmBtn = document.getElementById('bank-confirm-deposit');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '입금 완료 후 눌러주세요';
        }
        isSubmitting = false;

        // 표시
        modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';  // 배경 스크롤 막기
    };

    /**
     * 모달 숨김
     */
    window.hideBankTransferModal = function() {
        if (modalEl) {
            modalEl.style.display = 'none';
            document.body.style.overflow = '';
        }
    };
    var hideBankTransferModal = window.hideBankTransferModal;

    /**
     * "입금 완료 후 눌러주세요" 버튼 클릭 처리
     * 이미 orders INSERT는 form.js에서 완료된 상태.
     * 여기서는 사용자에게 접수 확인 피드백만 표시.
     * (사장님 텔레그램 알림은 on-new-order가 이미 자동 발송함)
     */
    async function handleDepositConfirm() {
        if (isSubmitting) return;
        if (!currentOrderContext) {
            console.error('[bank-transfer] currentOrderContext 없음');
            return;
        }

        var confirmBtn = document.getElementById('bank-confirm-deposit');
        if (confirmBtn) {
            isSubmitting = true;
            confirmBtn.disabled = true;
            confirmBtn.textContent = '처리 중...';
        }

        try {
            // notify-deposit-confirmed Edge Function 호출
            var cfg = (window.APP_CONFIG && window.APP_CONFIG.supabase) || {};
            if (!cfg.url || !cfg.anonKey) {
                console.error('[bank-transfer] Supabase config 없음');
                throw new Error('설정 오류');
            }

            var endpoint = cfg.url + '/functions/v1/notify-deposit-confirmed';
            var response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.anonKey,
                    'apikey': cfg.anonKey,
                },
                body: JSON.stringify({ orderCode: currentOrderContext.orderCode }),
            });

            if (!response.ok) {
                console.error('[bank-transfer] notify-deposit-confirmed 응답 실패:', response.status);
            }

            // 성공/실패 모두 사용자에겐 친절 메시지
            showToast(
                '입금 확인 요청 접수 완료! 입금이 확인되면 이메일로 인증키를 보내드려요.',
                'success'
            );

            setTimeout(function() {
                hideBankTransferModal();
            }, 1500);
        } catch (err) {
            console.error('[bank-transfer] handleDepositConfirm 예외:', err);
            showToast(
                '처리 중 오류가 발생했어요. 잠시 후 다시 시도하거나 카카오톡 채널로 문의주세요.',
                'error'
            );
            if (confirmBtn) {
                isSubmitting = false;
                confirmBtn.disabled = false;
                confirmBtn.textContent = '입금 완료 후 눌러주세요';
            }
        }
    }

    /**
     * 토스트 표시 — 기존 main.js의 showToast 재사용
     * 없으면 간단한 alert fallback
     */
    function showToast(msg, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    /**
     * 헬퍼 — textContent 안전 설정
     */
    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text || '-';
    }
})();
