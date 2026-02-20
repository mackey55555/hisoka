import { Card } from '@/components/ui/card';

interface SummaryCardProps {
  summary: string;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-text-primary mb-3">
        今月の要約
      </h3>
      <p className="text-text-primary leading-relaxed whitespace-pre-wrap">
        {summary}
      </p>
    </Card>
  );
}
