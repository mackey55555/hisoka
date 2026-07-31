import { ProvisionTeamForm } from './provision-team-form';

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; email?: string; name?: string; plan?: string }>;
}) {
  const sp = await searchParams;
  const initialPlan = sp.plan === 'starter' || sp.plan === 'pro' ? sp.plan : 'free';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        新規テナント発行
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        チームを作成し、初代 admin に招待メールを送信します。発行後、招待URL（アカウント作成URL）が表示されます。
      </p>
      <ProvisionTeamForm
        initialName={sp.company ?? ''}
        initialAdminEmail={sp.email ?? ''}
        initialAdminName={sp.name ?? ''}
        initialPlan={initialPlan}
      />
    </div>
  );
}
