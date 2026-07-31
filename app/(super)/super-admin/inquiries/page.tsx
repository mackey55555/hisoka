import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listPlanInquiries } from '@/lib/actions/super-admin';
import { formatDateTime } from '@/lib/utils/helpers';
import { InquiryStatusButtons } from './status-buttons';

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'それ以上（お問い合わせ）',
};

// provisionTeam に渡せるプラン（enterprise は実プランでないので除外）
const isProvisionable = (p: string) => p === 'free' || p === 'starter' || p === 'pro';

export default async function InquiriesPage() {
  const inquiries = await listPlanInquiries();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">申し込み一覧</h1>
        <Link href="/super-admin" className="text-sm text-primary hover:underline">
          ← テナント一覧
        </Link>
      </div>

      {inquiries.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-center py-8">申し込みはまだありません</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {inquiries.map((q) => {
            const params = new URLSearchParams({
              company: q.company,
              email: q.email,
              name: q.contact_name,
            });
            if (isProvisionable(q.plan)) params.set('plan', q.plan);
            const provisionHref = `/super-admin/teams/new?${params.toString()}`;

            return (
              <Card key={q.id} className={q.status === 'closed' ? 'opacity-60' : ''}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-text-primary">{q.company}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {PLAN_LABEL[q.plan] ?? q.plan}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {q.contact_name} ／ {q.email}
                      {q.phone ? ` ／ ${q.phone}` : ''}
                      {q.member_count != null ? ` ／ 想定${q.member_count}名` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-text-secondary whitespace-nowrap">
                    {formatDateTime(q.created_at)}
                  </span>
                </div>

                {q.message && (
                  <p className="mt-3 text-sm text-text-primary whitespace-pre-wrap bg-background rounded-lg p-3">
                    {q.message}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <InquiryStatusButtons id={q.id} current={q.status} />
                  <Link href={provisionHref}>
                    <Button variant="primary" className="text-sm px-4 py-2">
                      この申し込みからテナント発行
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
