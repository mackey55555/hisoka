import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { getTeamDetail } from '@/lib/actions/super-admin';
import { formatDateTime } from '@/lib/utils/helpers';
import { TeamStatusToggle } from './team-status-toggle';
import { InviteAdminForm } from './invite-admin-form';
import { RevokeInvitationButton } from './revoke-invitation-button';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;

  let detail;
  try {
    detail = await getTeamDetail(id);
  } catch {
    notFound();
  }
  const { team, members, invitations } = detail;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4">
        <Link
          href="/super-admin"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← テナント一覧へ
        </Link>
      </div>

      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">{team.name}</h1>
            <p className="text-sm text-text-secondary">slug: {team.slug}</p>
            <p className="text-sm text-text-secondary">プラン: {team.plan} / 上限: {team.max_members}人</p>
            <p className="text-sm text-text-secondary">作成: {formatDateTime(team.created_at)}</p>
          </div>
          <TeamStatusToggle teamId={team.id} status={team.status} />
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">メンバー</h2>
        {members.length === 0 ? (
          <p className="text-text-secondary text-center py-4">メンバーがいません</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-medium">名前</th>
                <th className="px-3 py-2 font-medium">メール</th>
                <th className="px-3 py-2 font-medium">ロール</th>
                <th className="px-3 py-2 font-medium">ステータス</th>
                <th className="px-3 py-2 font-medium">参加日</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: any) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    {m.users?.name}
                    {m.users?.is_super_admin && (
                      <span className="ml-2 text-xs text-primary">[Super]</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{m.users?.email}</td>
                  <td className="px-3 py-2">{m.role}</td>
                  <td className="px-3 py-2">{m.status}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {formatDateTime(m.joined_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">招待中</h2>
        </div>
        {invitations.length === 0 ? (
          <p className="text-text-secondary text-center py-4">未受諾の招待はありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-medium">メール</th>
                <th className="px-3 py-2 font-medium">ロール</th>
                <th className="px-3 py-2 font-medium">期限</th>
                <th className="px-3 py-2 font-medium">作成</th>
                <th className="px-3 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv: any) => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{inv.email}</td>
                  <td className="px-3 py-2">{inv.role}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {formatDateTime(inv.expires_at)}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {formatDateTime(inv.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <RevokeInvitationButton invitationId={inv.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-text-primary mb-4">
          admin を追加で招待
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          通常 admin の追加は SuperAdmin のみが行います。
        </p>
        <InviteAdminForm teamId={team.id} />
      </Card>
    </div>
  );
}
