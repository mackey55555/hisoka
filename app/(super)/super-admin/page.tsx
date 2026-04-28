import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listTeams } from '@/lib/actions/super-admin';
import { formatDateTime } from '@/lib/utils/helpers';

export default async function SuperAdminTopPage() {
  const teams = await listTeams();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">テナント一覧</h1>
        <Link href="/super-admin/teams/new">
          <Button variant="primary">+ 新規テナント発行</Button>
        </Link>
      </div>

      {teams.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-center py-8">
            テナントがまだありません
          </p>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-medium">名前</th>
                <th className="px-3 py-2 font-medium">slug</th>
                <th className="px-3 py-2 font-medium">プラン</th>
                <th className="px-3 py-2 font-medium">メンバー数</th>
                <th className="px-3 py-2 font-medium">ステータス</th>
                <th className="px-3 py-2 font-medium">作成日</th>
                <th className="px-3 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{t.slug}</td>
                  <td className="px-3 py-2">{t.plan}</td>
                  <td className="px-3 py-2">{t.member_count}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {formatDateTime(t.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/super-admin/teams/${t.id}`}
                      className="text-primary hover:underline"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-success/20 text-success'
      : status === 'suspended'
      ? 'bg-warning/20 text-warning'
      : 'bg-error/20 text-error';
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{status}</span>;
}
