import { Card } from '@/components/ui/card';

export default function GoalsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 mt-4">
        <div className="h-7 w-32 bg-background rounded animate-pulse" />
      </div>

      {/* 月次振り返りカード */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="h-5 w-48 bg-background rounded animate-pulse mb-1" />
            <div className="h-3 w-40 bg-background rounded animate-pulse" />
          </div>
          <div className="h-7 w-16 bg-background rounded animate-pulse" />
        </div>
        <div className="py-6 bg-background/60 rounded-lg" />
      </Card>

      {/* 目標カード */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <div className="h-5 w-3/4 bg-background rounded animate-pulse mb-3" />
            <div className="flex gap-3">
              <div className="h-3 w-32 bg-background rounded animate-pulse" />
              <div className="h-5 w-16 bg-background rounded animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
