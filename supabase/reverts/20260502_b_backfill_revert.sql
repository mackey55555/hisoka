-- =========================================================================
-- 20260501_b_backfill_revert.sql
--
-- (b) のバックフィルを巻き戻す。
-- 業務テーブルの team_id を NULL に戻し、Default Team に紐づく
-- team_members を削除し、Default Team を削除する。
--
-- 注意: (c) を流していない状態でのみ意味がある（(c) で NOT NULL 化されているとエラー）。
-- =========================================================================

DO $$
DECLARE
  v_default_team UUID;
BEGIN
  SELECT id INTO v_default_team FROM teams WHERE slug = 'default';

  IF v_default_team IS NOT NULL THEN
    UPDATE trainer_trainees SET team_id = NULL WHERE team_id = v_default_team;
    UPDATE goals             SET team_id = NULL WHERE team_id = v_default_team;
    UPDATE activities        SET team_id = NULL WHERE team_id = v_default_team;
    UPDATE reflections       SET team_id = NULL WHERE team_id = v_default_team;
    UPDATE ai_diagnoses      SET team_id = NULL WHERE team_id = v_default_team;

    DELETE FROM team_members WHERE team_id = v_default_team;
    DELETE FROM teams WHERE id = v_default_team;

    RAISE NOTICE 'Reverted Default Team backfill: %', v_default_team;
  END IF;
END $$;
