'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { acceptInvitation } from '@/lib/actions/invitations';

export function AcceptForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    const res = await acceptInvitation(token);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    if (res.success && res.teamSlug) {
      const dashboardUrl = `/t/${res.teamSlug}/dashboard`;
      if (res.needsPasswordSetup) {
        window.location.href = `/auth/set-password?next=${encodeURIComponent(dashboardUrl)}`;
      } else {
        window.location.href = dashboardUrl;
      }
      return;
    }
    setError('予期しないエラーが発生しました');
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-error text-sm">{error}</p>}
      <Button onClick={handleAccept} disabled={loading} variant="primary" className="w-full">
        {loading ? '受諾中...' : '招待を受諾する'}
      </Button>
    </div>
  );
}
