import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        管理画面
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <h2 className="text-xl font-bold text-text-primary mb-2">
              ユーザー管理
            </h2>
            <p className="text-text-secondary">
              ユーザーの一覧表示・新規作成
            </p>
          </Card>
        </Link>
        <Link href="/admin/trainers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <h2 className="text-xl font-bold text-text-primary mb-2">
              トレーナー管理
            </h2>
            <p className="text-text-secondary">
              トレーナー一覧とトレーニー紐付け管理
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

