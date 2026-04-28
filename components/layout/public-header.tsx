import Link from 'next/link';
import { Button } from '../ui/button';

/**
 * 認証前ページ（/login, /auth/set-password など）用のシンプルなヘッダー。
 * Server / Client いずれの Page からも使える純粋な Server Component。
 */
export function PublicHeader({ showLogin = true }: { showLogin?: boolean }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          Hisoka
        </Link>
        {showLogin && (
          <Link href="/login">
            <Button variant="primary">ログイン</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
