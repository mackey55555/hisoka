import { Card } from '@/components/ui/card';

export default function TrainerTraineeLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 mt-4">
        <div className="h-4 w-48 bg-background rounded animate-pulse" />
      </div>

      {/* プロフィールヘッダ */}
      <div className="bg-surface border border-border rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-background animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="h-7 w-40 bg-background rounded animate-pulse mb-2" />
            <div className="h-4 w-56 bg-background rounded animate-pulse" />
          </div>
        </div>
        <div className="pt-4 border-t border-border flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-20 bg-background rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* フィルタチップ */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-background rounded-full animate-pulse" />
        ))}
      </div>

      {/* 目標一覧 */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 mt-1.5 bg-background rounded animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-3/4 bg-background rounded animate-pulse mb-2" />
                <div className="h-3 w-1/2 bg-background rounded animate-pulse" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
