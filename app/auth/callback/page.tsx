'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Supabase 招待メール / マジックリンクから戻ってくるコールバックページ。
// 既存セッション(別ユーザーでログイン済みなど)があっても、
// ハッシュ/コードから取得したトークンで明示的にセッションを差し替える。
export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient();

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const isInvite = hashParams.get('type') === 'invite';

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const defaultNext = isInvite ? '/auth/set-password' : '/dashboard';
    const next = searchParams.get('next') || defaultNext;

    (async () => {
      // 既存の管理者セッション等が残っていると新ユーザー処理に紛れ込むため、先に破棄する
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});

      // PKCE Flow: ?code= で交換
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        window.location.href = error ? '/login' : next;
        return;
      }

      // Implicit Flow: ハッシュ内の access_token / refresh_token でセッションを明示確立
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.location.href = error ? '/login' : next;
        return;
      }

      // どちらの認証情報も見つからない場合はログインへ戻す
      window.location.href = '/login';
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <p className="text-text-secondary">認証処理中...</p>
    </main>
  );
}
