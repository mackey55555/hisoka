'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';

export default function SetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login';
        return;
      }
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirm = formData.get('confirm') as string;

    if (password !== confirm) {
      setError('パスワードが一致しません');
      return;
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError('パスワードの設定に失敗しました: ' + updateError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  };

  if (checkingSession) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4">
          <p className="text-text-secondary">読み込み中...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-text-primary mb-4 text-center">
            パスワード設定
          </h1>
          <p className="text-text-secondary text-sm mb-8 text-center">
            招待されたアカウントのパスワードを設定してください。
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="password"
              name="password"
              label="新しいパスワード（8文字以上）"
              required
              minLength={8}
              disabled={loading}
            />
            <Input
              type="password"
              name="confirm"
              label="パスワード（確認）"
              required
              minLength={8}
              disabled={loading}
            />
            {error && <div className="text-error text-sm">{error}</div>}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? '設定中...' : 'パスワードを設定'}
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
