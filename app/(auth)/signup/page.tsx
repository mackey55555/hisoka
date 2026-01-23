'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/header';
import { signUp } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // 1. サーバーアクションでユーザーを作成
    const result = await signUp(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // 2. クライアントサイドでログインしてセッションを確立
    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError('ログインに失敗しました。' + signInError.message);
      setLoading(false);
      return;
    }

    // セッションを確実に確立するために、完全なページリロードを行う
    window.location.href = '/dashboard';
  };

  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-text-primary mb-8 text-center">
            新規登録
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              name="name"
              label="お名前"
              required
              disabled={loading}
            />
            <Input
              type="email"
              name="email"
              label="メールアドレス"
              required
              disabled={loading}
            />
            <Input
              type="password"
              name="password"
              label="パスワード（8文字以上）"
              required
              minLength={8}
              disabled={loading}
            />
            {error && (
              <div className="text-error text-sm">{error}</div>
            )}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? '登録中...' : '登録'}
            </Button>
          </form>
          <p className="mt-6 text-center text-text-secondary text-sm">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-primary hover:underline">
              ログイン
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

