-- あなたの密かなスキル（本人の全期間テキストから算出した非認知能力プロファイル）
-- 月次診断(ai_diagnoses)とは別に、蓄積された全テキストから "本人向け" の
-- スキル可視化を1本持つ。ボタンで都度生成・キャッシュする。
-- 課題整理_非認知能力の実装.md §5-2/§5-4 参照。

CREATE TABLE IF NOT EXISTS user_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- 15スキルの行動エビデンス（SkillEvidence[]）。lib/ai/skills-taxonomy.ts が正。
  skill_evidence JSONB NOT NULL,
  -- 分析に使った全期間テキストの長さ
  source_text_length INTEGER NOT NULL DEFAULT 0,

  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_profiles_user ON user_skill_profiles(user_id);

ALTER TABLE user_skill_profiles ENABLE ROW LEVEL SECURITY;

-- 本人は自分のプロファイルを閲覧できる（書き込みは server 側の service key 経由）
DROP POLICY IF EXISTS "Users can view own skill profile" ON user_skill_profiles;
CREATE POLICY "Users can view own skill profile" ON user_skill_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_skill_profiles_updated_at ON user_skill_profiles;
CREATE TRIGGER update_user_skill_profiles_updated_at
  BEFORE UPDATE ON user_skill_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
