import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/helpers';
import type { AiDiagnosis, Reflection } from '@/types';

interface Props {
  diagnosis: AiDiagnosis | null;
  pastReflection: Reflection | null;
}

function summaryExcerpt(summary: string): string {
  const trimmed = summary.trim();
  const firstSentence = trimmed.match(/^[^。！？\.\!\?]+[。！？\.\!\?]/)?.[0];
  if (firstSentence && firstSentence.length <= 90) return firstSentence;
  if (trimmed.length <= 120) return trimmed;
  return trimmed.slice(0, 120) + '…';
}

function reflectionExcerpt(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 80) return trimmed;
  return trimmed.slice(0, 80) + '…';
}

export function MorningCard({ diagnosis, pastReflection }: Props) {
  if (!diagnosis && !pastReflection) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      {diagnosis && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">
              AI
            </span>
            <h3 className="text-base font-bold text-text-primary">
              今朝のあなたへ
            </h3>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">
            {summaryExcerpt(diagnosis.summary)}
          </p>
        </Card>
      )}

      {pastReflection && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-base font-bold text-text-primary">
              過去のあなたから
            </h3>
            <span className="ml-auto text-xs text-text-secondary">
              {formatDate(pastReflection.created_at)}
            </span>
          </div>
          <p className="text-sm text-text-primary leading-relaxed italic">
            「{reflectionExcerpt(pastReflection.content)}」
          </p>
        </Card>
      )}
    </div>
  );
}
