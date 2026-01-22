'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export const Header = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isAuthPage = pathname?.includes('/login') || pathname === '/';

  if (isAuthPage) {
    return (
      <header className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            Hisoka
          </Link>
          <Link href="/login">
            <Button variant="primary">ログイン</Button>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Hisoka
        </Link>
        <Button variant="ghost" onClick={handleLogout}>
          ログアウト
        </Button>
      </div>
    </header>
  );
};

