-- =========================================================================
-- 20260710_add_subscription_cancel_at.sql
--
-- 解約予定日の表示に対応。
-- Stripe の subscription.cancel_at(期間満了などで解約が予約された終了日時)を
-- teams に保持し、課金画面で「いつ現在のプランが終わるか」を表示できるようにする。
-- null = 解約予定なし。
-- =========================================================================

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMPTZ;
