'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { syncMyEmailFromAuth } from '@/lib/actions/me';

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
    const type = hashParams.get('type');
    const needsPasswordSet = type === 'invite' || type === 'recovery';

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const queryType = searchParams.get('type');
    const recoveryOrInvite = queryType === 'recovery' || queryType === 'invite';
    const defaultNext =
      needsPasswordSet || recoveryOrInvite ? '/auth/set-password' : '/';
    const next = searchParams.get('next') || defaultNext;

    (async () => {
      const isEmailFlow = queryType === 'email_change' || queryType === 'email';
      if (!isEmailFlow) {
        // 招待・パスワードリセット等のフローでは、別ユーザーのセッションが残っていると
        // 新ユーザー処理に紛れ込むため先に破棄する。
        // メール変更フローでは既存セッションを保持しないと verifyOtp が失敗するのでスキップ。
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }

      // verifyOtp Flow: ?token_hash= で検証（メールテンプレで明示的に組む形式）
      if (tokenHash && queryType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: queryType as
            | 'recovery'
            | 'invite'
            | 'email'
            | 'magiclink'
            | 'signup'
            | 'email_change',
        });
        if (!error && (queryType === 'email_change' || queryType === 'email')) {
          await syncMyEmailFromAuth().catch(() => {});
        }
        window.location.href = error ? '/login' : next;
        return;
      }

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
