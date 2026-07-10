-- =========================================================================
-- 20260709_add_stripe_billing.sql
--
-- Stripe 課金導入: teams への stripe 連携カラム追加 + webhook 冪等性テーブル。
--
-- プラン(free/starter/pro)と max_members の列は既存(20260501_a_add_teams.sql)。
-- 課金状態(Stripe)を teams に紐づけ、webhook で plan / max_members を同期する。
-- 既存の招待フローは max_members を見て人数上限を強制済み。
-- =========================================================================

-- ---------------------------------------------------------------
-- 1. teams に Stripe 連携カラムを追加
-- ---------------------------------------------------------------
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  -- Stripe subscription.status をそのまま保持:
  --   active / trialing / past_due / canceled / incomplete / unpaid など
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ;

-- 顧客IDは1テナント1つ。重複防止(NULL は複数許容される)。
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_stripe_customer_id
  ON teams(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ---------------------------------------------------------------
-- 2. webhook 冪等性テーブル
--    Stripe は同一イベントを再送しうるため、処理済み event.id を記録して
--    二重処理を防ぐ。service role(webhook)からのみ触る想定。
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_events (
  id           TEXT PRIMARY KEY,          -- Stripe event id (evt_...)
  type         TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
-- ポリシー未定義 = 一般ユーザーはアクセス不可。webhook は service role で
-- RLS をバイパスして insert/select する。

-- =========================================================================
-- 意図サマリ:
--   - teams に stripe_customer_id / stripe_subscription_id / subscription_status
--     / current_period_end を追加
--   - stripe_events で webhook の冪等性を担保
--   - plan / max_members の実際の更新は webhook(service role)が行う
-- =========================================================================
