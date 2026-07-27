import type { SkillEvidence } from '@/lib/ai/skills-taxonomy';

export type Role = 'trainee' | 'trainer' | 'admin';

export type GoalStatus = 'in_progress' | 'achieved' | 'cancelled';

export interface RoleData {
  id: string;
  name: Role;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  created_at: string;
  updated_at: string;
  role?: RoleData;
}

export interface TrainerTrainee {
  id: string;
  trainer_id: string;
  trainee_id: string;
  created_at: string;
  trainer?: User;
  trainee?: User;
}

export interface Goal {
  id: string;
  user_id: string;
  content: string;
  deadline: string;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  user?: User;
  activities?: Activity[];
}

export interface Activity {
  id: string;
  goal_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  goal?: Goal;
  reflections?: Reflection[];
}

export interface Reflection {
  id: string;
  activity_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  activity?: Activity;
}

export interface MonthlyReflection {
  id: string;
  user_id: string;
  team_id: string;
  year: number;
  month: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// --- AI機能 ---

export interface AiDiagnosis {
  id: string;
  user_id: string;
  year: number;
  month: number;
  sentiment_score: number;
  sentiment_positive_ratio: number;
  sentiment_negative_ratio: number;
  sentiment_neutral_ratio: number;
  sentiment_positive_keywords: string[];
  sentiment_negative_keywords: string[];
  sentiment_trend: 'improving' | 'stable' | 'declining';
  /** 非認知能力の行動エビデンス（新エンジン）。旧データには無いため null 許容 */
  skill_evidence: SkillEvidence[] | null;
  summary: string;
  source_text_length: number;
  analyzed_at: string;
  created_at: string;
  updated_at: string;
}

export type QuestionCategory =
  | 'growth'
  | 'challenge'
  | 'strength'
  | 'emotion'
  | 'next_step';

export interface AiQuestionSuggest {
  id: string;
  diagnosis_id: string;
  question: string;
  category: QuestionCategory;
  intent: string;
  priority: number;
  created_at: string;
}

/** あなたの密かなスキル: 本人の全期間テキストから算出したスキルプロファイル */
export interface UserSkillProfile {
  id: string;
  user_id: string;
  team_id: string;
  skill_evidence: SkillEvidence[];
  source_text_length: number;
  analyzed_at: string;
  created_at: string;
  updated_at: string;
}

