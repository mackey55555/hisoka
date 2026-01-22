'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError('ログインに失敗しました。');
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
            ログイン
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Input
              type="password"
              label="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
          <p className="mt-6 text-center text-text-secondary text-sm">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-primary hover:underline">
              新規登録
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

