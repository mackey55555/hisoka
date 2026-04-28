-- =========================================================================
-- 20260501_a_add_teams_revert.sql
--
-- (a) を完全に巻き戻す。
-- (b) が走った後にこれを流すと、業務テーブルから team_id が消えるため、
-- バックフィル分の参照は失われる（前提: (a) のみ適用済みの状態に戻す用途）。
-- =========================================================================

-- 暫定ポリシー削除
DROP POLICY IF EXISTS "tmp_super_admin_teams"            ON teams;
DROP POLICY IF EXISTS "tmp_super_admin_team_members"     ON team_members;
DROP POLICY IF EXISTS "tmp_super_admin_team_invitations" ON team_invitations;

-- updated_at トリガ
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;

-- 整合性トリガ
DROP TRIGGER IF EXISTS trg_activities_team_id  ON activities;
DROP TRIGGER IF EXISTS trg_reflections_team_id ON reflections;

-- 関数（新版）
DROP FUNCTION IF EXISTS public.copy_team_id_from_goal();
DROP FUNCTION IF EXISTS public.copy_team_id_from_activity();
DROP FUNCTION IF EXISTS public.current_team_ids();
DROP FUNCTION IF EXISTS public.is_team_admin(UUID);
DROP FUNCTION IF EXISTS public.is_trainer_of_in_team(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_super_admin();

-- 業務テーブルから team_id を削除
ALTER TABLE trainer_trainees  DROP COLUMN IF EXISTS team_id;
ALTER TABLE goals             DROP COLUMN IF EXISTS team_id;
ALTER TABLE activities        DROP COLUMN IF EXISTS team_id;
ALTER TABLE reflections       DROP COLUMN IF EXISTS team_id;
ALTER TABLE ai_diagnoses      DROP COLUMN IF EXISTS team_id;

-- users.is_super_admin
ALTER TABLE users DROP COLUMN IF EXISTS is_super_admin;

-- 新規テーブル
DROP TABLE IF EXISTS team_invitations;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
