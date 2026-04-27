/**
 * tracking.js - 통합 트래킹 매니저
 *
 * 4개 플랫폼 (GA4, Clarity, Meta Pixel, Google Ads) 동시 관리.
 * config.js의 tracking.* 값에 따라 자동 활성/비활성.
 *
 * 모든 이벤트는 window.track()으로 일괄 발송.
 * 개별 플랫폼 직접 호출 금지 (코드 분산 방지).
 */
(function() {
    'use strict';

    var cfg = (window.APP_CONFIG && window.APP_CONFIG.tracking) || {};

    var hasGA4 = !!(cfg.ga4MeasurementId && cfg.ga4MeasurementId.length > 0);
    var hasClarity = !!(cfg.clarityProjectId && cfg.clarityProjectId.length > 0);
    var hasMeta = !!(cfg.metaPixelId && cfg.metaPixelId.length > 0);
    var hasGoogleAds = !!(cfg.googleAdsConversionId && cfg.googleAdsConversionId.length > 0);

    // ===== GA4 =====
    if (hasGA4) {
        var ga4Script = document.createElement('script');
        ga4Script.async = true;
        ga4Script.src = 'https://www.googletagmanager.com/gtag/js?id=' + cfg.ga4MeasurementId;
        document.head.appendChild(ga4Script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { window.dataLayer.push(arguments); };
        gtag('js', new Date());
        gtag('config', cfg.ga4MeasurementId, {
            anonymize_ip: true,  // GDPR 대응
            send_page_view: true
        });

        // Google Ads도 설치된 경우 함께 등록
        if (hasGoogleAds) {
            gtag('config', cfg.googleAdsConversionId);
        }
    }

    // ===== Microsoft Clarity =====
    if (hasClarity) {
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", cfg.clarityProjectId);
    }

    // ===== Meta Pixel =====
    if (hasMeta) {
        !function(f,b,e,v,n,t,s){
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)
        }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', cfg.metaPixelId);
        window.fbq('track', 'PageView');
    }

    // ===== 통합 이벤트 전송 함수 =====
    /**
     * 4개 플랫폼에 동시 전송
     * @param {string} eventName - 이벤트 이름 (예: 'plan_select', 'form_submit')
     * @param {Object} params - 추가 파라미터 (선택)
     */
    window.track = function(eventName, params) {
        params = params || {};

        try {
            // GA4
            if (hasGA4 && typeof gtag === 'function') {
                gtag('event', eventName, params);
            }

            // Clarity - 커스텀 태그 방식
            if (hasClarity && typeof window.clarity === 'function') {
                window.clarity('event', eventName);
                // 파라미터를 커스텀 태그로도 전달
                for (var key in params) {
                    if (params.hasOwnProperty(key)) {
                        window.clarity('set', key, String(params[key]));
                    }
                }
            }

            // Meta Pixel - 커스텀 이벤트
            if (hasMeta && typeof window.fbq === 'function') {
                // 표준 이벤트 매핑
                var metaEventMap = {
                    'form_submit': 'Lead',
                    'bank_confirm_click': 'InitiateCheckout',
                    'payment_complete': 'Purchase'
                };
                var metaEvent = metaEventMap[eventName];
                if (metaEvent) {
                    window.fbq('track', metaEvent, params);
                } else {
                    window.fbq('trackCustom', eventName, params);
                }
            }
        } catch (err) {
            console.warn('[tracking] 이벤트 전송 실패:', eventName, err);
        }
    };

    /**
     * 결제 완료 전환 (Google Ads)
     * ROAS 계산용. 금액 함께 전달.
     */
    window.trackConversion = function(value, currency, orderCode) {
        try {
            if (hasGoogleAds && typeof gtag === 'function' && cfg.googleAdsConversionLabel) {
                gtag('event', 'conversion', {
                    send_to: cfg.googleAdsConversionId + '/' + cfg.googleAdsConversionLabel,
                    value: value,
                    currency: currency || 'KRW',
                    transaction_id: orderCode
                });
            }
            // Meta Purchase 이벤트 (돈 벌었을 때 가장 중요한 이벤트)
            if (hasMeta && typeof window.fbq === 'function') {
                window.fbq('track', 'Purchase', {
                    value: value,
                    currency: currency || 'KRW'
                });
            }
            // GA4
            if (hasGA4 && typeof gtag === 'function') {
                gtag('event', 'purchase', {
                    value: value,
                    currency: currency || 'KRW',
                    transaction_id: orderCode
                });
            }
        } catch (err) {
            console.warn('[tracking] 전환 이벤트 실패:', err);
        }
    };

    console.log('[tracking] 활성화 상태 - GA4:', hasGA4, 'Clarity:', hasClarity, 'Meta:', hasMeta, 'GoogleAds:', hasGoogleAds);
})();
