'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
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
    
    // 新規登録
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      setError('登録に失敗しました。' + authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError('ユーザー作成に失敗しました');
      setLoading(false);
      return;
    }

    // ロールを取得（trainee）
    const { data: roles } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'trainee')
      .single();

    if (!roles) {
      setError('ロールの取得に失敗しました');
      setLoading(false);
      return;
    }

    // usersテーブルに追加
    const rolesTyped = roles as { id: string };
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: normalizedEmail,
          name,
          role_id: rolesTyped.id,
        },
      ] as any);

    if (userError) {
      setError('ユーザー情報の登録に失敗しました');
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
              label="お名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
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
              label="パスワード（8文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

