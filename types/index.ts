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

// --- AI機能 ---

export type TraitKey =
  | 'extraversion'
  | 'agreeableness'
  | 'conscientiousness'
  | 'emotionality'
  | 'openness'
  | 'honesty_humility'
  | 'curiosity';

export interface TraitResult {
  score: number;
  level: 'HIGH' | 'LOW';
}

export const TRAIT_LABELS: Record<TraitKey, string> = {
  extraversion: '外向性',
  agreeableness: '協調性',
  conscientiousness: '誠実性',
  emotionality: '情緒性',
  openness: '開放性',
  honesty_humility: '誠実さ・謙虚さ',
  curiosity: '好奇心',
};

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
  personality_raw_scores: Record<number, number>;
  personality_traits: Record<TraitKey, TraitResult>;
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

