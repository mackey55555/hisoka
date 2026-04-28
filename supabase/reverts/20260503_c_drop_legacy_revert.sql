-- =========================================================================
-- 20260501_c_drop_legacy_revert.sql
--
-- (c) を巻き戻す。
-- 注意: roles テーブルと role_id カラムを再作成し、旧 RLS ポリシーを復元する。
-- 既存データの role 情報は team_members.role から復元する。
-- =========================================================================

-- ---------------------------------------------------------------
-- 1. team_id を再び NULLABLE に（業務テーブルへの旧アクセス互換のため）
-- ---------------------------------------------------------------
ALTER TABLE trainer_trainees ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE goals             ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE activities        ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE reflections       ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE ai_diagnoses      ALTER COLUMN team_id DROP NOT NULL;

-- ---------------------------------------------------------------
-- 2. 新ポリシーを DROP
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_self"               ON users;
DROP POLICY IF EXISTS "users_select_super_admin"        ON users;
DROP POLICY IF EXISTS "users_select_same_team"          ON users;
DROP POLICY IF EXISTS "users_insert_self"               ON users;
DROP POLICY IF EXISTS "users_update_self"               ON users;
DROP POLICY IF EXISTS "users_update_super_admin"        ON users;

DROP POLICY IF EXISTS "goals_select"                    ON goals;
DROP POLICY IF EXISTS "goals_insert"                    ON goals;
DROP POLICY IF EXISTS "goals_update"                    ON goals;
DROP POLICY IF EXISTS "goals_delete"                    ON goals;

DROP POLICY IF EXISTS "activities_select"               ON activities;
DROP POLICY IF EXISTS "activities_insert"               ON activities;
DROP POLICY IF EXISTS "activities_update"               ON activities;
DROP POLICY IF EXISTS "activities_delete"               ON activities;

DROP POLICY IF EXISTS "reflections_select"              ON reflections;
DROP POLICY IF EXISTS "reflections_insert"              ON reflections;
DROP POLICY IF EXISTS "reflections_update"              ON reflections;
DROP POLICY IF EXISTS "reflections_delete"              ON reflections;

DROP POLICY IF EXISTS "trainer_trainees_select"         ON trainer_trainees;
DROP POLICY IF EXISTS "trainer_trainees_admin_manage"   ON trainer_trainees;

DROP POLICY IF EXISTS "ai_diagnoses_select"             ON ai_diagnoses;
DROP POLICY IF EXISTS "ai_diagnoses_insert"             ON ai_diagnoses;
DROP POLICY IF EXISTS "ai_diagnoses_update_own"         ON ai_diagnoses;

DROP POLICY IF EXISTS "ai_question_suggests_select"     ON ai_question_suggests;

DROP POLICY IF EXISTS "teams_select_member"             ON teams;
DROP POLICY IF EXISTS "teams_super_admin_all"           ON teams;
DROP POLICY IF EXISTS "team_members_select"             ON team_members;
DROP POLICY IF EXISTS "team_members_admin_manage"       ON team_members;
DROP POLICY IF EXISTS "team_invitations_select_admin"   ON team_invitations;
DROP POLICY IF EXISTS "team_invitations_admin_manage"   ON team_invitations;

-- ---------------------------------------------------------------
-- 3. roles テーブル & role_id カラム復活
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO roles (name) VALUES ('trainee'), ('trainer'), ('admin')
  ON CONFLICT (name) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- team_members から role_id を復元
UPDATE users u SET role_id = (
  SELECT r.id FROM roles r
   WHERE r.name = (
     SELECT tm.role FROM team_members tm
      WHERE tm.user_id = u.id
      ORDER BY tm.joined_at ASC
      LIMIT 1
   )
);

-- ---------------------------------------------------------------
-- 4. 旧関数を復元
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
     WHERE u.id = auth.uid()
       AND r.name = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_of(trainee_user_id UUID)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_trainees tt
     WHERE tt.trainer_id = auth.uid()
       AND tt.trainee_id = trainee_user_id
  );
$$;

-- ---------------------------------------------------------------
-- 5. 旧 RLS ポリシーを復元（schema.sql から抜粋）
-- ---------------------------------------------------------------

-- users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Trainers can view assigned trainee profiles" ON users
  FOR SELECT USING (public.is_trainer_of(users.id));
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view trainers and trainees" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_trainees
       WHERE (trainer_id = auth.uid() AND trainee_id = users.id)
          OR (trainee_id = auth.uid() AND trainer_id = users.id)
    )
  );

-- goals
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Trainers can view assigned trainee goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_trainees
       WHERE trainer_id = auth.uid() AND trainee_id = goals.user_id
    )
  );
CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- activities
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid())
  );
CREATE POLICY "Trainers can view assigned trainee activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
        JOIN trainer_trainees ON trainer_trainees.trainee_id = goals.user_id
       WHERE goals.id = activities.goal_id AND trainer_trainees.trainer_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid())
  );
CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = activities.goal_id AND goals.user_id = auth.uid())
  );

-- reflections
CREATE POLICY "Users can view own reflections" ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities JOIN goals ON goals.id = activities.goal_id
       WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );
CREATE POLICY "Trainers can view assigned trainee reflections" ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities
        JOIN goals ON goals.id = activities.goal_id
        JOIN trainer_trainees ON trainer_trainees.trainee_id = goals.user_id
       WHERE activities.id = reflections.activity_id AND trainer_trainees.trainer_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own reflections" ON reflections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities JOIN goals ON goals.id = activities.goal_id
       WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own reflections" ON reflections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM activities JOIN goals ON goals.id = activities.goal_id
       WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own reflections" ON reflections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM activities JOIN goals ON goals.id = activities.goal_id
       WHERE activities.id = reflections.activity_id AND goals.user_id = auth.uid()
    )
  );

-- trainer_trainees
CREATE POLICY "Trainers can view own assignments" ON trainer_trainees
  FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "Trainees can view own assignments" ON trainer_trainees
  FOR SELECT USING (trainee_id = auth.uid());
CREATE POLICY "Admins can manage all assignments" ON trainer_trainees
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ai_diagnoses
CREATE POLICY "Users can view own diagnoses" ON ai_diagnoses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Trainers can view assigned trainee diagnoses" ON ai_diagnoses
  FOR SELECT USING (public.is_trainer_of(user_id));

-- ai_question_suggests
CREATE POLICY "Trainers can view question suggests" ON ai_question_suggests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_diagnoses d
       WHERE d.id = ai_question_suggests.diagnosis_id
         AND public.is_trainer_of(d.user_id)
    )
  );

-- teams 系は (a) revert で消える前提なので、ここでは暫定ポリシーを入れない
