'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  subscribeToPush,
  unsubscribeFromPush,
  updateMyPreferences,
  type NotificationPreferences,
} from '@/lib/actions/push-notifications';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface Props {
  teamSlug: string;
  initialPreferences: NotificationPreferences;
  hasSubscription: boolean;
}

type EnvState = {
  supported: boolean;
  permission: NotificationPermission;
  isIOS: boolean;
  isStandalone: boolean;
};

export function NotificationSettingsCard({
  teamSlug,
  initialPreferences,
  hasSubscription,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [env, setEnv] = useState<EnvState>({
    supported: false,
    permission: 'default',
    isIOS: false,
    isStandalone: false,
  });
  const [subscribed, setSubscribed] = useState(hasSubscription);
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    const permission = supported && 'Notification' in window
      ? Notification.permission
      : 'denied';
    setEnv({ supported, permission, isIOS, isStandalone });
  }, []);

  const flash = (kind: 'error' | 'success', msg: string) => {
    if (kind === 'error') {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
  };

  const handleSubscribe = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (!VAPID_PUBLIC_KEY) {
        flash('error', 'VAPID 公開鍵が設定されていません（管理者にご連絡ください）');
        setBusy(false);
        return;
      }

      const perm = await Notification.requestPermission();
      setEnv((s) => ({ ...s, permission: perm }));
      if (perm !== 'granted') {
        flash('error', '通知の許可が得られませんでした');
        setBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const json = subscription.toJSON();
      const result = await subscribeToPush(teamSlug, {
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh || '',
        auth: json.keys?.auth || '',
        userAgent: navigator.userAgent,
      });

      if (result.error) {
        flash('error', result.error);
      } else {
        setSubscribed(true);
        flash('success', '通知を有効化しました');
        router.refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      flash('error', '通知の登録に失敗しました: ' + msg);
    }
    setBusy(false);
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribeFromPush(teamSlug, endpoint);
      }
      setSubscribed(false);
      flash('success', '通知を解除しました');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      flash('error', '解除に失敗しました: ' + msg);
    }
    setBusy(false);
  };

  const handleSavePrefs = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    const result = await updateMyPreferences(teamSlug, prefs);
    if (result.error) {
      flash('error', result.error);
    } else {
      flash('success', '通知設定を保存しました');
    }
    setBusy(false);
  };

  if (!mounted) {
    return (
      <Card>
        <h2 className="text-lg font-bold text-text-primary mb-1">通知設定</h2>
        <p className="text-xs text-text-secondary mb-4">
          書き忘れ防止やストリーク維持に役立ちます
        </p>
        <p className="text-sm text-text-secondary">読み込み中...</p>
      </Card>
    );
  }

  const canSubscribe =
    env.supported && (!env.isIOS || env.isStandalone) && env.permission !== 'denied';

  return (
    <Card>
      <h2 className="text-lg font-bold text-text-primary mb-1">通知設定</h2>
      <p className="text-xs text-text-secondary mb-4">
        書き忘れ防止やストリーク維持に役立ちます
      </p>

      {!env.supported && (
        <p className="text-sm text-text-secondary">
          ご使用のブラウザは Web 通知に対応していません。Chrome / Safari (iOS 16.4+) / Edge / Firefox 等の最新版でアクセスしてください。
        </p>
      )}

      {env.supported && env.isIOS && !env.isStandalone && (
        <div className="bg-background/60 rounded-lg p-4 space-y-3">
          <p className="text-sm text-text-primary">
            iPhone / iPad で通知を受け取るには、まず Hisoka を「ホーム画面に追加」してください。
          </p>
          <ol className="text-xs text-text-secondary space-y-1 list-decimal pl-5">
            <li>Safari の画面下の<strong>共有</strong>ボタンをタップ</li>
            <li>「<strong>ホーム画面に追加</strong>」を選択</li>
            <li>追加された Hisoka アイコンから開き直す</li>
            <li>このページを再度開くと「通知を有効にする」ボタンが表示されます</li>
          </ol>
        </div>
      )}

      {env.supported && (!env.isIOS || env.isStandalone) && env.permission === 'denied' && (
        <div className="bg-background/60 rounded-lg p-4">
          <p className="text-sm text-text-primary">
            通知が拒否されています。
          </p>
          <p className="text-xs text-text-secondary mt-2">
            ブラウザの設定から Hisoka の通知を「許可」に変更してから、もう一度お試しください。
          </p>
        </div>
      )}

      {canSubscribe && !subscribed && (
        <div className="space-y-3">
          <p className="text-sm text-text-primary">
            通知はまだ有効になっていません。
          </p>
          <Button variant="primary" onClick={handleSubscribe} disabled={busy}>
            {busy ? '処理中...' : '通知を有効にする'}
          </Button>
        </div>
      )}

      {canSubscribe && subscribed && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-success font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              通知が有効です
            </span>
            <Button variant="ghost" onClick={handleUnsubscribe} disabled={busy} className="text-sm">
              解除する
            </Button>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-sm font-bold text-text-primary">通知の種類</p>

            <PrefToggle
              checked={prefs.daily_morning}
              onChange={(v) => setPrefs({ ...prefs, daily_morning: v })}
              label="朝のリマインダー（8:00 JST）"
              hint="今日も書きませんか"
            />
            <PrefToggle
              checked={prefs.daily_evening}
              onChange={(v) => setPrefs({ ...prefs, daily_evening: v })}
              label="夕方のリマインダー（21:00 JST）"
              hint="今日の活動を振り返ってみませんか"
            />
            <PrefToggle
              checked={prefs.monthly_reflection}
              onChange={(v) => setPrefs({ ...prefs, monthly_reflection: v })}
              label="月次振り返りリマインダー"
              hint="月末に1回"
            />
            <PrefToggle
              checked={prefs.streak_warning}
              onChange={(v) => setPrefs({ ...prefs, streak_warning: v })}
              label="ストリーク警告"
              hint="連続記録が途切れそうな夜に"
            />
            <PrefToggle
              checked={prefs.trainer_message}
              onChange={(v) => setPrefs({ ...prefs, trainer_message: v })}
              label="トレーナーからの通知"
              hint="コメントなど（将来機能）"
            />
          </div>

          <Button variant="primary" onClick={handleSavePrefs} disabled={busy}>
            {busy ? '保存中...' : '通知設定を保存'}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-3 text-error text-sm">{error}</div>
      )}
      {success && (
        <div className="mt-3 bg-success/10 border border-success/30 text-success text-sm rounded-lg p-3">
          {success}
        </div>
      )}
    </Card>
  );
}

function PrefToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer hover:bg-background/40 rounded-lg p-2 -m-2 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
      />
      <span className="flex-1 min-w-0">
        <span className="text-sm text-text-primary block">{label}</span>
        {hint && (
          <span className="text-xs text-text-secondary block mt-0.5">{hint}</span>
        )}
      </span>
    </label>
  );
}
