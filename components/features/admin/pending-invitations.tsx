'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  listTeamInvitations,
  revokeInvitation,
  type PendingInvitation,
} from '@/lib/actions/invitations';
import { useCurrentTeam } from '@/lib/context/current-team-client';
import { formatDateTime } from '@/lib/utils/helpers';

const roleLabels: Record<'admin' | 'trainer' | 'trainee', string> = {
  admin: '管理者',
  trainer: 'トレーナー',
  trainee: 'トレーニー',
};

/**
 * チームの未受諾招待一覧。
 * 既存 auth.users のメール宛は「メール未送信の可能性」バッジ + 招待URLコピーで救済する。
 * 関連: docs/team-plan-bugs.md (BUG-001 / BUG-002 / BUG-003)
 */
export function PendingInvitations() {
  const { slug } = useCurrentTeam();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await listTeamInvitations(slug);
    setInvitations(data);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async (inv: PendingInvitation) => {
    try {
      await navigator.clipboard.writeText(inv.acceptUrl);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId((cur) => (cur === inv.id ? null : cur)), 2000);
    } catch {
      // clipboard API が使えない環境では prompt にフォールバック
      window.prompt('この招待URLをコピーしてください', inv.acceptUrl);
    }
  };

  const handleRevoke = async (inv: PendingInvitation) => {
    if (!confirm(`${inv.email} の招待を取り消しますか？`)) return;
    setRevokingId(inv.id);
    const res = await revokeInvitation(inv.id);
    setRevokingId(null);
    if (res.error) {
      alert(res.error);
      return;
    }
    await load();
  };

  return (
    <Card className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">
          招待中 {invitations.length > 0 && `(${invitations.length})`}
        </h2>
        {!loading && invitations.length > 0 && (
          <button
            type="button"
            onClick={load}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            更新
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-text-secondary text-center py-4">読み込み中...</p>
      ) : invitations.length === 0 ? (
        <p className="text-text-secondary text-center py-4">
          未受諾の招待はありません
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メールアドレス</TableHead>
              <TableHead className="w-24">ロール</TableHead>
              <TableHead className="w-44">状態</TableHead>
              <TableHead className="w-40">招待日</TableHead>
              <TableHead className="w-40">有効期限</TableHead>
              <TableHead className="w-48">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="break-all">{inv.email}</TableCell>
                <TableCell>{roleLabels[inv.role]}</TableCell>
                <TableCell>
                  {inv.isExistingAuthUser ? (
                    <span
                      className="inline-block px-2 py-0.5 text-xs rounded bg-warning/15 text-warning"
                      title="既に登録済みのメールアドレスのため、招待メールが届かない可能性があります。下の「URLをコピー」から招待URLを手動で共有してください。"
                    >
                      既存ユーザー
                      <br />
                      （メール未送信の可能性）
                    </span>
                  ) : (
                    <span className="text-xs text-text-secondary">
                      メール送信済み
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-text-secondary text-sm">
                  {formatDateTime(inv.invitedAt)}
                </TableCell>
                <TableCell className="text-text-secondary text-sm">
                  {formatDateTime(inv.expiresAt)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(inv)}
                      className="text-xs text-primary hover:underline"
                    >
                      {copiedId === inv.id ? 'コピー済み' : 'URLをコピー'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(inv)}
                      disabled={revokingId === inv.id}
                      className="text-xs text-error hover:underline disabled:opacity-50"
                    >
                      {revokingId === inv.id ? '取消中...' : '取消'}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
