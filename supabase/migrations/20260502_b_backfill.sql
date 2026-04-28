-- =========================================================================
-- 20260501_b_backfill.sql
--
-- マルチテナント化マイグレ (b): 既存データのバックフィル
--
-- 既存ユーザー全員を Default Team に集約し、業務テーブルの team_id を埋める。
-- 原子性のため DO $$ ブロックでまとめて実行する。
-- =========================================================================

DO $$
DECLARE
  v_default_team UUID;
BEGIN
  -- 1) Default Team を作成（既に存在すれば取得）
  SELECT id INTO v_default_team FROM teams WHERE slug = 'default';

  IF v_default_team IS NULL THEN
    INSERT INTO teams (name, slug, plan, max_members, status)
    VALUES ('Default Team', 'default', 'pro', 9999, 'active')
    RETURNING id INTO v_default_team;

    RAISE NOTICE 'Created Default Team: %', v_default_team;
  ELSE
    RAISE NOTICE 'Default Team already exists: %', v_default_team;
  END IF;

  -- 2) 既存 users 全員を team_members に挿入
  --    role は roles.name から、status='active'
  --    既に team_members に存在する場合はスキップ（再実行安全）
  INSERT INTO team_members (team_id, user_id, role, status)
  SELECT v_default_team, u.id, r.name, 'active'
    FROM users u
    JOIN roles r ON r.id = u.role_id
   WHERE NOT EXISTS (
     SELECT 1 FROM team_members tm
      WHERE tm.team_id = v_default_team
        AND tm.user_id = u.id
   );

  -- 3) 業務テーブルの team_id をバックフィル（NULL のみ更新）
  UPDATE trainer_trainees SET team_id = v_default_team WHERE team_id IS NULL;
  UPDATE goals             SET team_id = v_default_team WHERE team_id IS NULL;
  UPDATE activities        SET team_id = v_default_team WHERE team_id IS NULL;
  UPDATE reflections       SET team_id = v_default_team WHERE team_id IS NULL;
  UPDATE ai_diagnoses      SET team_id = v_default_team WHERE team_id IS NULL;

END $$;

-- =========================================================================
-- 確認用 SELECT（実行後に手動で叩いて、各テーブルが0件であることを確認）
--
-- SELECT 'trainer_trainees' AS t, COUNT(*) FROM trainer_trainees WHERE team_id IS NULL
-- UNION ALL SELECT 'goals',             COUNT(*) FROM goals             WHERE team_id IS NULL
-- UNION ALL SELECT 'activities',        COUNT(*) FROM activities        WHERE team_id IS NULL
-- UNION ALL SELECT 'reflections',       COUNT(*) FROM reflections       WHERE team_id IS NULL
-- UNION ALL SELECT 'ai_diagnoses',      COUNT(*) FROM ai_diagnoses      WHERE team_id IS NULL;
--
-- 期待値: すべて 0
-- =========================================================================
