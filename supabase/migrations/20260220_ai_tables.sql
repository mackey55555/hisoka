-- AI診断テーブル（月次AI診断結果）
CREATE TABLE ai_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- ネガポジ分析
  sentiment_score DECIMAL(4,2) NOT NULL,
  sentiment_positive_ratio DECIMAL(3,2) NOT NULL,
  sentiment_negative_ratio DECIMAL(3,2) NOT NULL,
  sentiment_neutral_ratio DECIMAL(3,2) NOT NULL,
  sentiment_positive_keywords TEXT[] DEFAULT '{}',
  sentiment_negative_keywords TEXT[] DEFAULT '{}',
  sentiment_trend VARCHAR(20) DEFAULT 'stable'
    CHECK (sentiment_trend IN ('improving', 'stable', 'declining')),

  -- パーソナリティ分析（60問の生スコア）
  personality_raw_scores JSONB NOT NULL,

  -- 7特性の集計結果
  personality_traits JSONB NOT NULL,

  -- 月次要約
  summary TEXT NOT NULL,

  -- メタデータ
  source_text_length INTEGER NOT NULL DEFAULT 0,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, year, month)
);

CREATE INDEX idx_ai_diagnoses_user_id ON ai_diagnoses(user_id);
CREATE INDEX idx_ai_diagnoses_year_month ON ai_diagnoses(year, month);

-- 質問サジェストテーブル
CREATE TABLE ai_question_suggests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES ai_diagnoses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('growth', 'challenge', 'strength', 'emotion', 'next_step')),
  intent TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_question_suggests_diagnosis_id
  ON ai_question_suggests(diagnosis_id);

-- RLS有効化
ALTER TABLE ai_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_question_suggests ENABLE ROW LEVEL SECURITY;

-- ai_diagnoses: トレーニーは自分のデータのみ
CREATE POLICY "Users can view own diagnoses" ON ai_diagnoses
  FOR SELECT USING (auth.uid() = user_id);

-- ai_diagnoses: トレーナーは担当トレーニーのデータ
CREATE POLICY "Trainers can view assigned trainee diagnoses" ON ai_diagnoses
  FOR SELECT USING (public.is_trainer_of(user_id));

-- ai_question_suggests: トレーナーのみ閲覧可能
CREATE POLICY "Trainers can view question suggests" ON ai_question_suggests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_diagnoses d
      WHERE d.id = ai_question_suggests.diagnosis_id
        AND public.is_trainer_of(d.user_id)
    )
  );

-- updated_at トリガー
CREATE TRIGGER update_ai_diagnoses_updated_at
  BEFORE UPDATE ON ai_diagnoses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
