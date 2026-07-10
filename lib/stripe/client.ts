/**
 * Stripe SDK の初期化と price ID ↔ プランの対応。
 *
 * server-only。server action / webhook からのみ import すること
 * (STRIPE_SECRET_KEY をバンドルに含めないため)。
 */
import Stripe from 'stripe';
import type { PlanId } from '@/lib/plan/plans';

let _stripe: Stripe | null = null;

/** 遅延初期化した Stripe インスタンスを返す。未設定なら明示エラー。 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY が設定されていません');
  }
  if (!_stripe) {
    // apiVersion は SDK 既定(ピン留め済み)を使う。
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/**
 * 有料プラン → Stripe price ID。
 * Stripe ダッシュボードで作成した Price(月額)の ID を env に設定する。
 */
export function priceIdForPlan(plan: Exclude<PlanId, 'free'>): string {
  const map: Record<Exclude<PlanId, 'free'>, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
  };
  const id = map[plan];
  if (!id) {
    throw new Error(`プラン "${plan}" の Stripe price ID(env)が未設定です`);
  }
  return id;
}

/** Stripe price ID → プラン。未知の price は null(webhook 側で無視する)。 */
export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  return null;
}
