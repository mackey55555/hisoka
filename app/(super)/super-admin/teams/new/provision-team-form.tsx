'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { provisionTeam } from '@/lib/actions/super-admin';

interface ProvisionTeamFormProps {
  initialName?: string;
  initialAdminEmail?: string;
  initialAdminName?: string;
  initialPlan?: 'free' | 'starter' | 'pro';
}

export function ProvisionTeamForm({
  initialName = '',
  initialAdminEmail = '',
  initialAdminName = '',
  initialPlan = 'free',
}: ProvisionTeamFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const autoSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const [slug, setSlug] = useState(initialName ? autoSlug(initialName) : '');
  const [plan, setPlan] = useState<'free' | 'starter' | 'pro'>(initialPlan);
  const [adminEmail, setAdminEmail] = useState(initialAdminEmail);
  const [adminName, setAdminName] = useState(initialAdminName);

  // 発行成功後の結果（招待URL）
  const [done, setDone] = useState<{ teamId: string; invitationUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone({ teamId: res.teamId!, invitationUrl: res.invitationUrl });
  };

  const copy = async () => {
    if (!done?.invitationUrl) return;
    try {
      await navigator.clipboard.writeText(done.invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  // 発行完了: 招待URL（アカウント作成URL）を表示
  if (done) {
    return (
      <Card>
        <h2 className="text-lg font-bold text-primary mb-2">テナントを発行しました</h2>
        <p className="text-sm text-text-secondary mb-4">
          初代 admin（{adminEmail}）に招待メールを自動送信しました。
          下の「招待URL（アカウント作成URL）」を、必要に応じてメール返信で共有できます。
        </p>

        {done.invitationUrl && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              招待URL（アカウント作成URL）
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={done.invitationUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg"
              />
              <Button type="button" variant="secondary" onClick={copy} className="text-sm px-4 whitespace-nowrap">
                {copied ? 'コピー済み' : 'コピー'}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-text-secondary">
              このURLからパスワードを設定するとアカウントが作成されます。
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Link href={`/super-admin/teams/${done.teamId}`}>
            <Button variant="primary">テナント詳細へ</Button>
          </Link>
          <Link href="/super-admin/inquiries">
            <Button variant="secondary">申し込み一覧へ戻る</Button>
          </Link>
        </div>
      </Card>
    );
  }

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
          <Link href="/super-admin">
            <Button type="button" variant="secondary" disabled={loading}>
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}
