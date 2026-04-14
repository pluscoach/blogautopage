// ===== PAYAPP 결제 요청 =====
// 가격/플랜명은 config.js의 PLAN_CONFIG에서 읽음 (단일 출처)

/**
 * PayApp 결제창 호출
 * @param {object} params
 * @param {string} params.orderCode - create_order RPC가 반환한 order_code
 * @param {string} params.plan - 'monthly' | 'full_package' (planCode 값)
 * @param {string} params.name - 구매자 이름
 * @param {string} params.email - 구매자 이메일
 */
window.requestPayappPayment = function({ orderCode, plan, name, email }) {
  var entry = null;
  var configs = window.PLAN_CONFIG || {};
  for (var key in configs) {
    if (configs[key].planCode === plan) {
      entry = configs[key];
      break;
    }
  }

  if (!entry || !entry.amount) {
    alert('플랜 정보가 올바르지 않습니다.');
    return;
  }

  var price = entry.amount;
  var goodname = entry.name;

  // 로딩 표시
  var loading = document.getElementById('paymentLoading');
  if (loading) loading.style.display = 'flex';

  PayApp.setDefault('userid', 'dhwnstjr00');
  PayApp.setDefault('shopname', '블로그 자동화 솔루션');
  PayApp.setDefault('feedbackurl', 'https://egwmkpplnzypkbedasrs.supabase.co/functions/v1/payapp-webhook');
  PayApp.setDefault('checkretry', 'y');
  PayApp.setDefault('smsuse', 'n');
  PayApp.setDefault('redirectpay', '1');

  PayApp.setParam('goodname', goodname);
  PayApp.setParam('price', String(price));
  PayApp.setParam('recvphone', '01000000000');
  PayApp.setParam('var1', orderCode);
  PayApp.setParam('var2', 'blogauto');
  PayApp.setParam('buyerid', email);

  PayApp.payrequest();

  // 결제창이 팝업으로 뜨므로 3초 후 로딩 숨김
  setTimeout(function() {
    if (loading) loading.style.display = 'none';
  }, 3000);
};
