// ===== PAYAPP 결제 요청 =====

// ⚠️ Phase 10 테스트 중: 실가격 복구 시 config.js의 plans amount도 함께 변경
// 실가격: monthly=39000, full_package=59000
var PLAN_PRICES = {
  'monthly': 1,
  'full_package': 1,
};

var PLAN_NAMES = {
  'monthly': '블로그 자동화 1개월',
  'full_package': '블로그 자동화 풀패키지',
};

/**
 * PayApp 결제창 호출
 * @param {object} params
 * @param {string} params.orderCode - create_order RPC가 반환한 order_code
 * @param {string} params.plan - 'monthly' | 'full_package'
 * @param {string} params.name - 구매자 이름
 * @param {string} params.email - 구매자 이메일
 */
window.requestPayappPayment = function({ orderCode, plan, name, email }) {
  var price = PLAN_PRICES[plan];
  var goodname = PLAN_NAMES[plan];

  if (!price || !goodname) {
    alert('플랜 정보가 올바르지 않습니다.');
    return;
  }

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
