-- ====================================================
-- Web Push 通知関連テーブル
--   - push_subscriptions: ブラウザの subscription endpoint
--   - notification_preferences: ユーザーの通知設定
--   - notification_deliveries: 配信ログ（運用・デバッグ用）
-- ====================================================

-- ====================================================
-- 1. push_subscriptions
--    ユーザー × デバイスごとの subscription
-- ====================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- Push Service が発行する endpoint URL (一意)
  endpoint TEXT NOT NULL UNIQUE,
  -- メッセージ暗号化用の鍵
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- 識別子（任意）
  user_agent TEXT,
  -- 配信に使えるか（失敗が続いたら false にする）
  enabled BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_team
  ON push_subscriptions(user_id, team_id);
CREATE INDEX idx_push_subscriptions_enabled
  ON push_subscriptions(enabled) WHERE enabled = TRUE;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 閲覧/管理: 自分のもののみ（admin もこれ自体は触る必要なし）
CREATE POLICY "push_subscriptions_select" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );

CREATE POLICY "push_subscriptions_update" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ====================================================
-- 2. notification_preferences
--    ユーザー × チームの通知設定
-- ====================================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- 通知種別ごとの ON/OFF
  daily_morning BOOLEAN DEFAULT TRUE,
  daily_evening BOOLEAN DEFAULT FALSE,
  monthly_reflection BOOLEAN DEFAULT TRUE,
  streak_warning BOOLEAN DEFAULT TRUE,
  trainer_message BOOLEAN DEFAULT TRUE,
  -- 静かな時間帯（JST、0-23）— 例: 22 〜 7 は配信しない
  quiet_hours_start INT CHECK (quiet_hours_start IS NULL OR (quiet_hours_start BETWEEN 0 AND 23)),
  quiet_hours_end   INT CHECK (quiet_hours_end   IS NULL OR (quiet_hours_end   BETWEEN 0 AND 23)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

CREATE INDEX idx_notification_preferences_user_team
  ON notification_preferences(user_id, team_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- 自分のものだけ管理
CREATE POLICY "notification_preferences_select" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert" ON notification_preferences
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );

CREATE POLICY "notification_preferences_update" ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_delete" ON notification_preferences
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ====================================================
-- 3. notification_deliveries
--    配信履歴。デバッグ・解析用に残す。
--    （ユーザーには見せない、admin/cron 内部用）
-- ====================================================
CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  -- 配信種別 ('daily_morning', 'daily_evening', 'monthly_reflection', 'streak_warning', 'test' など)
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'expired', 'skipped')),
  payload JSONB,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_deliveries_user_kind
  ON notification_deliveries(user_id, kind, sent_at DESC);
CREATE INDEX idx_notification_deliveries_sent_at
  ON notification_deliveries(sent_at DESC);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- 閲覧: 本人と super_admin のみ
CREATE POLICY "notification_deliveries_select" ON notification_deliveries
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_super_admin()
  );

-- 書き込みは service_role (admin client) からのみ → policy 無しで RLS が拒否する
-- （RLS 有効 + INSERT policy 無し → service_role 以外は書けない）
