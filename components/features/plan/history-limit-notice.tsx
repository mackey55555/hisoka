import Link from 'next/link';
import { Card } from '@/components/ui/card';

interface HistoryLimitNoticeProps {
  teamSlug: string;
  /** diagnosis: AI診断(当月+前月) / content: コンテンツ(当月のみ) */
  kind: 'diagnosis' | 'content';
}

/**
 * Free プランの閲覧制限に達したときのアップグレード誘導。
 * データは消えておらず、上位プランで再表示できることを伝える。
 */
export function HistoryLimitNotice({ teamSlug, kind }: HistoryLimitNoticeProps) {
  const message =
    kind === 'diagnosis'
      ? '現在のプランでは、AI診断は「当月・前月」まで表示されます。'
      : '現在のプランでは、活動・振り返りは「当月分」のみ表示されます。';

  return (
    <Card className="text-center py-10">
      <p className="text-base text-text-primary">{message}</p>
      <p className="mt-1 text-sm text-text-secondary">
        これ以前のデータは <span className="font-medium">Starter プラン以上</span> でご覧いただけます（データは保持されています）。
      </p>
      <Link
        href={`/t/${teamSlug}/admin/billing`}
        className="inline-block mt-4 text-base text-primary font-medium hover:underline"
      >
        プランを見る →
      </Link>
    </Card>
  );
}
