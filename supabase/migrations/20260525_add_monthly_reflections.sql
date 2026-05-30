-- 月次振り返りテーブル
-- ユーザーが月に1回、目標全体に対して残す自由記述の振り返り
CREATE TABLE monthly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id, year, month)
);

CREATE INDEX idx_monthly_reflections_user_team
  ON monthly_reflections(user_id, team_id);
CREATE INDEX idx_monthly_reflections_year_month
  ON monthly_reflections(year, month);

ALTER TABLE monthly_reflections ENABLE ROW LEVEL SECURITY;

-- 閲覧: 自分・チーム admin・担当トレーナー・super admin
CREATE POLICY "monthly_reflections_select" ON monthly_reflections
  FOR SELECT USING (
    public.is_super_admin()
    OR (
      team_id IN (SELECT public.current_team_ids())
      AND (
        user_id = auth.uid()
        OR public.is_team_admin(team_id)
        OR public.is_trainer_of_in_team(user_id, team_id)
      )
    )
  );

-- 作成: 自分のものだけ
CREATE POLICY "monthly_reflections_insert" ON monthly_reflections
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );

-- 更新: 自分のものだけ
CREATE POLICY "monthly_reflections_update" ON monthly_reflections
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 削除: 自分のものだけ
CREATE POLICY "monthly_reflections_delete" ON monthly_reflections
  FOR DELETE USING (user_id = auth.uid());

-- updated_at トリガ
CREATE TRIGGER update_monthly_reflections_updated_at
  BEFORE UPDATE ON monthly_reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
