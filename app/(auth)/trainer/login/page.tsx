'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';

export default function TrainerLoginPage() {
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
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !user) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      setLoading(false);
      return;
    }

    // ユーザーのロールを確認
    const { data: userRow } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .single();

    const userRowTyped = userRow as { role_id: string } | null;
    const { data: roleRow } = userRowTyped
      ? await supabase.from('roles').select('name').eq('id', userRowTyped.role_id).single()
      : { data: null };

    const roleRowTyped = roleRow as { name: string } | null;
    if (!userRow || roleRowTyped?.name !== 'trainer') {
      setError('トレーナーアカウントでログインしてください。');
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    router.push('/trainer/dashboard');
    router.refresh();
  };

  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-text-primary mb-8 text-center">
            トレーナーログイン
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
        </div>
      </main>
    </>
  );
}

