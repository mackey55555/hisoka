-- 非認知能力エンジンの移行（T2/T3）
-- 旧: personality_raw_scores / personality_traits（Big Five 代理回答, 妥当性が弱い）
-- 新: skill_evidence（行動エビデンス抽出＋ルーブリック採点, 根拠と信頼度つき）
--
-- 課題整理_非認知能力の実装.md §5-2 参照。
-- 既存行を壊さないため skill_evidence は NULL 許容で追加し、
-- 旧 personality 列は NOT NULL を外して新パイプラインが書かなくても済むようにする。

-- 新カラム: 15スキルの行動エビデンス配列（SkillEvidence[] を JSONB で保持）
--   [{ skillId, level: 1|2|3|null, confidence: 0-1, quotes: string[], rationale }]
ALTER TABLE ai_diagnoses
  ADD COLUMN IF NOT EXISTS skill_evidence JSONB;

-- 旧 personality 列は移行後に書かれなくなるため NOT NULL 制約を解除
ALTER TABLE ai_diagnoses
  ALTER COLUMN personality_raw_scores DROP NOT NULL;

ALTER TABLE ai_diagnoses
  ALTER COLUMN personality_traits DROP NOT NULL;

COMMENT ON COLUMN ai_diagnoses.skill_evidence IS
  '非認知能力の行動エビデンス（SkillEvidence[]）。lib/ai/skills-taxonomy.ts が正。';
COMMENT ON COLUMN ai_diagnoses.personality_raw_scores IS
  '【非推奨】旧Big Five代理回答の生スコア。skill_evidence へ移行済み。';
COMMENT ON COLUMN ai_diagnoses.personality_traits IS
  '【非推奨】旧7特性の集計。skill_evidence へ移行済み。';
