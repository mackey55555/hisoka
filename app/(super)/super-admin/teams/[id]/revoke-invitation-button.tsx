'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { revokeInvitation } from '@/lib/actions/invitations';

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirm('この招待を取り消しますか？')) return;
    setLoading(true);
    const res = await revokeInvitation(invitationId);
    setLoading(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-error hover:underline disabled:opacity-50"
    >
      取消
    </button>
  );
}
