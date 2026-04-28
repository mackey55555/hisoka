-- =========================================================================
-- 20260501_c_drop_legacy.sql
--
-- マルチテナント化マイグレ (c): RLS刷新 + 旧スキーマ削除
--
-- 前提: (a)→(b) が完了している（業務テーブルの team_id が全行埋まっている）
-- 内容:
--   1. 業務テーブルの team_id を NOT NULL 化
--   2. 既存 RLS ポリシーを DROP
--   3. 新 RLS ポリシーを CREATE（テナント境界）
--   4. team_members / team_invitations の RLS を本格化
--   5. users.role_id を DROP
--   6. 旧関数 is_admin / is_trainer_of を DROP
--   7. roles テーブルを DROP
-- =========================================================================

-- ---------------------------------------------------------------
-- 1. team_id を NOT NULL 化
-- ---------------------------------------------------------------
ALTER TABLE trainer_trainees ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE goals             ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE activities        ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE reflections       ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE ai_diagnoses      ALTER COLUMN team_id SET NOT NULL;

-- ---------------------------------------------------------------
-- 2. 既存ポリシーを DROP
-- ---------------------------------------------------------------

-- users
DROP POLICY IF EXISTS "Users can view own profile"                    ON users;
DROP POLICY IF EXISTS "Admins can view all users"                     ON users;
DROP POLICY IF EXISTS "Trainers can view assigned trainee profiles"   ON users;
DROP POLICY IF EXISTS "Users can insert own profile"                  ON users;
DROP POLICY IF EXISTS "Users can update own profile"                  ON users;
DROP POLICY IF EXISTS "Users can view trainers and trainees"          ON users;

-- goals
DROP POLICY IF EXISTS "Users can view own goals"                      ON goals;
DROP POLICY IF EXISTS "Trainers can view assigned trainee goals"      ON goals;
DROP POLICY IF EXISTS "Users can insert own goals"                    ON goals;
DROP POLICY IF EXISTS "Users can update own goals"                    ON goals;
DROP POLICY IF EXISTS "Users can delete own goals"                    ON goals;

-- activities
DROP POLICY IF EXISTS "Users can view own activities"                 ON activities;
DROP POLICY IF EXISTS "Trainers can view assigned trainee activities" ON activities;
DROP POLICY IF EXISTS "Users can insert own activities"               ON activities;
DROP POLICY IF EXISTS "Users can update own activities"               ON activities;
DROP POLICY IF EXISTS "Users can delete own activities"               ON activities;

-- reflections
DROP POLICY IF EXISTS "Users can view own reflections"                ON reflections;
DROP POLICY IF EXISTS "Trainers can view assigned trainee reflections" ON reflections;
DROP POLICY IF EXISTS "Users can insert own reflections"              ON reflections;
DROP POLICY IF EXISTS "Users can update own reflections"              ON reflections;
DROP POLICY IF EXISTS "Users can delete own reflections"              ON reflections;

-- trainer_trainees
DROP POLICY IF EXISTS "Trainers can view own assignments"             ON trainer_trainees;
DROP POLICY IF EXISTS "Trainees can view own assignments"             ON trainer_trainees;
DROP POLICY IF EXISTS "Admins can manage all assignments"             ON trainer_trainees;

-- ai_diagnoses
DROP POLICY IF EXISTS "Users can view own diagnoses"                  ON ai_diagnoses;
DROP POLICY IF EXISTS "Trainers can view assigned trainee diagnoses"  ON ai_diagnoses;

-- ai_question_suggests
DROP POLICY IF EXISTS "Trainers can view question suggests"           ON ai_question_suggests;

-- (a) で作った暫定ポリシー
DROP POLICY IF EXISTS "tmp_super_admin_teams"                         ON teams;
DROP POLICY IF EXISTS "tmp_super_admin_team_members"                  ON team_members;
DROP POLICY IF EXISTS "tmp_super_admin_team_invitations"              ON team_invitations;

-- ---------------------------------------------------------------
-- 3. 新 RLS ポリシー: 業務テーブル
--    共通テンプレ:
--    is_super_admin OR (
--      team_id IN current_team_ids AND (
--        user_id=auth.uid() OR is_team_admin(team_id) OR is_trainer_of_in_team(user_id, team_id)
--      )
--    )
-- ---------------------------------------------------------------

-- ===== users =====
-- 自分のレコード（is_super_admin の評価で users を SELECT するため、
-- 自レコードは常に見えるようにしておく必要あり）
CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (id = auth.uid());

-- SuperAdmin は全 users を見られる
CREATE POLICY "users_select_super_admin" ON users
  FOR SELECT USING (public.is_super_admin());

-- 同チームメンバーの users を見られる
CREATE POLICY "users_select_same_team" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm_self
       WHERE tm_self.user_id = auth.uid()
         AND tm_self.status = 'active'
         AND tm_self.team_id IN (
           SELECT team_id FROM team_members tm_other
            WHERE tm_other.user_id = users.id
              AND tm_other.status = 'active'
         )
    )
  );

-- 自分のレコードは作成・更新可能
CREATE POLICY "users_insert_self" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

-- SuperAdmin は users を全更新可能（is_super_admin の付け外し用）
CREATE POLICY "users_update_super_admin" ON users
  FOR UPDATE USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ===== goals =====
CREATE POLICY "goals_select" ON goals
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

CREATE POLICY "goals_insert" ON goals
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );

CREATE POLICY "goals_update" ON goals
  FOR UPDATE USING (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );

CREATE POLICY "goals_delete" ON goals
  FOR DELETE USING (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );


