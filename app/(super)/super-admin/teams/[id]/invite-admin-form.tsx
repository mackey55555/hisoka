'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inviteAdditionalAdmin } from '@/lib/actions/super-admin';

export function InviteAdminForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const res = await inviteAdditionalAdmin(teamId, { email, name });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setInfo(
      res.invitationUrl ? `招待を送信しました。URL: ${res.invitationUrl}` : '招待を送信しました'
    );
    setEmail('');
    setName('');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="email"
        label="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
      />
      <Input
        type="text"
        label="氏名"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={loading}
      />
      {error && <div className="text-error text-sm">{error}</div>}
      {info && <div className="text-success text-sm whitespace-pre-wrap">{info}</div>}
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? '送信中...' : '招待を送信'}
      </Button>
    </form>
  );
}
