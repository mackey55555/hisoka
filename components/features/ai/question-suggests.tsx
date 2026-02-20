import { Card } from '@/components/ui/card';
import type { AiQuestionSuggest, QuestionCategory } from '@/types';

interface QuestionSuggestsProps {
  questions: AiQuestionSuggest[];
}

const CATEGORY_STYLES: Record<QuestionCategory, { label: string; className: string }> = {
  growth: { label: '成長', className: 'bg-success/10 text-success' },
  challenge: { label: '課題', className: 'bg-warning/10 text-warning' },
  strength: { label: '強み', className: 'bg-primary/10 text-primary' },
  emotion: { label: '感情', className: 'bg-primary-light/10 text-primary-light' },
  next_step: { label: '次のステップ', className: 'bg-accent/10 text-accent' },
};

export function QuestionSuggests({ questions }: QuestionSuggestsProps) {
  if (questions.length === 0) return null;

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-text-primary mb-4">
        質問サジェスト
      </h3>
      <div className="space-y-4">
        {questions.map((q, i) => {
          const style = CATEGORY_STYLES[q.category];
          return (
            <div key={q.id} className="p-4 rounded-lg bg-background">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center font-medium">
                  {q.priority}
                </span>
                <div className="flex-1">
                  <p className="text-text-primary mb-2">{q.question}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.className}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-text-secondary">{q.intent}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