-- ===== activities =====
-- activities.user_id は無いので goals 経由の判定にする
CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (
    public.is_super_admin()
    OR (
      team_id IN (SELECT public.current_team_ids())
      AND (
        EXISTS (
          SELECT 1 FROM goals g
           WHERE g.id = activities.goal_id
             AND (
               g.user_id = auth.uid()
               OR public.is_team_admin(activities.team_id)
               OR public.is_trainer_of_in_team(g.user_id, activities.team_id)
             )
        )
      )
    )
  );

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals g
       WHERE g.id = activities.goal_id
         AND g.user_id = auth.uid()
         AND g.team_id IN (SELECT public.current_team_ids())
    )
  );

CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM goals g
       WHERE g.id = activities.goal_id
         AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM goals g
       WHERE g.id = activities.goal_id
         AND g.user_id = auth.uid()
    )
  );


-- ===== reflections =====
CREATE POLICY "reflections_select" ON reflections
  FOR SELECT USING (
    public.is_super_admin()
    OR (
      team_id IN (SELECT public.current_team_ids())
      AND (
        EXISTS (
          SELECT 1 FROM activities a
            JOIN goals g ON g.id = a.goal_id
           WHERE a.id = reflections.activity_id
             AND (
               g.user_id = auth.uid()
               OR public.is_team_admin(reflections.team_id)
               OR public.is_trainer_of_in_team(g.user_id, reflections.team_id)
             )
        )
      )
    )
  );

CREATE POLICY "reflections_insert" ON reflections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
        JOIN goals g ON g.id = a.goal_id
       WHERE a.id = reflections.activity_id
         AND g.user_id = auth.uid()
         AND g.team_id IN (SELECT public.current_team_ids())
    )
  );

CREATE POLICY "reflections_update" ON reflections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM activities a
        JOIN goals g ON g.id = a.goal_id
       WHERE a.id = reflections.activity_id
         AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "reflections_delete" ON reflections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM activities a
        JOIN goals g ON g.id = a.goal_id
       WHERE a.id = reflections.activity_id
         AND g.user_id = auth.uid()
    )
  );


-- ===== trainer_trainees =====
CREATE POLICY "trainer_trainees_select" ON trainer_trainees
  FOR SELECT USING (
    public.is_super_admin()
    OR (
      team_id IN (SELECT public.current_team_ids())
      AND (
        trainer_id = auth.uid()
        OR trainee_id = auth.uid()
        OR public.is_team_admin(team_id)
      )
    )
  );

CREATE POLICY "trainer_trainees_admin_manage" ON trainer_trainees
  FOR ALL USING (public.is_super_admin() OR public.is_team_admin(team_id))
  WITH CHECK (public.is_super_admin() OR public.is_team_admin(team_id));


-- ===== ai_diagnoses =====
CREATE POLICY "ai_diagnoses_select" ON ai_diagnoses
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

-- ai_diagnoses は service role 経由で書き込む想定だが、念のため
CREATE POLICY "ai_diagnoses_insert" ON ai_diagnoses
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );

CREATE POLICY "ai_diagnoses_update_own" ON ai_diagnoses
  FOR UPDATE USING (
    user_id = auth.uid()
    AND team_id IN (SELECT public.current_team_ids())
  );


-- ===== ai_question_suggests =====
-- diagnosis_id 経由で ai_diagnoses の team_id を引いて判定
CREATE POLICY "ai_question_suggests_select" ON ai_question_suggests
  FOR SELECT USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM ai_diagnoses d
       WHERE d.id = ai_question_suggests.diagnosis_id
         AND d.team_id IN (SELECT public.current_team_ids())
         AND (
           public.is_team_admin(d.team_id)
           OR public.is_trainer_of_in_team(d.user_id, d.team_id)
         )
    )
  );


-- ---------------------------------------------------------------
-- 4. teams / team_members / team_invitations の RLS（本格版）
-- ---------------------------------------------------------------

-- ===== teams =====
CREATE POLICY "teams_select_member" ON teams
  FOR SELECT USING (
    public.is_super_admin()
    OR id IN (SELECT public.current_team_ids())
  );

-- INSERT/UPDATE/DELETE は SuperAdmin のみ（チーム発行は service role 経由でも可）
CREATE POLICY "teams_super_admin_all" ON teams
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ===== team_members =====
-- 同チームのメンバーは見える
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT USING (
    public.is_super_admin()
    OR team_id IN (SELECT public.current_team_ids())
  );

-- 追加・更新・削除は team admin or SuperAdmin
CREATE POLICY "team_members_admin_manage" ON team_members
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_team_admin(team_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_team_admin(team_id)
  );


-- ===== team_invitations =====
-- 同チームの admin（または SuperAdmin）のみ閲覧可能
CREATE POLICY "team_invitations_select_admin" ON team_invitations
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_team_admin(team_id)
  );

CREATE POLICY "team_invitations_admin_manage" ON team_invitations
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_team_admin(team_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_team_admin(team_id)
  );


-- ---------------------------------------------------------------
-- 5. users.role_id を DROP
-- ---------------------------------------------------------------
ALTER TABLE users DROP COLUMN IF EXISTS role_id;


-- ---------------------------------------------------------------
-- 6. 旧関数を DROP
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_trainer_of(UUID);


-- ---------------------------------------------------------------
-- 7. roles テーブルを DROP
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS roles;

-- =========================================================================
-- 意図サマリ:
--   - 業務テーブルは team_id NOT NULL + テナント境界の RLS に統一
--   - チーム横断は SuperAdmin のみ
--   - チーム内では admin / trainer(担当のみ) / trainee(自分のみ) の階層
--   - users.role_id, roles テーブル, 旧関数を一掃
-- =========================================================================
