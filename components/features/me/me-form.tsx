'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  updateMyName,
  requestEmailChange,
  updateMyPassword,
} from '@/lib/actions/me';

interface Props {
  teamSlug: string;
  currentName: string;
  currentEmail: string;
  roleLabel: string;
}

export function MeForm({ teamSlug, currentName, currentEmail, roleLabel }: Props) {
  const router = useRouter();

  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailPending, setEmailPending] = useState<string | null>(null);

  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleNameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess(false);
    setNameLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateMyName(teamSlug, formData);
    if (result.error) {
      setNameError(result.error);
      setNameLoading(false);
      return;
    }
    setNameSuccess(true);
    setNameLoading(false);
    router.refresh();
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    setPwLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await updateMyPassword(teamSlug, formData);
    if (result.error) {
      setPwError(result.error);
      setPwLoading(false);
      return;
    }
    setPwSuccess(true);
    setPwLoading(false);
    form.reset();
  };

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError('');
    setEmailPending(null);
    setEmailLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await requestEmailChange(teamSlug, formData);
    if (result.error) {
      setEmailError(result.error);
      setEmailLoading(false);
      return;
    }
    setEmailPending(result.pendingEmail || null);
    setEmailLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-bold text-text-primary mb-1">名前</h2>
        <p className="text-xs text-text-secondary mb-4">
          ダッシュボードやトレーナーへの表示に使われます
        </p>
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <Input
            type="text"
            name="name"
            label="表示名"
            defaultValue={currentName}
            required
            disabled={nameLoading}
            maxLength={100}
          />
          {nameError && <div className="text-error text-sm">{nameError}</div>}
          {nameSuccess && (
            <div className="text-success text-sm">名前を更新しました</div>
          )}
          <Button type="submit" variant="primary" disabled={nameLoading}>
            {nameLoading ? '更新中...' : '名前を更新'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-text-primary mb-1">
          メールアドレス
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          ログインや通知に使われます
        </p>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <Input
            type="email"
            name="email"
            label="メールアドレス"
            defaultValue={currentEmail}
            required
            disabled={emailLoading}
          />
          <p className="text-xs text-text-secondary leading-relaxed">
            ※ 変更すると新しいメールアドレスに確認メールが届きます。リンクをクリックすると変更が完了します。
          </p>
          {emailError && <div className="text-error text-sm">{emailError}</div>}
          {emailPending && (
            <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg p-3">
              {emailPending} に確認メールを送信しました。
              <br />
              受信トレイをご確認の上、リンクをクリックして変更を完了してください。
            </div>
          )}
          <Button type="submit" variant="primary" disabled={emailLoading}>
            {emailLoading ? '送信中...' : '確認メールを送信'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-text-primary mb-1">
          パスワードの変更
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          新しいパスワードを設定します
        </p>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            type="password"
            name="password"
            label="新しいパスワード"
            minLength={8}
            required
            disabled={pwLoading}
            autoComplete="new-password"
            placeholder="8文字以上"
          />
          <Input
            type="password"
            name="confirm"
            label="新しいパスワード（確認）"
            minLength={8}
            required
            disabled={pwLoading}
            autoComplete="new-password"
            placeholder="もう一度入力"
          />
          {pwError && <div className="text-error text-sm">{pwError}</div>}
          {pwSuccess && (
            <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg p-3">
              パスワードを変更しました
            </div>
          )}
          <Button type="submit" variant="primary" disabled={pwLoading}>
            {pwLoading ? '更新中...' : 'パスワードを変更'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-text-primary mb-4">
          アカウント情報
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-secondary">このチームでの役割</dt>
            <dd className="text-text-primary font-medium">{roleLabel}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
