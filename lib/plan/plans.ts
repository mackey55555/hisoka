/**
 * プラン定義の単一ソース。
 *
 * 「機能 × プラン マトリクス」(docs/pricing-plan-design.md)をコードに落としたもの。
 * 価格・人数上限・機能ゲートはすべてここを起点にする。
 *
 * このファイルは環境変数や server-only な依存を持たず、client/server どちらからも
 * import できる純粋モジュールにしておくこと(UI のバッジ表示等でも使うため)。
 * Stripe の price ID とのマッピングは lib/stripe/client.ts 側(server-only)に置く。
 */

export type PlanId = 'free' | 'starter' | 'pro';

export interface PlanFeatures {
  /** 目標/活動/振り返り/ダッシュボード(全プラン共通のコア) */
  core: boolean;
  /** Push / メール通知 */
  notifications: boolean;
  /** AI 月次診断(パーソナリティ特性分析) */
  monthlyDiagnosis: boolean;
  /** AI 質問サジェスト(トレーナー向け) */
  questionSuggest: boolean;
  /** AI 振り返りサポート(対話) */
  reflectionSupport: boolean;
  /** エクスポート(PDF / CSV) */
  export: boolean;
}

export interface PlanConfig {
  id: PlanId;
  label: string;
  /** 月額(税込想定・チーム単位・円)。free は 0。 */
  priceJpy: number;
  /** メンバー上限(teams.max_members の正となる値) */
  maxMembers: number;
  /** 過去データ閲覧可能期間(日)。null = 無制限。 */
  historyWindowDays: number | null;
  features: PlanFeatures;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    label: 'Free',
    priceJpy: 0,
    maxMembers: 5,
    historyWindowDays: 365, // 過去1年まで
    features: {
      core: true,
      notifications: true,
      monthlyDiagnosis: true, // Free でも無制限
      questionSuggest: false,
      reflectionSupport: false,
      export: false,
    },
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    priceJpy: 30000,
    maxMembers: 20,
    historyWindowDays: null, // 無制限
    features: {
      core: true,
      notifications: true,
      monthlyDiagnosis: true,
      questionSuggest: true,
      reflectionSupport: true,
      export: false, // エクスポートは Pro のみ
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceJpy: 50000,
    maxMembers: 50,
    historyWindowDays: null,
    features: {
      core: true,
      notifications: true,
      monthlyDiagnosis: true,
      questionSuggest: true,
      reflectionSupport: true,
      export: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro'];

/** 不明な値でも安全に free 相当へフォールバックしてプラン設定を返す。 */
export function getPlanConfig(plan: string | null | undefined): PlanConfig {
  if (plan === 'starter' || plan === 'pro' || plan === 'free') {
    return PLANS[plan];
  }
  return PLANS.free;
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  const c = getPlanConfig(plan);
  return c.id !== 'free';
}

export function maxMembersFor(plan: string | null | undefined): number {
  return getPlanConfig(plan).maxMembers;
}

/** 過去データ閲覧の下限日時(この日時以降のみ閲覧可)。無制限なら null。 */
export function historyWindowStart(plan: string | null | undefined): Date | null {
  const days = getPlanConfig(plan).historyWindowDays;
  if (days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function canExport(plan: string | null | undefined): boolean {
  return getPlanConfig(plan).features.export;
}

export function canUseQuestionSuggest(plan: string | null | undefined): boolean {
  return getPlanConfig(plan).features.questionSuggest;
}

export function canUseReflectionSupport(plan: string | null | undefined): boolean {
  return getPlanConfig(plan).features.reflectionSupport;
}
