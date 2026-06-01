-- 体感速度改善用のインデックス追加。
-- すべて IF NOT EXISTS なので冪等に何度流しても安全。
--
-- ポイント: PostgreSQL は単一カラムへのインデックスは持っているが、
-- 「WHERE X = ? ORDER BY Y DESC」を高速化するための複合インデックスは無いので
-- 個別に追加する。

-- activities: 「ある goal の活動を新しい順」が頻出
CREATE INDEX IF NOT EXISTS idx_activities_goal_created
  ON activities (goal_id, created_at DESC);

-- reflections: 「ある activity の振り返りを新しい順」が頻出
CREATE INDEX IF NOT EXISTS idx_reflections_activity_created
  ON reflections (activity_id, created_at DESC);

-- goals: 「あるユーザーの目標を新しい順」「status で絞る」が頻出
CREATE INDEX IF NOT EXISTS idx_goals_user_created
  ON goals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_status
  ON goals (user_id, status);

-- team_members: middleware が毎リクエスト「ユーザーの active メンバーシップ」を引く
CREATE INDEX IF NOT EXISTS idx_team_members_user_status
  ON team_members (user_id, status);

-- monthly_reflections: 同一ユーザー・チームで「履歴を新しい順」
CREATE INDEX IF NOT EXISTS idx_monthly_reflections_user_team_ym
  ON monthly_reflections (user_id, team_id, year DESC, month DESC);
