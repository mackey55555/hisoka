-- =========================================================================
-- 20260711_add_team_member_auto_lock.sql
--
-- プラン降格でシート上限(max_members)を超えたとき、超過メンバーを自動でロック
-- (status='disabled') した「印」。手動 disabled と区別するために使う。
--   NULL          = 自動ロックではない（通常/手動無効化）
--   タイムスタンプ = プラン降格で自動ロックされた（アップグレードで自動復帰の対象）
--
-- ロック自体は既存の status='disabled' で成立する（current-team の
-- resolveTeamFromSlug が status!='active' を弾くため）。この列は復帰対象の特定用。
-- =========================================================================

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS auto_locked_at TIMESTAMPTZ;
