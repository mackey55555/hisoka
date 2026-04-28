-- =========================================================================
-- 20260501_a_add_teams.sql
--
-- マルチテナント化マイグレ (a): 新規テーブル & カラム追加
--
-- このマイグレでは「追加」のみを行い、既存の RLS / 旧関数 / role_id は
-- 一切触らない。NOT NULL 制約や旧スキーマ削除は (c) で行う。
-- 既存データは (b) のバックフィルで埋める。
-- =========================================================================

-- ---------------------------------------------------------------
-- 1. 新規テーブル: teams / team_members / team_invitations
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(60) NOT NULL UNIQUE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'starter', 'pro')),
  max_members INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL
    CHECK (role IN ('admin', 'trainer', 'trainee')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'disabled')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role VARCHAR(20) NOT NULL
    CHECK (role IN ('admin', 'trainer', 'trainee')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, email)
);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- ---------------------------------------------------------------
-- 2. users への is_super_admin 追加
-- ---------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------
-- 3. 業務テーブルに team_id を NULLABLE で追加
--    (b) のバックフィル後、(c) で NOT NULL 化する
-- ---------------------------------------------------------------
ALTER TABLE trainer_trainees ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE goals             ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE activities        ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE reflections       ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE ai_diagnoses      ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trainer_trainees_team_id ON trainer_trainees(team_id);
CREATE INDEX IF NOT EXISTS idx_goals_team_id            ON goals(team_id);
CREATE INDEX IF NOT EXISTS idx_activities_team_id       ON activities(team_id);
CREATE INDEX IF NOT EXISTS idx_reflections_team_id      ON reflections(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_diagnoses_team_id     ON ai_diagnoses(team_id);

-- ---------------------------------------------------------------
-- 4. RLS 用ヘルパー関数（新版）
--
--    旧 is_admin() / is_trainer_of() は (c) まで温存して同居させる。
--    新版は別名で作る（衝突回避のため）。
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_team_ids() RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM team_members
   WHERE user_id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(p_team UUID) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
     WHERE user_id = auth.uid() AND team_id = p_team
       AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_of_in_team(
  p_trainee UUID, p_team UUID
) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM trainer_trainees
     WHERE trainer_id = auth.uid()
       AND trainee_id = p_trainee
       AND team_id = p_team
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_super_admin FROM users WHERE id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------
-- 5. team_id 整合性トリガ
--    activities.team_id は goals.team_id から、
--    reflections.team_id は activities.team_id からコピーする。
--    これによりアプリ側のミスを防ぐ。
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.copy_team_id_from_goal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    SELECT team_id INTO NEW.team_id FROM goals WHERE id = NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.copy_team_id_from_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    SELECT team_id INTO NEW.team_id FROM activities WHERE id = NEW.activity_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activities_team_id ON activities;
CREATE TRIGGER trg_activities_team_id
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION public.copy_team_id_from_goal();

DROP TRIGGER IF EXISTS trg_reflections_team_id ON reflections;
CREATE TRIGGER trg_reflections_team_id
  BEFORE INSERT OR UPDATE ON reflections
  FOR EACH ROW EXECUTE FUNCTION public.copy_team_id_from_activity();

-- ---------------------------------------------------------------
-- 6. teams の updated_at トリガ
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------
-- 7. RLS 有効化（ポリシーは (c) で本格定義）
--    teams / team_members / team_invitations は今のうちに ENABLE。
--    暫定で SuperAdmin と service role のみアクセスできる ALL DENY 風に
--    （= ポリシー未定義 = アクセス不可）しておき、(c) で本格化する。
-- ---------------------------------------------------------------
ALTER TABLE teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations   ENABLE ROW LEVEL SECURITY;

-- 暫定ポリシー: SuperAdmin だけ teams/team_members/team_invitations を見られる
-- （(c) で正規ポリシーに置き換える）
CREATE POLICY "tmp_super_admin_teams" ON teams
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY "tmp_super_admin_team_members" ON team_members
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY "tmp_super_admin_team_invitations" ON team_invitations
  FOR SELECT USING (public.is_super_admin());

-- =========================================================================
-- 意図サマリ:
--   - 新規テーブル/カラム/関数/トリガを追加するのみで、既存挙動は変更しない
--   - 既存の goals/activities/reflections/trainer_trainees/ai_diagnoses への
--     アクセスはまだ旧 RLS（auth.uid()=user_id 等）で動く
--   - 次の (b) でバックフィル、(c) で NOT NULL 化と RLS 刷新
-- =========================================================================
