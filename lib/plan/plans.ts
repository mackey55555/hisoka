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
  /** Push 通知（毎晩のリマインダー等）。メール通知機能は未実装 */
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
  features: PlanFeatures;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    label: 'Free',
    priceJpy: 0,
    maxMembers: 2,
    // 閲覧範囲は限定: コンテンツ=当月のみ / AI診断=当月+前月（窓は下部ヘルパー参照）
    features: {
      core: true,
      notifications: true,
      monthlyDiagnosis: true,
      questionSuggest: true, // お試しのため Starter 同等に開放
      reflectionSupport: true, // 同上
      export: false,
    },
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    priceJpy: 10000,
    maxMembers: 5,
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
    maxMembers: 30,
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

/**
 * 閲覧履歴が制限されるプランか（現状 Free のみ）。
 * Free: コンテンツ=当月のみ / AI診断=当月+前月。Starter/Pro=無制限。
 */
export function isHistoryLimited(plan: string | null | undefined): boolean {
  return getPlanConfig(plan).id === 'free';
}

/** UTC で「現在から offset ヶ月」の月初(1日 00:00:00Z)を返す。analysis バッチの月境界と一致。 */
function startOfMonthUTC(offset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}

/**
 * コンテンツ(活動/振り返り等)の閲覧下限。制限プランは「当月1日」、無制限は null。
 * これより古い created_at は表示しない（月を跨ぐと前月分は見えなくなる）。
 */
export function contentWindowStart(plan: string | null | undefined): Date | null {
  return isHistoryLimited(plan) ? startOfMonthUTC(0) : null;
}

/**
 * AI月次診断の閲覧下限。制限プランは「前月1日」(=当月+前月)、無制限は null。
 */
export function diagnosisWindowStart(plan: string | null | undefined): Date | null {
  return isHistoryLimited(plan) ? startOfMonthUTC(-1) : null;
}

/** AI診断で閲覧可能な最古の年月(1-based month)。無制限なら null。 */
export function diagnosisMinMonth(
  plan: string | null | undefined
): { year: number; month: number } | null {
  const d = diagnosisWindowStart(plan);
  if (!d) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** 料金/請求画面などの「過去データ閲覧」表示ラベル。 */
export function historyLabel(plan: string | null | undefined): string {
  return isHistoryLimited(plan) ? '当月のみ（AI診断は前月まで）' : '無制限';
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
