-- orders 테이블에 telegram_notice_message_id 컬럼 추가
-- 목적: 폼 제출 시 발송된 정보용 텔레그램 메시지의 message_id 저장.
--       나중에 입금 완료 신고 알림을 이 메시지에 답장 형태로 연결하기 위함.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS telegram_notice_message_id BIGINT DEFAULT NULL;

COMMENT ON COLUMN public.orders.telegram_notice_message_id IS
  '폼 제출 시 on-new-order가 발송한 텔레그램 정보용 메시지의 message_id. notify-deposit-confirmed가 이 값을 reply_to_message_id로 사용하여 답장 형태로 알림을 연결함.';
