'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateTeamStatus } from '@/lib/actions/super-admin';

interface Props {
  teamId: string;
  status: 'active' | 'suspended' | 'cancelled' | string;
}

export function TeamStatusToggle({ teamId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const change = async (next: 'active' | 'suspended' | 'cancelled') => {
    if (!confirm(`ステータスを「${next}」に変更しますか？`)) return;
    setLoading(true);
    try {
      await updateTeamStatus(teamId, next);
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <span className="text-xs text-text-secondary">現在: {status}</span>
      <div className="flex gap-2">
        {status !== 'active' && (
          <Button
            variant="secondary"
            className="text-xs px-3 py-1"
            disabled={loading}
            onClick={() => change('active')}
          >
            有効化
          </Button>
        )}
        {status !== 'suspended' && (
          <Button
            variant="secondary"
            className="text-xs px-3 py-1"
            disabled={loading}
            onClick={() => change('suspended')}
          >
            停止
          </Button>
        )}
        {status !== 'cancelled' && (
          <Button
            variant="secondary"
            className="text-xs px-3 py-1 text-error"
            disabled={loading}
            onClick={() => change('cancelled')}
          >
            解約
          </Button>
        )}
      </div>
    </div>
  );
}
