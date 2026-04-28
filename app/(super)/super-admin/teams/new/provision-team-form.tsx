'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { provisionTeam } from '@/lib/actions/super-admin';

export function ProvisionTeamForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<'free' | 'starter' | 'pro'>('free');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  const autoSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await provisionTeam({
      name,
      slug: slug || autoSlug(name),
      plan,
      adminEmail,
      adminName,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    router.push(`/super-admin/teams/${res.teamId}`);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="チーム名"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(autoSlug(e.target.value));
          }}
          required
          disabled={loading}
        />
        <Input
          type="text"
          label="slug (URLに使う、a-z 0-9 ハイフンのみ)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          disabled={loading}
          placeholder="例: acme-corp"
        />
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            プラン
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as any)}
            disabled={loading}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg"
          >
            <option value="free">free</option>
            <option value="starter">starter</option>
            <option value="pro">pro</option>
          </select>
        </div>
        <Input
          type="email"
          label="初代 admin のメールアドレス"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          required
          disabled={loading}
        />
        <Input
          type="text"
          label="初代 admin の氏名"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          required
          disabled={loading}
        />

        {error && <div className="text-error text-sm">{error}</div>}

        <div className="flex gap-4">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? '発行中...' : '発行 + 招待送信'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Card>
  );
}
