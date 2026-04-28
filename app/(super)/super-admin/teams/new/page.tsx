import { ProvisionTeamForm } from './provision-team-form';

export default function NewTeamPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        新規テナント発行
      </h1>
      <p className="text-text-secondary text-sm mb-6">
        チームを作成し、初代 admin に招待メールを送信します。
      </p>
      <ProvisionTeamForm />
    </div>
  );
}
